require('dotenv').config();

const express = require('express');

const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);
const shortId = require('shortid');

const Manager = require('./manager');
const Presence = require('./presence');
const Invitations = require('./invitations');
const Notifs = require('./notifs');

const { RoomType, RoomVisibility } = require('./constants');

const SYSTEM_USERNAME = shortId.generate();

const scatters = io.of('/scatters');

const listener = server.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

const events = {
  CONNECT: 'connect',
  CONNECT_ERROR: 'connect_error',
  CREATE_ROOM: 'create-room',
  DICE_ROLL_RESET: 'dice-roll-reset',
  DICE_ROLLED: 'dice-rolled',
  EMIT_NAME: 'name',
  EXIT_ROOM: 'exit-room',
  GAME_STARTED: 'game-started',
  GAME_STATUS: 'game-status',
  GET_STATUS: 'get-status',
  GOT_RESPONSES: 'got-responses',
  JOINED_ROOM: 'joined-room',
  JOINED_ROOM_ERROR: 'joined-room-error',
  LIST_ROOMS: 'list-rooms',
  NEXT_ROUND: 'next-round',
  PLAYERS_UPDATED: 'players-updated',
  REQUEST_ROOM: 'request-room',
  RESET_DICE_ROLL: 'reset-dice-roll',
  ROLL_DICE: 'roll-dice',
  ROOM_CREATED: 'room-created',
  ROOM_CREATED_ERROR: 'room-created-error',
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

  CONFIRM_PUSH_SENT: 'confirm-push-sent',
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
  console.log('line 85');
  const joinedRooms = manager.findRoomsForPlayer(username);
  console.log('line 87');
  const allRooms = manager.listRoomsExcluding(joinedRooms);
  console.log('line 89');
  console.log('line 90');

  socket.emit(events.JOINED_ROOM, {
    activePlayer: room.activePlayer,
    allRooms,
    currentList: room.getRound(),
    joinedRooms,
    players: room.state,
    room: room.name,
    username: username,
  });
  console.log('line 100');

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

const getJoinRoomArtifacts = (socket, roomName, username) => {
  const handleGetStatus = makeHandleGetStatus(socket);
  const player = manager.addPlayerToRoom(roomName, username);
  const handleJoinRoom = handleRoomJoined(socket, username, roomName);
  return { handleGetStatus, handleJoinRoom, player };
};

const makeHandleRoom = (socket) => (data) => {
  console.log('room join requested', data);

  const { room: roomName, username } = data;

  let foundRoom;

  if (roomName) {
    foundRoom = $room(roomName);
  }

  if (!foundRoom) {
    foundRoom = manager.createRoom(
      scatters,
      roomName,
      username,
    );
  }

  if (foundRoom) {
    const {
      handleGetStatus,
      handleJoinRoom,
      player,
    } = getJoinRoomArtifacts(socket, roomName, username);

    if (player) {
      const handleDisconnect = makeHandleDisconnect(socket, player);
      socket.join(foundRoom.name, handleJoinRoom);
      socket.on('disconnect', handleDisconnect);
      foundRoom.registerPhaseListener(username, handleGetStatus);
    } else {
      socket.emit(events.JOINED_ROOM_ERROR, { message: ' ¯\\_(ツ)_/¯ Try a different one.' });
    }
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
    room: roomName,
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
  const { to: username, username: from, room: roomName } = data;
  const title = `🎲 New Scatters room invite from ${from}!`;
  const body = `(I'm trapped in a computer writing these things all day long, send help! 🆘)`;

  const room = $room(roomName);

  if (room) {
    const isInvited = room.playerInvited(username, from);

    if (isInvited) {
      notifs.sendNotification(username, title, body, data).then((json) => {
        socket.emit(events.CONFIRM_PUSH_SENT, json);
      });
    }
  }
};

const makeHandleCreateRoom = (socket) => (data) => {
  console.log('request to create a new room: ', data);
  const { visiblity, type, room: roomName, username } = data;

  const existingRoom = $room(roomName);

  if (existingRoom) {
    console.log('room exists: ', roomName);
    socket.emit(events.ROOM_CREATED_ERROR, {
      message: 'This room name is already taken. Be more creative.',
    });
  } else {
    console.log('room does not exist: ', roomName);
    const newRoom = manager.createRoom(
      scatters,
      roomName,
      username,
      type,
      visiblity,
    );

    const {
      handleGetStatus,
      handleJoinRoom,
      player,
    } = getJoinRoomArtifacts(socket, newRoom.name, username);

    console.log('player: ', player);
    if (player) {
      const handleDisconnect = makeHandleDisconnect(socket, player);
      socket.join(newRoom.name, handleJoinRoom);
      socket.on('disconnect', handleDisconnect);
      newRoom.registerPhaseListener(username, handleGetStatus);
      socket.emit(events.ROOM_CREATED, data);
    } else {
      socket.emit(events.ROOM_CREATED_ERROR, {
        message: 'Something weird going on probably.',
      });
    }
  }
};

const handleConnection = (socket) => {
  manager.createRoom(
    scatters,
    'default',
    SYSTEM_USERNAME,
    RoomType.REALTIME,
    RoomVisibility.PUBLIC,
  );

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
  const handleCreateRoom = makeHandleCreateRoom(socket);

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

  socket.on(events.CREATE_ROOM, handleCreateRoom);
};

scatters.on('connection', handleConnection);
