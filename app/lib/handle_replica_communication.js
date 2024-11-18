const { serverInfo } = require("../global_cache/server_info");
const { handleQuery } = require("./handle_query");
const { masterCommunicate } = require("./master_communicate");

let okCount = 0;
let hasReceivedRDB = false;

/**
 * Manages messages sent to replica.
 * @param {string} data - data received from master as response
 * @param {socket} connection - socket connection to master
 */
const handleReplicaCommunication = (data, connection) => {
  console.log("Received:", JSON.stringify(data));
  // Handshake ping response
  if (data === "+PONG\r\n") {
    // Send replconf command
    masterCommunicate("replconf", connection);
  } else if (data === "+OK\r\n") {
    okCount += 1;
    // ack of second replconf command
    if (okCount === 2) {
      masterCommunicate("psync", connection);
    }
  }
  // Hardcoding for now
  else if (data === "+OK\r\n+OK\r\n") {
    masterCommunicate("psync", connection);
  } else {
    parseReplicaQuery(data, connection);
  }
};

/**
 * Will loop through the string and create RESP commands to send to handle query
 * @param {string} data - data to parse
 * @param {socket} connection - socket connection
 */
const parseReplicaQuery = (data, connection) => {
  while (data) {
    // Skip the rdb file
    let i = getNextArray(data);
    const strCommand = data.substring(0, i);
    console.log("Command:", JSON.stringify(strCommand));

    //Ignore anything that does not start with *
    if (strCommand[0] === "*") handleQuery(strCommand, connection);

    data = data.substring(i);
    console.log("New data:", JSON.stringify(data));
  }
};

/**
 * Will find and return indext of starting of next array (*) according to RESP format
 * @param {string} data - string data to parse
 * @returns {int} - index of starting of next array in data
 */
const getNextArray = (data) => {
  let i = 0;
  if (data[i] === "*") i++;
  while (i < data.length) {
    if (data[i] === "*" && data[i + 1] !== "\r") break;
    i++;
  }
  return i;
};

module.exports = { handleReplicaCommunication };
