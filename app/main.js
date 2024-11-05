const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

//Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  // Handle connection
  connection.on("data", (data) => {
    // *2\r\n $5 \r\n ECHO \r\n $3 \r\n hey \r\n
    const commands = Buffer.from(data).toString().split("\r\n");
    //command["*2", "$5", "ECHO", "$3", "hey"]
 
    if (commands[2] == "ECHO") {
      const stringEcho = commands[commands.length - 1];
      const len = stringEcho.length;
      return connection.write("$" + len + "\r\n" + stringEcho + "\r\n");
    }

    connection.write("+PONG\r\n")
  })
});

server.listen(6379, "127.0.0.1");
