const net = require("net");

let dataStore = new Map();
console.log("Logs from your program will appear here!");

const parseCommand = (data) => {
  const inputArray = data.toString().split('\r\n');
  const command = inputArray[2]?.toLowerCase();
  const key = inputArray[4] || '';
  const value = inputArray[6] || '';
  const option = inputArray[8]?.toLowerCase();
  const optionValue = inputArray[10] || '';
  return { command, key, value, option, optionValue };
};

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    const { command, key, value, option, optionValue } = parseCommand(data);
 
      if (command === "echo") {
        const len = value.length;
        return connection.write(`$${len}\r\n${value}\r\n`);
      }

      if (command === "set") {
        dataStore.set(key, value);
        if (option === "px") {
          const duration = parseInt(optionValue, 10);
          setTimeout(() => dataStore.delete(key), duration);
        }
        return connection.write("+OK\r\n");
      }

      if (command === "get") {
        const storedValue = dataStore.get(key);
        if (storedValue) {
          return connection.write(`$${storedValue.length}\r\n${storedValue}\r\n`);
        } else {
          return connection.write("$-1\r\n");
        }
      }

      if (command === "config") {
        const [, , dir, path, dbfilename, file] = process.argv;
        dataStore.set('dir', path);
        dataStore.set('dbfilename', file);
        const configValue = dataStore.get(value) || '';
        const response = `*2\r\n$${value.length}\r\n${value}\r\n$${configValue.length}\r\n${configValue}\r\n`;
        return connection.write(response);
      }
        connection.write("+PONG\r\n");
  });
});

server.listen(6379, "127.0.0.1");
