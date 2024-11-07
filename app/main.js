const net = require("net")

const buff = {}

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const server = net.createServer((connection) => {
  console.log("Data received:" + data.toString());
  const msg = data.toString().split("\r\n");
  const command = msg[2];
  const arg = msg[4];

  switch (command) {
    case "echo":
      connection.write(`$${arg.length}\r\n${arg}\r\n`);
      break;
    case "ping":
      connection.write("+PONG\r\n");
      break;
    case "set":
      buff[msg[4]] = msg[6];
      connection.write("+OK\r\n");
      break;
    case "get":
      connection.write(
        `$${buff[msg[4]].length}\r\n${buff[msg[4]]}\r\n` || "$-1\r\n"
      );
      break;
    default:
      connection.write("+PONG\r\n");
      break;
  }
});

server.listen(6379, "127.0.0.1");

// have tried so much
// *3 \r\n $3 \r\n SET \r\n $3 \r\n foo \r\n $3 \r\n bar \r\n
// *3 \r\n $3 \r\n GET \r\n $3 \r\n foo \r\n
