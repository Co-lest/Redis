const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

//Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  // Handle connection
  connection.on("data", (data) => {
    const command = Buffer.from(data).toString().split("\r\n")

    if (command[2] == "ECHO") {
        const stringEcho = command[4]
        const leng = command.length
        
        connection.write("$" + leng + "\r\n" + stringEcho + "\r\n")
    }

    connection.write("+PONG\r\n")
  })
});

server.listen(6379, "127.0.0.1");
