require('dotenv').config();
const fs = require('fs');

const express = require('express');
const ss = require('socket.io-stream');

const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const Manager = require('./manager');
const Presence = require('./presence');
const Invitations = require('./invitations');
const Notifs = require('./notifs');

const scatters = io.of('/scatters');

const listener = server.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

const events = {
  CONNECT: 'connect',
  CONNECT_ERROR: 'connect_error',
  DICE_ROLL_RESET: 'dice-roll-reset',
  DICE_ROLLED: 'dice-rolled',
  EMIT_NAME: 'name',
  EXIT_ROOM: 'exit-room',
  GAME_STARTED: 'game-started',
  GAME_STATUS: 'game-status',
  GET_STATUS: 'get-status',
  GOT_RESPONSES: 'got-responses',
  JOINED_ROOM: 'joined-room',
  LIST_ROOMS: 'list-rooms',
  NEXT_ROUND: 'next-round',
  PLAYERS_UPDATED: 'players-updated',
  REQUEST_ROOM: 'request-room',
  RESET_DICE_ROLL: 'reset-dice-roll',
  ROLL_DICE: 'roll-dice',
  ROOM_EXITED: 'room-exited',
  ROOMS_JOINED: 'rooms-joined',
  ROUND_ENDED: 'round-ended',
  ROUND_SCORED: 'round-scored',
  ROUND_SET: 'round-set',
  ROUND_STARTED: 'round-started',
  SEND_ANSWERS: 'send-answers',
  SEND_TALLIES: 'send-tallies',
  SET_ROUND: 'set-round',
  START_GAME: 'start-game',
  START_ROUND: 'start-round',
  TIMER_FIRED: 'timer-fired',
  WAIT_NEXT_ROUND: 'wait-next-round',

  PRESENCE_GET_ONLINE_USERS: 'presence-get-online-users',
  PRESENCE_GET_ALL_USERS: 'presence-get-all-users',

  INVITES_GET_TO_ME: 'invites-get-to-me',
  INVITES_GET_FROM_ME: 'invites-get-from-me',
  INVITES_SEND_FOR_ROOM: 'invites-send-for-room',

  SET_PUSH_TOKEN: 'set-push-token',
  SEND_PUSH: 'send-push',
};

const presence = new Presence();
const manager = new Manager(presence);
const invites = new Invitations();
const notifs = new Notifs();

const $room = (roomName) => manager.findRoom(roomName);

const handleRoomJoined = (socket, username, roomName) => () => {
  console.log('room was joined', username, roomName);

  const room = $room(roomName);
  const joinedRooms = manager.findRoomsForPlayer(username);
  const allRooms = manager.listRoomsExcluding(joinedRooms);

  socket.emit(events.JOINED_ROOM, {
    activePlayer: room.activePlayer,
    allRooms,
    currentList: room.getRound(),
    joinedRooms,
    players: room.state,
    room: room.name,
    username: username,
  });

  socket.to(roomName).emit(events.PLAYERS_UPDATED, {
    activePlayer: room.activePlayer,
    currentList: room.getRound(),
    players: room.state,
    room: room.name,
    username: username,
  });
};

const makeHandleReconnectionEvent = (socket, player) => (attemptNumber) => {
  console.log('socket reconnecting at attempt number:', attemptNumber);
};

const makeHandleDisconnect = (socket, player) => (reason) => {
  console.log('socket disconnected:', reason);
  player.setIsOnline(false);
};

const makeHandleRoom = (socket) => (data) => {
  console.log('room join requested', data);

  const { room: roomName, username } = data;

  let foundRoom;

  if (roomName) {
    foundRoom = $room(roomName);
  }

  if (!foundRoom) {
    foundRoom = manager.createRoom(scatters, roomName);
  }

  if (foundRoom) {
    const handleGetStatus = makeHandleGetStatus(socket);
    const handleJoinRoom = handleRoomJoined(socket, username, foundRoom.name);
    const player = manager.addPlayerToRoom(foundRoom.name, username);
    const handleDisconnect = makeHandleDisconnect(socket, player);
    const handleReconnect = makeHandleReconnectionEvent(socket, player);
    socket.join(foundRoom.name, handleJoinRoom);
    socket.on('reconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleDisconnect);
    socket.on('reconnecting', handleDisconnect);
    socket.on('disconnect', handleDisconnect);
    foundRoom.registerPhaseListener(username, handleGetStatus);
  }
};

const makeHandleName = (socket) => (data) => {
  console.log('username received', data);

  const { username, pushToken } = data;

  socket.username = username;

  manager.recordPlayer(username);

  const joinedRooms = manager.findRoomsForPlayer(username);
  const allRooms = manager.listRoomsExcluding(joinedRooms);

  if (pushToken) {
    notifs.setToken(username, pushToken);
  }

  socket.emit(events.LIST_ROOMS, {
    allRooms,
    joinedRooms,
    username,
  });
};

const makeHandleStartGame = (socket) => (data) => {
  console.log('start game', data, socket.username);

  const { room: roomName } = data;

  const room = $room(roomName);

  room.startGame();

  scatters.to(room.name).emit(events.GAME_STARTED, {
    activePlayer: room.activePlayer,
  });
};

const handleTimerFire = (roomName) => (timeLeft) => {
  const room = $room(roomName);

  scatters.to(room.name).emit(events.TIMER_FIRED, {
    timeLeft,
    startTime: room.start,
    endTime: room.end,
  });

  if (timeLeft <= 0) {
    scatters.to(room.name).emit(events.ROUND_ENDED);
  }
};

const handleStartRound = (data) => {
  const { room: roomName } = data;

  const timerFired = handleTimerFire(roomName);

  const room = $room(roomName);

  room.startTimer(timerFired);

  scatters.to(room.name).emit(events.ROUND_STARTED, {
    startTime: room.start,
    endTime: room.end,
  });
};

const makeHandleResetDiceRoll = (socket) => (data) => {
  console.log('reset dice roll requested', data, socket.username);

  const { room: roomName } = data;

  const room = $room(roomName);

  room.resetDiceRoll();

  scatters.to(room.name).emit(events.DICE_ROLL_RESET);
};

const makeHandleRollDice = (socket) => (data) => {
  console.log('dice roll requested', socket.username, data);

  const { room: roomName } = data;

  const room = $room(roomName);

  if (socket.username !== room.activePlayer) {
    console.log('wrong player, should be:', room.activePlayer);
    return;
  }

  const roll = room.rollDice();

  scatters.to(room.name).emit(events.DICE_ROLLED, {
    roll,
  });
};

const makeHandleSendAnswers = (socket) => (data) => {
  console.log('got answers for socket: ', data, socket.username);

  const { answers, room: roomName } = data;

  const room = $room(roomName);

  const responses = room.setPlayerAnswers(socket.username, answers);

  if (responses.length === room.numPlayers) {
    console.log('got all responses', responses);

    scatters.to(room.name).emit(events.GOT_RESPONSES, {
      responses,
    });
  }
};

const makeHandleSendTallies = (socket) => (data) => {
  console.log('got tallies for socket: ', socket.username, data);

  const { room: roomName, tallies } = data;

  const room = $room(roomName);

  room.talliesToScores(tallies, () => {
    console.log('round scored', room.state);

    scatters.to(room.name).emit(events.ROUND_SCORED, {
      players: room.state,
    });
  });
};

const makeHandleNextRound = (socket) => (data) => {
  console.log('next round requested', data, socket.username);

  const { room: roomName } = data;

  const room = $room(roomName);

  room.nextRound();

  console.log('new active player', room.activePlayer);

  scatters.to(room.name).emit(events.NEXT_ROUND, {
    activePlayer: room.activePlayer,
    players: room.state,
  });
};

const makeHandleSetRound = (socket) => (data) => {
  console.log('set round requested', data, socket.username);

  const { room: roomName } = data;

  const room = $room(roomName);

  room.setRound(data.round);

  scatters.to(room.name).emit(events.ROUND_SET, {
    activePlayer: room.activePlayer,
    currentList: room.getRound(),
    players: room.state,
  });
};

const makeHandleGetStatus = (socket) => (data) => {
  console.log('game status requested', data, socket.username);

  const { room: roomName } = data;

  const room = $room(roomName);

  const activePlayer = room.activePlayer;
  const currentList = room.getRound();
  const inProgress = room.gameInProgress;
  const phase = room.phase;
  const players = room.state;
  const roll = room.dice.value;
  const roundInProgress = room.roundInProgress;

  socket.emit(events.GAME_STATUS, {
    activePlayer,
    currentList,
    inProgress,
    phase,
    players,
    roll,
    roundInProgress,
  });
};

const makeHandleExitRoom = (socket) => (data) => {
  console.log('player exiting room', data);

  const { room: roomName, username } = data;

  manager.setPlayerAway(roomName, username);

  const room = $room(roomName);
  const joinedRooms = manager.findRoomsForPlayer(username);
  const allRooms = manager.listRoomsExcluding(joinedRooms);

  socket.emit(events.ROOM_EXITED, {
    allRooms,
    joinedRooms,
    players: room.getData(true),
  });
};

const makeHandleGetAllPlayers = (socket) => (data) => {
  console.log('request for all players', data);

  const allPlayers = manager.listAllPlayers();

  socket.emit(events.PRESENCE_GET_ALL_USERS, {
    allPlayers,
  });
};

const handleSetPushToken = (data) => {
  console.log('set token request', data);
  const { username, token } = data;
  notifs.setToken(username, token);
};

const makeHandleSendPushMessage = (socket) => (data) => {
  console.log('send push request', data);
  const { username, title, body } = data;
  notifs.sendNotification(username, title, body).then(() => {
    // ack
  });
};

const handleConnection = (socket) => {
  const stream = ss.createStream();

  manager.createRoom(scatters, 'default');

  const handleName = makeHandleName(socket);
  const handleRoom = makeHandleRoom(socket);
  const handleStartGame = makeHandleStartGame(socket);
  const handleResetDiceRoll = makeHandleResetDiceRoll(socket);
  const handleRollDice = makeHandleRollDice(socket);
  const handleSendAnswers = makeHandleSendAnswers(socket);
  const handleSendTallies = makeHandleSendTallies(socket);
  const handleNextRound = makeHandleNextRound(socket);
  const handleGetStatus = makeHandleGetStatus(socket);
  const handleSetRound = makeHandleSetRound(socket);
  const handleExitRoom = makeHandleExitRoom(socket);
  const handleGetAllPlayers = makeHandleGetAllPlayers(socket);
  const handlePushMessage = makeHandleSendPushMessage(socket);

  socket.on(events.EMIT_NAME, handleName);

  socket.on(events.REQUEST_ROOM, handleRoom);

  socket.on(events.START_GAME, handleStartGame);

  socket.on(events.START_ROUND, handleStartRound);

  socket.on(events.ROLL_DICE, handleRollDice);

  socket.on(events.RESET_DICE_ROLL, handleResetDiceRoll);

  socket.on(events.SEND_ANSWERS, handleSendAnswers);

  socket.on(events.SEND_TALLIES, handleSendTallies);

  socket.on(events.NEXT_ROUND, handleNextRound);

  socket.on(events.GET_STATUS, handleGetStatus);

  socket.on(events.SET_ROUND, handleSetRound);

  socket.on(events.EXIT_ROOM, handleExitRoom);

  socket.on(events.PRESENCE_GET_ALL_USERS, handleGetAllPlayers);

  socket.on(events.SET_PUSH_TOKEN, handleSetPushToken);

  socket.on(events.SEND_PUSH, handlePushMessage);
};

scatters.on('connection', handleConnection);
