const net = require("net");
const fs = require("fs");
const { join } = require("path");
const { getKeysValues, getFullData } = require("./parsedb");

const arguments = process.argv.slice(2);

const dataStore = new Map();
const expiryList = new Map();
const config = new Map();

let rdb;

for (let i = 0; i < arguments.length; i++) {
  const arg = arguments[i];
  if (arg.startsWith("--")) {
    config.set(arg.slice(2), arguments[i + 1]);
    i += 1;
  }
}

if (config.get("dir") && config.get("dbfilename")) {
  const dbPath = join(config.get("dir"), config.get("dbfilename"));
  const isDbExists = fs.existsSync(dbPath);

  if (isDbExists) {
    rdb = fs.readFileSync(dbPath);
    if (!rdb) {
      console.error(`Error reading DB at provided path: ${dbPath}`);
    } else {
      const [redisKey, redisValue] = getKeysValues(rdb);
      dataStore.set(redisKey, redisValue);
      console.log("rdb", redisKey, redisValue);
    }
  } else {
    console.error(`DB doesn't exists at provided path: ${dbPath}`);
  }
}

console.log("Logs from your program will appear here!");

const serializeRESP = (obj) => {
  let resp = "";
  switch (typeof obj) {
    case "object":
      if (Array.isArray(obj)) {
        const arrLen = obj.length;
        resp += `*${arrLen}\r\n`;
        for (let i = 0; i < arrLen; i++) {
          resp += serializeRESP(obj[i]);
        }
      }
      return resp;
    case "string":
      const strLen = obj.length;
      resp += `$${strLen}\r\n`;
      resp += `${obj}\r\n`;
      return resp;
    default:
      return `$-1\r\n`;
  }
};

const parseRESP = (arrRESP) => {
  for (let i = 0; i < arrRESP.length; i++) {
    const element = arrRESP.shift();
    switch (element[0]) {
      case "*":
        const arrlen = parseInt(element.slice(1));
        const arr = [];
        for (let j = 0; j < arrlen; j++) {
          const parsedContent = parseRESP(arrRESP);
          arr.push(parsedContent.content);
          arrRESP = parsedContent.arrRESP;
        }
        return arr;
      case "$":
        const str = arrRESP.shift();
        return { content: str, arrRESP };
      case ":":
        const integer = parseInt(element.slice(1));
        return { content: integer, arrRESP };
      default:
        break;
    }
  }
};

const parseRequest = (arrRequest) => {
  const splitedRequest = arrRequest.split("\r\n");
  const parsedRESP = parseRESP(splitedRequest);
  const command = parsedRESP.shift();

  switch (command.toUpperCase()) {
    case "CONFIG":
      const scndPart = parsedRESP.shift();
      if (scndPart) {
        return {
          commandName: `${command.toUpperCase()} ${scndPart.toUpperCase()}`,
          args: parsedRESP,
        };
      }
      return {
        commandName: command.toUpperCase(),
      };
    default:
      return {
        commandName: command.toUpperCase(),
        args: parsedRESP,
      };
  }
};

const sendPongResponse = (connection) => {
  connection.write("+PONG\r\n");
};

const sendEchoResponse = (connection, content) => {
  connection.write(`+${content}\r\n`);
};

const handleSetRequest = (connection, key, value, px) => {
  dataStore.set(key, value);
  if (px) {
    expiryList.set(key, Date.now() + Number(px));
  }
  connection.write("+OK\r\n");
};

const handleGetRequest = (connection, key) => {
  const element = dataStore.get(key);
  if (!element) {
    connection.write(`$-1\r\n`);
    return;
  }
  const expiry = expiryList.get(key);
  if (expiry && expiry <= Date.now()) {
    dataStore.delete(key);
    expiryList.delete(key);
    connection.write(`$-1\r\n`);
  } else {
    connection.write(`+${element}\r\n`);
  }
};

const handleConfigGetRequest = (connection, key) => {
  const value = config.get(key);
  connection.write(serializeRESP([key, value]));
};

const handleKeysRequest = (connection, pattern) => {
  if (pattern === "*") {
    try {
      const keys = [];
      let cursor = 0;

      // Extract all keys iteratively
      while (cursor < rdb.length) {
        try {
          const [key, value] = getKeysValues(rdb.slice(cursor));
          keys.push(key); // Add the extracted key
          cursor += key.length + value.length + 9; // Adjust cursor for overhead bytes
        } catch (e) {
          console.error("Error processing key-value pair:", e);
          break;
        }
      }

      connection.write(serializeRESP(keys)); // Respond with all keys
    } catch (error) {
      console.error("Error retrieving keys:", error);
      connection.write("*0\r\n"); // Respond with an empty array on failure
    }
    return;
  }

  // Handle specific key pattern (not "*")
  try {
    const [key] = getKeysValues(rdb);
    connection.write(serializeRESP([key]));
  } catch (error) {
    console.error("Error retrieving single key:", error);
    connection.write("*0\r\n");
  }
};

const server = net.createServer((connection) => {
  console.log("connected");
  
  connection.on("data", (stream) => {
    const arrayRequest = stream.toString();
    const parsedRequest = parseRequest(arrayRequest);
    console.log(parsedRequest);

    switch (parsedRequest.commandName) {
      case "ECHO":
        sendEchoResponse(connection, parsedRequest.args[0]);
        return;
      case "PING":
        sendPongResponse(connection);
        return;
      case "SET":
        if (!parsedRequest.args[2]) {
          handleSetRequest(connection, parsedRequest.args[0], parsedRequest.args[1]);
        } else if (parsedRequest.args[2].toUpperCase() === "PX") {
          handleSetRequest(connection, parsedRequest.args[0], parsedRequest.args[1], parsedRequest.args[3]);
        }
        return;
      case "GET":
        handleGetRequest(connection, parsedRequest.args[0]);
        return;
      case "CONFIG GET":
        handleConfigGetRequest(connection, parsedRequest.args[0]);
        return;
      case "KEYS":
        handleKeysRequest(connection, parsedRequest.args[0]);
        return;
      default:
        connection.write("-ERR unsupported command\r\n");
    }
  });
});

server.listen(6379, "127.0.0.1", () => {
  console.log("Connected to port 127.0.0.1");
});
