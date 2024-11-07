const net = require("net");

const buff = {};

console.log("Logs from your program will appear here!");

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    // *2\r\n $5 \r\n ECHO \r\n $3 \r\n hey \r\n
    const commands = Buffer.from(data).toString().split("\r\n");
    //command["*2", "$5", "ECHO", "$3", "hey"]

    if (commands[2] == "ECHO") {
      const stringEcho = commands[4];
      const len = stringEcho.length;
      return connection.write("$" + len + "\r\n" + stringEcho + "\r\n");
    } else if (commands[2] == "SET") {
      buff[msg[4]] = msg[6];
      return connection.write("+OK\r\n");
    } else if (commands[2] == "GET") {
      return connection.write(
        `$${buff[msg[4]].length}\r\n${buff[msg[4]]}\r\n` || "$-1\r\n"
      );
    }
    connection.write("+PONG\r\n");
  });
});
server.listen(6379, "127.0.0.1");
