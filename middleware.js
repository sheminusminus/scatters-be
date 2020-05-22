module.exports = (socket, manager) => ([event, data], next) => {
  socket.scatters = {};

  if (data) {
    if (data.username) {
      socket.scatters.username = data.username;
      if (!socket.rooms || !socket.rooms[data.username]) {
        socket.join(data.username);
      }
    }
    if (data.room) {
      socket.scatters.room = data.room;
      if (!socket.rooms || !socket.rooms[data.room]) {
        socket.join(data.room);
      }
    }
  }

  console.log(socket.scatters, socket.rooms);
  return next();
};
