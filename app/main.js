const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

//Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  console.log("Data received:" + data.toString());
  const msg = data.toString().split("\r\n");
  const command = msg[2];
  const arg = msg[4];

  switch(command) {
    case "PING":
      connection.write(`"+PONG\r\n"`)
      break
  }
});

server.listen(6379, "127.0.0.1");

// have tried so much
// *3 \r\n $3 \r\n SET \r\n $3 \r\n foo \r\n $3 \r\n bar \r\n
// *3 \r\n $3 \r\n GET \r\n $3 \r\n foo \r\n
