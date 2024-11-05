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
      const stringEcho = commands[4];
      const len = stringEcho.length;
      return connection.write("$" + len + "\r\n" + stringEcho + "\r\n");
    }

    const command = commands[4]; // set or get

    if (command === "SET") {
        const key = commands[8];
        const value = commands[12];
        
        map.set(key, value); 

        connection.write("+OK\r\n");

    } else if (command === "GET") {
        const key = commands[8];
        
        if (!key || !map.has(key)) {
            return connection.write("$-1\r\n");
        }

        const value = map.get(key);

        connection.write(`$${value.length}\r\n${value}\r\n`);
    }

    connection.write("+PONG\r\n")
  })
});

server.listen(6379, "127.0.0.1");


// *3 \r\n $3 \r\n SET \r\n $3 \r\n foo \r\n $3 \r\n bar \r\n
// *3 \r\n $3 \r\n GET \r\n $3 \r\n foo \r\n