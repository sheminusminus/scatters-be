const createSocketMiddleware = require('./middleware');

const makeHandleSendChatMessage = (CHAT_MESSAGE_SENT, socket) => (data) => {
  const { username, room, text } = data;
  console.log('send chat message', data);
  socket.to(room).emit(CHAT_MESSAGE_SENT, { username, room, text });
};

const makeHandleGetChatMessages = (GET_CHAT_MESSAGES, socket) => (data) => {
  const { room } = data;
  console.log('send chat message', data);
  socket.emit(GET_CHAT_MESSAGES, { chat: room });
};

module.exports = (io, events) => {
  io.on('connection', (socket) => {
    const middleware = createSocketMiddleware(socket);

    socket.use(middleware);

    const handleSendChatMessage = makeHandleSendChatMessage(events.CHAT_MESSAGE_SENT, socket);
    const handleGetChatMessages = makeHandleGetChatMessages(events.GET_CHAT_MESSAGES, socket);

    socket.on(events.SEND_CHAT_MESSAGE, handleSendChatMessage);
    socket.on(events.GET_CHAT_MESSAGES, handleGetChatMessages);
  });
};
