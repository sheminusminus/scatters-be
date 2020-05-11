const Game = require('./game');


module.exports = class Room {
  constructor(io, name, id) {
    this.game = new Game(io, name);
    this.name = name;
    this.io = io;
    this.id = id;
    this.registerPhaseListener = this.registerPhaseListener.bind(this);
    this.unRegisterPhaseListener = this.unRegisterPhaseListener.bind(this);
    this.getRound = this.getRound.bind(this);
    this.setRound = this.setRound.bind(this);
    this.nextRound = this.nextRound.bind(this);
    this.startGame = this.startGame.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.addPlayer = this.addPlayer.bind(this);
    this.findPlayer = this.findPlayer.bind(this);
    this.findPrevPlayer = this.findPrevPlayer.bind(this);
    this.findPlayerById = this.findPlayerById.bind(this);
    this.findPrevPlayerById = this.findPrevPlayerById.bind(this);
    this.removePrevPlayer = this.removePrevPlayer.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.updatePlayer = this.updatePlayer.bind(this);
    this.unwaitAllPlayers = this.unwaitAllPlayers.bind(this);
    this.nextTurn = this.nextTurn.bind(this);
    this.rollDice = this.rollDice.bind(this);
    this.reRollDice = this.reRollDice.bind(this);
    this.resetDiceRoll = this.resetDiceRoll.bind(this);
    this.setPlayerAnswers = this.setPlayerAnswers.bind(this);
    this.talliesToScores = this.talliesToScores.bind(this);
  }

  get phase() {
    return this.game.phase;
  }

  get activePlayer() {
    return this.game.activePlayer;
  }

  get roundInProgress() {
    return this.game.roundInProgress;
  }

  get gameInProgress() {
    return this.game.gameInProgress;
  }

  get start() {
    return this.game.start;
  }

  get end() {
    return this.game.end;
  }

  get dice() {
    return this.game.dice;
  }

  registerPhaseListener(id, callback) {
    this.game.registerPhaseListener(id, callback);
  }

  unRegisterPhaseListener(id) {
    this.game.unRegisterPhaseListener(id);
  }

  getRound() {
    return this.game.round;
  }

  setRound(round) {
    this.game.setRound(round);
  }

  nextRound() {
    this.game.nextRound();
  }

  endGame() {
    this.game.endGame();
  }

  startGame() {
    this.game.startGame();
  }

  startTimer(cb) {
    this.game.startTimer(cb);
  }

  addPlayer(id, username) {
    this.game.addPlayer(id, username);
  }

  findPlayer(username) {
    return this.game.findPlayer(username);
  }

  findPrevPlayer(username) {
    return this.game.findPrevPlayer(username);
  }

  findPlayerById(id) {
    return this.game.findPlayerById(id);
  }

  findPrevPlayerById(id) {
    return this.game.findPrevPlayerById(id);
  }

  removePrevPlayer(username) {
    this.game.removePrevPlayer(username);
  }

  removePlayer(id) {
    this.game.removePlayer(id);
  }

  removePlayerByName(username) {
    this.game.removePlayerByName(username);
  }

  updatePlayer(id, player) {
    this.game.updatePlayer(id, player);
  }

  unwaitAllPlayers() {
    this.game.unwaitAllPlayers();
  }

  nextTurn() {
    this.game.nextTurn();
  }

  rollDice() {
    return this.game.rollDice();
  }

  reRollDice() {
    return this.game.reRollDice();
  }

  resetDiceRoll() {
    this.game.resetDiceRoll();
  }

  setPlayerAnswers(id, answers) {
    return this.game.setPlayerAnswers(id, answers);
  }

  talliesToScores(tallies, callback) {
    this.game.talliesToScores(tallies, callback);
  }

  get numPlayersNotWaiting() {
    return this.game.numPlayersNotWaiting;
  }

  get numPlayers() {
    return this.game.numPlayers;
  }

  get prevState() {
    return this.game.prevState;
  }

  get playersNotWaiting() {
    return this.game.playersNotWaiting;
  }

  get playersWaiting() {
    return this.game.playersWaiting;
  }

  get state() {
    return this.game.state;
  }
};
