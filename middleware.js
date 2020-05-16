module.exports = (socket, manager) => ([event, data], next) => {
  socket.scatters = {};

  if (data) {
    if (data.username) {
      socket.scatters.username = data.username;
    }
    if (data.room) {
      socket.scatters.room = data.room;
    }
  }

  console.log(socket.scatters);
  return next();
};
