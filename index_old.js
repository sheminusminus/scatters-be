require('dotenv').config();

const express = require('express');

const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const Game = require('./game');

const scatters = io.of('/scatters');

const defaultRoomName = process.env.ROOM_NAME;

const rooms = {
  [defaultRoomName]: scatters,
};
const games = {};

const listener = server.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

const events = {
  CONNECT: 'connect',
  CONNECT_ERROR: 'connect_error',
  DICE_ROLL_RESET: 'dice-roll-reset',
  DICE_ROLLED: 'dice-rolled',
  EMIT_NAME: 'name',
  GAME_STARTED: 'game-started',
  GAME_STATUS: 'game-status',
  GET_STATUS: 'get-status',
  GOT_RESPONSES: 'got-responses',
  JOINED_ROOM: 'joined-room',
  NEXT_ROUND: 'next-round',
  PLAYERS_UPDATED: 'players-updated',
  RESET_DICE_ROLL: 'reset-dice-roll',
  ROLL_DICE: 'roll-dice',
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
};

games[defaultRoomName] = new Game(scatters, defaultRoomName);
const defaultGame = games[defaultRoomName];

const makeHandleJoinRoom = (socket, roomName) => () => {
  defaultGame.addPlayer(socket.id, socket.username, socket);

  console.log(defaultGame.activePlayer);
  socket.emit(events.JOINED_ROOM, {
    activePlayer: defaultGame.activePlayer,
    id: socket.id,
    name: socket.username,
    players: defaultGame.state,
    room: defaultRoomName,
  });

  socket.to(defaultRoomName).emit(events.PLAYERS_UPDATED, {
    activePlayer: defaultGame.activePlayer,
    name: socket.username,
    players: defaultGame.state,
  });

  if (defaultGame.roundInProgress) {
    socket.emit(events.WAIT_NEXT_ROUND);
  }
};

const makeHandleName = (socket) => (data) => {
  console.log('handling name', defaultRoomName, data);
  socket.username = data.username;
  socket.room = defaultRoomName;

  const handleJoinRoom = makeHandleJoinRoom(socket, data.room);

  socket.join(defaultRoomName, handleJoinRoom);
};

const makeHandleStartGame = (socket) => () => {
  console.log('start game');
  defaultGame.startGame();

  scatters.to(defaultRoomName).emit(events.GAME_STARTED, {
    activePlayer: defaultGame.activePlayer,
  });
};

const handleTimerFire = (timeLeft) => {
  scatters.to(defaultRoomName).emit(events.TIMER_FIRED, {
    timeLeft,
    startTime: defaultGame.start,
    endTime: defaultGame.end,
  });

  if (timeLeft <= 0) {
    scatters.to(defaultRoomName).emit(events.ROUND_ENDED);
  }
};

const handleStartRound = () => {
  defaultGame.startTimer(handleTimerFire);

  scatters.to(defaultRoomName).emit(events.ROUND_STARTED, {
    startTime: defaultGame.start,
    endTime: defaultGame.end,
  });
};

const makeHandleResetDiceRoll = (socket) => () => {
  console.log('reset dice roll requested');

  defaultGame.resetDiceRoll();

  scatters.to(defaultRoomName).emit(events.DICE_ROLL_RESET);
};

const makeHandleRollDice = (socket) => () => {
  console.log('dice roll requested');

  if (socket.id !== defaultGame.activePlayer) {
    return;
  }

  const roll = defaultGame.rollDice();

  scatters.to(defaultRoomName).emit(events.DICE_ROLLED, {
    roll,
  });
};

const makeHandleSendAnswers = (socket) => (data) => {
  console.log('got answers for socket: ', socket.id);

  const { answers } = data;

  const responses = defaultGame.setPlayerAnswers(socket.id, answers);

  if (responses.length === defaultGame.numPlayersNotWaiting) {
    console.log('got all responses', responses);

    scatters.to(defaultRoomName).emit(events.GOT_RESPONSES, {
      responses,
    });
  }
};

const makeHandleSendTallies = (socket) => (data) => {
  console.log('got tallies for socket: ', socket.id, data);

  defaultGame.talliesToScores(data, () => {
    console.log('round scored', defaultGame.state);

    scatters.to(defaultRoomName).emit(events.ROUND_SCORED, {
      players: defaultGame.state,
    });
  });
};

const makeHandleNextRound = (socket) => (data) => {
  console.log('next round requested');

  defaultGame.nextRound();

  console.log(defaultGame.activePlayer);
  scatters.to(defaultRoomName).emit(events.NEXT_ROUND, {
    activePlayer: defaultGame.activePlayer,
    players: defaultGame.state,
  });
};

const makeHandleSetRound = (socket) => (data) => {
  console.log('set round requested', data);

  defaultGame.setRound(data.round);

  scatters.to(defaultRoomName).emit(events.ROUND_SET, {
    activePlayer: defaultGame.activePlayer,
    currentList: defaultGame.getRound(),
    players: defaultGame.state,
  });
};

const makeHandleGetStatus = (socket) => (data) => {
  console.log('game status requested');

  defaultGame.unwaitAllPlayers();

  const activePlayer = defaultGame.activePlayer;
  const currentList = defaultGame.round;
  const inProgress = defaultGame.gameInProgress;
  const phase = defaultGame.phase;
  const players = defaultGame.state;
  const roll = defaultGame.dice.value;
  const roundInProgress = defaultGame.roundInProgress;

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

const makeHandleDisconnect = (socket) => () => {
  defaultGame.removePlayer(socket.id);

  scatters.to(defaultRoomName).emit('player-left', {
    name: socket.username,
    state: defaultGame.state,
  });
};

const handleConnection = (socket) => {
  const handleName = makeHandleName(socket);
  const handleStartGame = makeHandleStartGame(socket);
  const handleResetDiceRoll = makeHandleResetDiceRoll(socket);
  const handleRollDice = makeHandleRollDice(socket);
  const handleSendAnswers = makeHandleSendAnswers(socket);
  const handleSendTallies = makeHandleSendTallies(socket);
  const handleNextRound = makeHandleNextRound(socket);
  const handleGetStatus = makeHandleGetStatus(socket);
  const handleSetRound = makeHandleSetRound(socket);
  const handleDisconnect = makeHandleDisconnect(socket);

  socket.on(events.EMIT_NAME, handleName);

  socket.on(events.START_GAME, handleStartGame);

  socket.on(events.START_ROUND, handleStartRound);

  socket.on(events.ROLL_DICE, handleRollDice);

  socket.on(events.RESET_DICE_ROLL, handleResetDiceRoll);

  socket.on(events.SEND_ANSWERS, handleSendAnswers);

  socket.on(events.SEND_TALLIES, handleSendTallies);

  socket.on(events.NEXT_ROUND, handleNextRound);

  socket.on(events.GET_STATUS, handleGetStatus);

  socket.on(events.SET_ROUND, handleSetRound);

  defaultGame.registerPhaseListener(socket.id, handleGetStatus);

  socket.on('disconnect', handleDisconnect);
};

scatters.on('connection', handleConnection);
