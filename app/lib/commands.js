const { cache, multi } = require("../global_cache/cache");
const { serverConf } = require("../global_cache/server_conf");
const { serverInfo } = require("../global_cache/server_info");
const { propagateToReplica } = require("./propagate");
const { sendMessage, deleteKey, hasExpired, formatArray } = require("./utils");
const {
	generateStreamSequence,
	validateStreamEntry,
	getStreamWithInRange,
	blockXread,
} = require("./command_helper");
const { handleQuery } = require("./handle_query");

/**
 * Generates response array for info command
 * will parse everything into an array which is stored in serverInfo
 *
 * @returns {array} - Response args
 */
const info = () => {
	const currentRole = serverInfo["role"];
	let res = `role:${currentRole}`;
	if (currentRole === "master") {
		const masterObj = serverInfo["master"];
		for (const [key, value] of Object.entries(masterObj)) {
			res += `\n${key}:${value}`;
		}
	}
	return [res];
};


/**
 * Ex. *2\r\n$4\r\nincr\r\n$3\r\nkey
 * args = ["$3", "key"]
 * key exists but doesn't have a numerical value return an error message to client
 * @param {args} args - Array of argument
 * @returns {Array} - Response arguments
 */
const incr = (args, connection) => {
	const key = args[0]
	const value = get([key]).length === 0 ? 1 : Number(get([key])[0]) + 1
	if (isNaN(value)) {
		sendMessage(connection, ["-ERR value is not an integer or out of range\r\n"], false)
		return
	}
	set([key, value.toString()]);
	sendMessage(connection, [`:${value}\r\n`], false)
}


/**
 * Executes all commands that are in queue after the multi command was given
 * @param {socket} connection - Socket connection
 * @returns {null}
 * */
const exec = (connection) => {
	if (multi["isMulti"] === false) {
		sendMessage(connection, ["-ERR EXEC without MULTI\r\n"], false)
	} else {
		if (multi["commandQueue"].length === 0) {
			sendMessage(connection, ["*0\r\n"], false)
		} else {
			for (let i = 0; i < cache["commandQueue"].length; i++) {
				handleQuery(cache["commandQueue"][i])
			}
		}
		multi["isMulti"] = false
		multi["commandQueue"] = []
	}
	return null
}
/**
 * Ex. *2\r\n$3\r\nset\r\n$3\r\nkey
 * args = ["$3", "key"]
 * @param {args} args - Array of argument
 * @param {socket} connection - Socket connection
 * @returns {Array} - Response arguments
 */
const get = (args) => {
	const key = args[0];
	if (hasExpired(key)) return [];
	else return [cache[key]];
}

/**
 *
 * Ex. *3\r\n$3\r\nset\r\n$3\r\nkey\r\n$5\r\nvalue\r\n
 * args = ["$3", "key", "$5", "value"]
 * Or with expiry with px command
 * Ex. *5\r\n$3\r\nset\r\n$3\r\nkey\r\n$5\r\nvalue\r\n$2\r\npx\r\n$3\r\n100\r\n
 * args = ["$3", "key", "$5", "value", "$2", "px", "$3", "100"]
 * @param {args} args - Array of argument
 * @returns {Array} - Response arguments
 */
const set = (args) => {
	key = args[0];
	value = args[1];
	cache[key] = value;
	console.log(`Setting ${key} to ${value}`);
	if (args.length === 4) {
		if (args[2] === "px") {
			const delay = parseInt(args[3]);
			setTimeout(() => {
				console.log(`Deleting key: ${key}`);
				deleteKey(key);
			}, delay);
		}
	}
	return ["+OK"];
};

// ignore for capa eof
// Ex. *3\r\n$8\r\nreplconf\r\n$14\r\nlistening-port\r\n$4\r\nxxxx\r\n
// args = ["listening-port", "xxxx"] etc.
/**
 * @param {array} args - Array of arguments
 * @param {socket} connection - Socket connection
 * @returns {array} - Response to send back
 * */
const replconf = (args, connection) => {
	let response;
	// Store the connection to replica in serverInfo.master
	if (args[0] === "listening-port") {
		serverInfo.master["replica_connection"].push(connection);
		serverInfo.master["replica_count"]++;
		response = ["+OK"];
	} else if (args[0] === "capa") {
		response = ["+OK"];
	} else if (args[0] === "GETACK") {
		// From replica to master
		response = ["*3", "REPLCONF", "ACK", `${serverInfo.slave["offset"]}`];
	} else if (args[0] === "ACK") {
		// Ack received from replica
		console.log("Ack received:");
		serverInfo.master.ack_received++;
		response = null;
	}
	return response;
};

/**
 * This command blocks the current client until all the previous write commands are
 * successfully transferred and acknowledged by at least the specified number of replicas.
 * If the timeout, specified in milliseconds, is reached, the command returns even if the specified number
 * of replicas were not yet reached.
 * Ex. *3\r\n$4\r\nWAIT\r\n$1\r\n1\r\n$3\r\n500\r\n
 * args: [1, 500]
 * @param {array} args - Array of argument
 * @param {socket} connection - Socket connection
 */
const wait = (args, connection) => {
	const noOfReplica = parseInt(args[0]);
	const delay = parseInt(args[1]);
	serverInfo.master.ack_received = 0;
	serverInfo.master.ack_needed = noOfReplica;
	serverInfo.master.reply_wait = false;
	if (serverInfo.master.propogated_commands === 0) {
		serverInfo.master.reply_wait = true;
		sendMessage(connection, [`:${serverInfo.master.replica_count}`]);
	} else {
		propagateToReplica("*3\r\n$8\r\nreplconf\r\n$6\r\nGETACK\r\n$1\r\n*\r\n");
	}
	setTimeout(() => {
		if (!serverInfo.master.reply_wait)
			sendMessage(connection, [`:${serverInfo.master.ack_received}`]);
	}, delay);
};

/**
 * Handles config command
 * Args: ["get", "dir"]
 * @param {array} args - Array of arguments
 * @returns array of response
 */
const config = (args) => {
	if (args[1] === "dir") {
		return ["*2", "dir", serverConf.rdb_dir];
	} else if (args[1] === "dbfilename") {
		return ["*2", "dbfilename", serverConf.rdb_file];
	}
};

/**
 * Adds stream object to cache
 * @param {array} args Array of argument
 * @param {socket} connection socket connection
 * @returns {array} array of response containing id of streamKey object
 * */
const xadd = (args, connection) => {
	const streamKey = args[0];
	let id = args[1];

	// Generate id
	if (id === "*") id = Date.now().toString() + "-*";

	if (!(streamKey in cache)) cache[streamKey] = {};
	id = generateStreamSequence(streamKey, id);

	console.log("Generated id:", id);

	const response = validateStreamEntry(streamKey, id);
	if (response !== "valid") {
		sendMessage(connection, [response], false);
		return;
	}

	if (!(id in cache[streamKey])) cache[streamKey][id] = {};

	for (let i = 2; i < args.length; i += 2) {
		const key = args[i];
		const value = args[i + 1];
		cache[streamKey][id] = { ...cache[streamKey][id], [key]: value };
	}

	cache[streamKey]["lastAddedId"] = id;

	if (serverInfo.xreadWaiting === true) serverInfo.xreadWaiting = false;

	sendMessage(connection, [id]);
};

/**
 * Returns type of a key
 * @param {string} key
 * @return {array} array containing type of key.
 * */
const checkType = (key) => {
	if (hasExpired(key)) return ["+none"];
	else {
		if (typeof cache[key] === "string") return ["+string"];
		else return ["+stream"];
	}
};

/**
 * The XRANGE command retrieves a range of entries from a stream.
 * @param {array} args Array of argument containing range.
 * @returns {array} Response
 * */
const xrange = (args) => {
	const streamKey = args[0];
	let range1 = args[1];
	let range2 = args[2];

	if (range1 === "-") range1 = "0";
	if (range2 === "+") range2 = "99999999999999999999-9";

	if (range1.indexOf("-") === -1) range1 += "-0";
	if (range2.indexOf("-") === -1) range2 += "-0";
	console.log("range1:", range1, "range2", range2);

	const entries = getStreamWithInRange("xrange", streamKey, range1, range2);
	console.log("Entries for xrange:", entries);
	// console.log("Extries for xrang:", entries, entries.length);
	// console.log("Formated array:", formatArray(entries));
	// if (command === "xread")
	//   console.log("xread:", ["*1", "*2", streamKey, ...formatArray(entries)]);

	return formatArray(entries);
};

/**
 * XREAD allow querying multiple streams.
 * args = [(opt) block, (opt)1000, streams, stream-x, id-1.....]
 * @param {array} args
 * @returns {Promise<array>} Response containing all the streamKeys with values given in the query
 * */
const xread = async (args) => {
	// Block the call if --block argument is passed.
	if (args[0] === "block") {
		const delay = parseInt(args[1]);
		await blockXread(delay);
		args.shift();
		args.shift();
	}
	args.shift();
	const halfWay = args.length / 2;
	const entries = [];

	for (let i = 0; i < halfWay; i++) {
		const streamKey = args[i];
		let res = [];
		let range = args[i + halfWay];
		// $ does not get parsed.
		if (range === undefined) range = "$"

		if (range === "$") {
			// If range is $ we want to get only newly added entry. Use xrange
			// as it will have inclusive range.
			res = getStreamWithInRange(
				"xrange",
				streamKey,
				cache[streamKey]["lastAddedId"],
			);
		} else {
			if (range.indexOf("-") === -1) range += "-0";
			res = getStreamWithInRange("xread", streamKey, range);
		}
		if (res.length > 0) entries.push([streamKey, res]);
	}
	console.log("Entries for xread:", entries);
	return entries.length > 0 ? formatArray(entries) : [];
};

module.exports = {
	info,
	set,
	replconf,
	wait,
	config,
	xadd,
	checkType,
	xrange,
	xread,
	get,
	incr,
	exec
};
