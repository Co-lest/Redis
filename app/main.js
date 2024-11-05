const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

//Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  // Handle connection
  connection.on("data", (data) => {
    // *2\r\n $5 \r\n ECHO \r\n $3 \r\n hey \r\n
    const commands = Buffer.from(data).toString().split("\r\n");
 
    if (commands[2] == "ECHO") { //command["*2", "$5", "ECHO", "$3", "hey", "\r\n"]
      const stringEcho = commands[commands.length - 2];
      const len = stringEcho.length;
      return connection.write("$" + len + "\r\n" + stringEcho + "\r\n");
    }
    const command = commands[2];   // The command itself (e.g., "SET" or "GET")
    const key = commands[4];       // The key for SET/GET operations

    if (command === "SET") {
        const value = commands[6];
        database[key] = value;
        connection.write("+OK\r\n");

    } else if (command === "GET") {
        const value = database[key];
        if (value !== undefined) {
            const length = value.length;
            connection.write("$" + length + "\r\n" + value + "\r\n");
        } else {
            connection.write("$-1\r\n");
        }
    }

    connection.write("+PONG\r\n")
  })
});

server.listen(6379, "127.0.0.1");


//*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n