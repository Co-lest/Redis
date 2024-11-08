const net = require("net");

const buff = {};
let duration;
let dataStore = new Map()

console.log("Logs from your program will appear here!");

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    // *2\r\n $5 \r\n ECHO \r\n $3 \r\n hey \r\n
    const commands = Buffer.from(data).toString().split("\r\n");
    const inputString = data.toString();
		const inputArray = inputString.split('\r\n');

    const [,, dir, path, dbfilename, file] = process.argv;

    const [, , command, , key = '', , value = '',,key2='',, value2=''] = inputArray;
		const cmd = command.toLowerCase();
		const cmd2 = value2.toLowerCase();

    if (key2 === cmd2) {
			dataStore.set(cmd2, value2)
		  }
		

    if (commands[2] == "ECHO") {
      const stringEcho = commands[4];
      const len = stringEcho.length;
      return connection.write("$" + len + "\r\n" + stringEcho + "\r\n");
    } else if (commands[2] == "SET") {
      buff[commands[4]] = commands[6];
      if ((commands[10])) { //(commands[8]).toLocaleLowerCase() == "pt"
        duration = commands[10]
        setTimeout(() => {
          delete buff[commands[4]]
        }, duration);
      }
      return connection.write("+OK\r\n");
    } else if (commands[2] == "GET") {
      if (buff[commands[4]]) {
        return connection.write(`$${(buff[commands[4]]).length}\r\n${buff[commands[4]]}\r\n`)
      } else {
        return connection.write(`$-1\r\n`);
      }
    } else if (cmd == "config") { //*2 \r\n $3 \r\n dir \r\n $16 \r\n/ tmp/redis-files \r\n
      dataStore.set('dir', path);
      dataStore.set('dbfilename', file);
      let result = dataStore.get(value);
      console.log(result);
      const responseArr = [`$${value.length}\r\n${value}\r\n`, `$${result.length}\r\n${result}\r\n`];
      const redisResponse = `*${responseArr.length}\r\n${responseArr.join('')}`;
      return connection.write(redisResponse);
    }
    connection.write(`+PONG\r\n`);
  });
});
server.listen(6379, "127.0.0.1");


//*2 $n --dir $n /tmp/redis-files $n --dbfilename $n dump.rdb