const hat = require('hat');

const createCommand = (command, payload) => {
  return {
    id: hat.rack(),
    command,
    payload
  }
};

const createMessage = (nodeID, message) => {
  return createCommand('MESSAGE', {
    destinationID: nodeID,
    message: message
  });
}

const encode = (command) => {
  return JSON.stringify(command);
}

const decode = (str) => {
  return JSON.parse(str);
}

module.exports = {
  createMessage,
  encode,
  decode
}