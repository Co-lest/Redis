const serverInfo = {
  role: "",
  master: {
    replica_connection: [], // To store all the connection to different replicas so it can propogate commands
    replica_count: 0,
    offset: 0,
    ack_received: 0, // Total acks received by master from replica when getack is passed
    ack_needed: 0, // Acks need to be received.
    reply_wait: false,
    propogated_commands: 0,
  },
  slave: {
    offset: 0,
  },
  xreadWaiting: false, // To indicate whether xread is waiting for new stream or not.
};

module.exports = { serverInfo };
