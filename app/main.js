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
    } else if (commands[2] == "SET") {//command["*2", "$5", "SET", "$3", "hey"]
        return connection.write("+OK\r\n")
    } else if(commands[2] == "GET") {  //command["*3", "\r\n",  "SET", "\r\n" "$3", "\r\n", "foo", "\r\n", "$3", "\r\n", "bar", "\r\n"]
        const len2 = commands[10].length
        return connection.write("$" + len2 + "\r\n" + commands[10] + "\r\n")
    }

    connection.write("+PONG\r\n")
  })
});

server.listen(6379, "127.0.0.1");


//*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n