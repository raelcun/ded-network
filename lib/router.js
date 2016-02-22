const node = require('./node'),
      net = require('net'),
      Command = require('./command');

module.exports = (node) => {
  const sendCommand = (command, callback) => {
    console.log(command);
    console.log(`attempting to connect to ${command.ip}:${command.port}`);
    const socket = net.createConnection(command.port, command.ip);

    socket.on('error', err => {
      console.log(`error connecting: ${err}`);
      callback(err);
    });
    
    socket.on('connect', () => {
      const data = Command.encode(command);
      console.log(`sent ${data} from ${node.ip}:${node.port} to ${command.ip}:${command.port}`);
      socket.write(data);
    })
  }
  
  // handle incoming connections to router
  const socket = net.createServer(socket => {
    const addr = socket.remoteAddress;
    const port = socket.remotePort;
    
    console.log(`${node.id}((${node.ip}:${node.port}) connection from ${addr}:${port}`);
    
    socket.on('data', data => {
      console.log(`${node.id}((${node.ip}:${node.port}) received ${data}`);
    })
    
    socket.on('close', () => {
      console.log(`${node.id}(${node.ip}:${node.port}) closed connection with ${addr}:${port}`);
    })
  });

  console.log(`attempting to listen on ${node.ip}:${node.port}`);
  socket.listen(node.port, node.ip);
  
  return {
    sendCommand
  }
}