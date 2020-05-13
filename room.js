const Game = require('./game');


module.exports = class Room {
  constructor(io, name, id) {
    this.game = new Game(io, name);
    this.name = name;
    this.io = io;
    this.id = id;

    this.addPlayer = this.addPlayer.bind(this);
    this.findPlayer = this.findPlayer.bind(this);
    this.getRound = this.getRound.bind(this);
    this.nextRound = this.nextRound.bind(this);
    this.nextTurn = this.nextTurn.bind(this);
    this.registerPhaseListener = this.registerPhaseListener.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.reRollDice = this.reRollDice.bind(this);
    this.resetDiceRoll = this.resetDiceRoll.bind(this);
    this.rollDice = this.rollDice.bind(this);
    this.setPlayerAnswers = this.setPlayerAnswers.bind(this);
    this.setRound = this.setRound.bind(this);
    this.startGame = this.startGame.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.talliesToScores = this.talliesToScores.bind(this);
    this.unRegisterPhaseListener = this.unRegisterPhaseListener.bind(this);
    this.updatePlayer = this.updatePlayer.bind(this);
    this.getPlayersAway = this.getPlayersAway.bind(this);
    this.setPlayerAway = this.setPlayerAway.bind(this);
    this.setPlayerBack = this.setPlayerBack.bind(this);
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

  get numPlayers() {
    return this.game.numPlayers;
  }

  get state() {
    return this.game.state.map((player) => player.getDataForRoom(this.name, true));
  }

  getPlayersAway() {
    return this.game.getPlayersAway();
  }

  setPlayerAway(username) {
   this.game.setPlayerAway(username);
  }

  setPlayerBack(username) {
    this.game.setPlayerBack(username);
  }

  getData(serializable = false) {
    const data = {
      name: this.name,
      players: this.state,
    };

    if (serializable) {
      return data;
    }

    return {
      ...this,
      ...data,
    };
  }

  registerPhaseListener(key, callback) {
    return this.game.registerPhaseListener(key, callback);
  }

  unRegisterPhaseListener(key) {
    return this.game.unRegisterPhaseListener(key);
  }

  getRound() {
    return this.game.getRound();
  }

  setRound(round) {
    return this.game.setRound(round);
  }

  nextRound() {
    return this.game.nextRound();
  }

  endGame() {
    return this.game.endGame();
  }

  startGame() {
    return this.game.startGame();
  }

  startTimer(callback) {
    return this.game.startTimer(callback);
  }

  addPlayer(username) {
    return this.game.addPlayer(username).getDataForRoom(this.name);
  }

  findPlayer(username) {
    const foundPlayer = this.game.findPlayer(username);
    if (foundPlayer) {
      return foundPlayer.getDataForRoom(this.name);
    }
    return undefined;
  }

  removePlayer(username) {
    return this.game.removePlayer(username);
  }

  updatePlayer(player) {
    return this.game.updatePlayer(player).getDataForRoom(this.name);
  }

  nextTurn() {
    return this.game.nextTurn();
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

  setPlayerAnswers(username, answers) {
    return this.game.setPlayerAnswers(username, answers);
  }

  talliesToScores(tallies, done) {
    return this.game.talliesToScores(tallies, done);
  }
};
