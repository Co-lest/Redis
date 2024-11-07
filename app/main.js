const net = require("net");

const buff = {};
let duration;

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
      buff[commands[4]] = commands[6];
      if ((commands[8]).toLocaleLowerCase() == "pt") {
        duration = commands[10]
        setTimeout(() => {
          delete buff[commands[4]]
        }, duration);
      }
      return connection.write("+OK\r\n");
    } else if (commands[2] == "GET") {
      if (buff[commands[4]]) {
        return connection.write(`$${buff[commands[4]].length}\r\n${buff[commands[4]]}\r\n`)
      } else {
        return connection.write(
          `$-1\r\n`
        );
      }
    }
    connection.write(`+PONG\r\n`);
  });
});
server.listen(6379, "127.0.0.1");


//*2 $3 SET $3 foo $4 bar $2 px $3 100