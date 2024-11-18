const { serverConf } = require("../global_cache/server_conf");
const { sendMessage } = require("./utils");

/**
 * Sends commands from replica to master
 * @param {string} command - Command to send to master
 * @param {socket} connection - socket connection to master
 */
const masterCommunicate = (command, connection) => {
  switch (command) {
    case "ping":
      console.log("Sending ping to master");
      sendMessage(connection, ["*1", "ping"]);
      break;
    case "replconf":
      console.log("Sending replconf to master");
      sendMessage(connection, [
        "*3",
        "REPLCONF",
        "listening-port",
        serverConf.port,
      ]);
      sendMessage(connection, ["*3", "REPLCONF", "capa", "psync2"]);
      break;
    case "psync":
      console.log("Sending psync to master");
      sendMessage(connection, ["*3", "PSYNC", "?", "-1"]);
  }
};

module.exports = { masterCommunicate };
