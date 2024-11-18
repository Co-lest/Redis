const { cache, expiry } = require("../global_cache/cache");
const { serverInfo } = require("../global_cache/server_info");

/**
 * To format string that needs to be returned
 * @param {array} args - Array of words to format
 * @returns {string} - Formated string with \r\n between each word to follow RESP
 */
const formatMessage = (args) => {
  const formatedArgs = [];

  // If args is empty send null buld string
  if (args.length === 0) return "$-1\r\n";

  // Add ${len} of word before each word according to RESP
  for (let i = 0; i < args.length; i++) {
    if (args[i][0] === "+" || args[i][0] === "*" || args[i][0] === ":") {
      formatedArgs.push(args[i]);
    } else if (args[i][0] != "$") {
      formatedArgs.push("$" + args[i].length.toString());
      formatedArgs.push(args[i]);
    } else {
      formatedArgs.push(args[i]);
      formatedArgs.push(args[i + 1]);
      i++;
    }
  }
  // To append the "\r\n" at end as join does not do it.
  // Dont add "\r\n" if it's rdbfile.
  return formatedArgs.join("\r\n") + "\r\n";
};

/**
 * To parse the incoming data to extract command and it's argument
 * @param {string} data - Message received from the client
 * @returns {nParams: string, comamnd: string, args: array of string}
 */
const parseData = (data) => {
  const [nParams, ...params] = data.split("\r\n");
  console.log("Params:", params);
  const command = params[1].toLowerCase();
  const args = [];
  for (let i = 2; i < params.length; i++) {
    if (params[i] === "" || params[i][0] === "$") continue; // To avoid adding $ as a parth of args as it's only length of next argument
    // Handle integer value ex. :100
    if (params[i][0] === ":") {
      args.push(params.substr(1));
      continue;
    }
    args.push(params[i]);
  }
  return { nParams, command, args };
};

/**
 * To send message back to client
 * @param {scoket} connection - Socket connection to client
 * @param {array} args - Array of string containing response
 * @param {bool} needFormat - (Optional) if true then format the string
 */
const sendMessage = (connection, args, needFormat = true) => {
  const formatedMessage = needFormat ? formatMessage(args) : args[0];
  console.log(`Sending message ${JSON.stringify(formatedMessage)} to client`);
  connection.write(formatedMessage, "utf8", () => {
    console.log(`Sent message ${JSON.stringify(formatedMessage)} to client`);
  });
};

/**
 * Sets role of the server in the serverInfo with necessary metadata
 * @param {string} role - Role of the server
 */
const setRole = (role) => {
  serverInfo["role"] = role;
  if (role === "master") {
    serverInfo["master"]["master_replid"] =
      "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
    serverInfo["master"]["master_repl_offset"] = "0";
  }
};

/**
 * Will increase the offset by no. of bytes of processed commands
 * @param {string} data - Original query that received by server to process
 */
const increaseOffset = (data) => {
  console.log("Increasing offset by:", data.length);
  serverInfo[serverInfo.role]["offset"] += data.length;
};

/** Checks if the key is expired by comparing unix timestamps of key and current time
 *	@param {string} key
 *	@param {int} timeStamp - Unix time timeStamp
 *	@returns {bool} - Whether the key has expired
 */
const hasExpired = (key) => {
  if (!(key in cache)) return true;

  if (key in expiry) {
    const keyTimeStamp = expiry[key];
    const currentDate = new Date();
    const currentTimeStamp = Math.floor(currentDate.getTime());

    if (keyTimeStamp <= currentTimeStamp) {
      deleteKey(key);
      return true;
    }
  }
  return false;
};

/**
 *	Deletes key in cache
 *	@param {string} key
 * */
const deleteKey = (key) => {
  if (key in cache) delete cache[key];
  if (key in expiry) delete expiry[key];
};

/**
 * Formats an array according to RESP standard.
 * @param {array} args argument array to format
 * @returns {array} formated array with args
 * */
const formatArray = (args) => {
  const response = [];
  response.push(`*${args.length}`);
  for (const arg of args) {
    if (Array.isArray(arg)) {
			response.push(...formatArray(arg))
    } else {
      response.push(arg);
    }
  }
  return response;
};

const sleep = async (delay) => {
	await new Promise(r => setTimeout(r, delay));
}

module.exports = {
  parseData,
  sendMessage,
  setRole,
  increaseOffset,
  deleteKey,
  hasExpired,
  formatArray,
	sleep,
};
