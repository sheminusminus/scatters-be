const Dice = require('./dice');
const Player = require('./player');

// const TIMER_MIN = 3;
// const TIMER_MIN = 0.5;
const TIMER_MIN = 0.2;
const TIMER_LEN = TIMER_MIN * 60 * 1000;
const SETS_PER_ROUND = 12;
const TIMER_INTERVAL = 250;

const GamePhase = require('./constants').GamePhase;

module.exports = class Game {
  constructor(io, roomName) {
    this.io = io;
    this.players = new Map();
    this.room = roomName;
    this.phaseListeners = {};
    this.init = this.init.bind(this);
    this.addPlayer = this.addPlayer.bind(this);
    this.endGame = this.endGame.bind(this);
    this.findPlayer = this.findPlayer.bind(this);
    this.findPlayerById = this.findPlayerById.bind(this);
    this.nextTurn = this.nextTurn.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.resetDiceRoll = this.resetDiceRoll.bind(this);
    this.rollDice = this.rollDice.bind(this);
    this.registerPhaseListener = this.registerPhaseListener.bind(this);
    this.setPlayerAnswers = this.setPlayerAnswers.bind(this);
    this.startGame = this.startGame.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.talliesToScores = this.talliesToScores.bind(this);
    this.update = this.update.bind(this);
    this.updatePlayer = this.updatePlayer.bind(this);
    this.init();
  }

  init() {
    this.prevPlayers = new Map();
    this.round = 0;
    this.start = 0;
    this.end = 0;
    this.t = 0;
    this.delta = 0;
    this.inProg = false;
    this.dice = new Dice();
    this.activePlayer = null;
    this.roundInProgress = false;
    this.gameInProgress = false;
    this.callback = () => {};
    this.roundTallies = 0;
    this._phase = GamePhase.NOT_STARTED;
  }

  get phase() {
    return this._phase;
  }

  set phase(val) {
    this._phase = val;

    // this.unwaitAllPlayers();

    Object.keys(this.phaseListeners).forEach((id) => {
      this.phaseListeners[id]({
        room: this.room,
      });
    });
  }

  registerPhaseListener(id, callback) {
    this.phaseListeners[id] = callback;
  }

  unRegisterPhaseListener(id) {
    delete this.phaseListeners[id];
  }

  getRound() {
    return this.round;
  }

  setRound(round) {
    if (this.phase === GamePhase.NOT_STARTED) {
      this.round = round;
    }
  }

  nextRound() {
    this.gameInProgress = false;
    this.roundInProgress = false;
    this.round += 1;
    this.start = 0;
    this.end = 0;
    this.inProg = false;
    this.callback = () => {};
    this.unwaitAllPlayers();
    this.nextTurn();
    this.roundTallies = 0;
    this.phase = GamePhase.ROLL;
  }

  endGame() {
    this.init();
  }

  startGame() {
    this.gameInProgress = true;
    this.phase = GamePhase.ROLL;
  }

  update() {
    const now = Date.now();

    const remaining = this.end - now;

    if (remaining > 0) {
      this.callback(remaining);
      setTimeout(this.update, TIMER_INTERVAL);
    } else {
      console.log('buzz!!', remaining);
      this.callback(0);
      this.stopTimer();
    }
  }

  stopTimer() {
    if (this.numPlayers === 0) {
      this.phase = GamePhase.NOT_STARTED;
    } else {
      this.phase = GamePhase.VOTE;
    }
    this.start = 0;
    this.end = 0;
    this.t = 0;
    this.delta = 0;
    this.inProg = false;
    this.callback = () => {};
    this.io.to(this.room).emit('round-ended', { round: this.round });
  }

  startTimer(cb) {
    if (this.inProg) { return; }
    this.inProg = true;
    this.phase = GamePhase.LIST;
    this.roundInProgress = true;
    this.callback = cb;
    this.start = Date.now();
    this.end = this.start + TIMER_LEN;
    this.update();
  }

  addPlayer(id, username) {
    const player = new Player(id, username);
    const playerExists = this.findPrevPlayer(username);

    if (Boolean(playerExists)) {
      player.score = playerExists.score;
      player.turn = playerExists.turn;
      player.rerolls = playerExists.rerolls;
      this.removePrevPlayer(username);
    }

    this.updatePlayer(id, player);
  }

  findPlayer(username) {
    return this.state.find(player => player.username === username);
  }

  findPrevPlayer(username) {
    return this.prevPlayers.get(username);
  }

  findPlayerById(id) {
    return this.state.find(player => player.id === id);
  }

  findPrevPlayerById(id) {
    return this.prevState.find(player => player.id === id);
  }

  removePrevPlayer(username) {
    this.prevPlayers.delete(username);
  }

  removePlayer(id) {
    const player = {
      ...this.findPlayerById(id),
    };

    this.prevPlayers.set(player.username, player);

    this.unRegisterPhaseListener(id);

    this.players.delete(id);

    if (this.numPlayers === 0) {
      this.stopTimer();
      this.init();
    } else {
      let idx = 0;
      this.players.forEach((player) => {
        player.ordinal = idx;
        idx += 1;
      });
      if (this.activePlayer === id) {
        this.nextTurn();
      }
    }
  }

  updatePlayer(id, player) {
    this.players.set(id, player);

    if (this.roundInProgress) {
      player.setWaiting(true);
    }

    Array.from(this.players.values()).forEach((p, idx) => {
      if (p.id === id) {
        player.setOrdinal(idx);
      }
    });

    if (!this.activePlayer) {
      this.activePlayer = id;
    }
  }

  unwaitAllPlayers() {
    this.playersWaiting.forEach((p) => {
      const player = this.players.get(p.id);
      player.setWaiting(false);
      this.players.set(p.id, player);
    });
  }

  nextTurn() {
    this.unwaitAllPlayers();
    const playerIds = Array.from(this.players.keys());
    let activeIndex = playerIds.indexOf(this.activePlayer);
    if (activeIndex === this.numPlayers - 1) {
      activeIndex = 0;
    } else {
      activeIndex += 1;
    }
    this.activePlayer = playerIds[activeIndex];
  }

  rollDice() {
    this.phase = GamePhase.ROLL;
    return this.dice.roll();
  }

  reRollDice() {
    return this.dice.reroll();
  }

  resetDiceRoll() {
    this.dice.resetRoll();
  }

  setPlayerAnswers(id, answers) {
    const player = this.findPlayerById(id);
    player.setAnswers(answers);
    return Array.from(this.players.values()).reduce((arr, p) => {
      if (p.answers.length === 0) {
        return arr;
      }

      return [
        ...arr,
        {
          id: p.id,
          name: p.username,
          answers: p.answers,
        },
      ];
    }, []);
  }

  talliesToScores(tallies, callback) {
    Object.keys(tallies).forEach((playerId) => {
      console.log('tallying: playerId', playerId);
      const roundTallies = tallies[playerId];
      const player = this.findPlayerById(playerId);
      console.log('tallying: state', this.state, player);
      console.log('tallying: player', player);
      if (player) {
        player.setScores.push(roundTallies);
      }
    });

    this.roundTallies += 1;

    if (this.roundTallies === this.numPlayersNotWaiting) {
      this.phase = GamePhase.SCORES;

      this.playersNotWaiting.forEach((player) => {
        let roundScore = 0;

        for (let i = 0; i < SETS_PER_ROUND; i += 1) {
          let setScore = 0;

          for (let j = 0; j < this.numPlayersNotWaiting; j += 1) {
            const score = player.setScores[j][i];
            setScore += score;
          }
          if (setScore > 0) {
            let alliterationScore = 0;
            const answer = player.answers[i];
            const words = answer.split(' ');
            words.forEach((w, idx) => {
              const char = w[0];
              if (char.toLowerCase() === this.dice.value.toLowerCase() && idx > 0) {
                alliterationScore += 1;
              }
            });
            roundScore += 1;
            roundScore += alliterationScore;
          }
        }

        player.roundScores.push(roundScore);
        player.score += roundScore;
        player.setScores = [];
      });

      this.roundTallies = 0;

      callback();
    }
  }

  get numPlayersNotWaiting() {
    return this.playersNotWaiting.length;
  }

  get numPlayers() {
    return [...this.players.values()].length;
  }

  get prevState() {
    return [...this.prevPlayers.values()];
  }

  get playersNotWaiting() {
    return this.state.filter((p) => !p.waiting);
  }

  get playersWaiting() {
    return this.state.filter((p) => p.waiting);
  }

  get state() {
    return [...this.players.values()];
  }
};
