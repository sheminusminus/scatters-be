const Dice = require('./dice');

const createPlayer = require('./playerPresence');

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

    this.addPlayer = this.addPlayer.bind(this);
    this.calculateScores = this.calculateScores.bind(this);
    this.endGame = this.endGame.bind(this);
    this.findPlayer = this.findPlayer.bind(this);
    this.getRound = this.getRound.bind(this);
    this.init = this.init.bind(this);
    this.nextRound = this.nextRound.bind(this);
    this.nextTurn = this.nextTurn.bind(this);
    this.registerPhaseListener = this.registerPhaseListener.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.reRollDice = this.reRollDice.bind(this);
    this.resetDiceRoll = this.resetDiceRoll.bind(this);
    this.rollDice = this.rollDice.bind(this);
    this.setPlayerAnswers = this.setPlayerAnswers.bind(this);
    this.setRound = this.setRound.bind(this);
    this.setScoresFromTallies = this.setScoresFromTallies.bind(this);
    this.startGame = this.startGame.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.talliesToScores = this.talliesToScores.bind(this);
    this.unRegisterPhaseListener = this.unRegisterPhaseListener.bind(this);
    this.update = this.update.bind(this);
    this.updatePlayer = this.updatePlayer.bind(this);

    void this.init();
  }

  get activePlayer() {
    return this._activePlayer;
  }

  set activePlayer(newValue) {
    const lastActivePlayer = this.players.get(this._activePlayer);
    const player = this.players.get(newValue);

    if (lastActivePlayer) {
      lastActivePlayer.isTurn = false;
      this.players.set(lastActivePlayer.username, lastActivePlayer);
    }

    if (player) {
      player.isTurn = true;
      this.players.set(player.username, player);
      this._activePlayer = newValue;
    }
  }

  get numPlayers() {
    return [...this.players.values()].length;
  }

  get phase() {
    return this._phase;
  }

  set phase(val) {
    this._phase = val;

    Object.keys(this.phaseListeners).forEach((key) => {
      this.phaseListeners[key]({
        room: this.room,
      });
    });
  }

  get state() {
    return [...this.players.values()];
  }

  get stateKeys() {
    return [...this.players.keys()];
  }

  addPlayer(username) {
    const playerExists = this.findPlayer(username);

    if (playerExists) {
      return this.updatePlayer(playerExists);
    }

    const player = createPlayer(username);

    return this.updatePlayer(player);
  }

  calculateScores() {
    this.players.forEach((player) => {
      let roundScore = 0;

      for (let i = 0; i < SETS_PER_ROUND; i += 1) {
        let setScore = 0;

        for (let j = 0; j < this.numPlayers; j += 1) {
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

    return this;
  }

  endGame() {
    return this.init();
  }

  findPlayer(username) {
    return this.state.find(player => player.username === username);
  }

  getRound() {
    return this.round;
  }

  init() {
    this.round = 0;
    this.start = 0;
    this.end = 0;
    this.inProg = false;
    this.dice = new Dice();
    this._activePlayer = null;
    this.roundInProgress = false;
    this.gameInProgress = false;
    this.callback = () => {};
    this.roundTallies = 0;
    this._phase = GamePhase.NOT_STARTED;

    return this;
  }

  nextRound() {
    this.gameInProgress = false;
    this.roundInProgress = false;
    this.round += 1;
    this.start = 0;
    this.end = 0;
    this.inProg = false;
    this.callback = () => {};
    this.nextTurn();
    this.roundTallies = 0;
    this.phase = GamePhase.ROLL;

    return this;
  }

  nextTurn() {
    let activeIndex = this.stateKeys.indexOf(this.activePlayer);

    if (activeIndex === this.numPlayers - 1) {
      activeIndex = 0;
    } else {
      activeIndex += 1;
    }

    this.activePlayer = this.stateKeys[activeIndex];

    return this;
  }

  registerPhaseListener(key, callback) {
    this.phaseListeners[key] = callback;
    return this;
  }

  removePlayer(username, reinitializeGame = true) {
    this.unRegisterPhaseListener(username);

    this.players.delete(username);

    if (this.numPlayers === 0) {
      this.stopTimer();

      this.activePlayer = null;

      if (reinitializeGame) {
        this.init();
      }
    } else {
      let idx = 0;

      this.players.forEach((player) => {
        player.ordinal = idx;
        idx += 1;
      });

      if (this.activePlayer === username) {
        this.nextTurn();
      }
    }

    return this;
  }

  reRollDice() {
    return this.dice.reroll();
  }

  resetDiceRoll() {
    this.dice.resetRoll();
    return this;
  }

  rollDice() {
    this.phase = GamePhase.ROLL;
    return this.dice.roll();
  }

  setPlayerAnswers(username, answers) {
    const player = this.findPlayer(username);

    player.setAnswers(answers);

    this.players.set(username, player);

    return this.state.reduce((arr, p) => {
      if (p.answers.length === 0) {
        return arr;
      }

      return [
        ...arr,
        {
          username: p.username,
          answers: p.answers,
        },
      ];
    }, []);
  }

  setRound(round) {
    if (this.phase !== GamePhase.LIST) {
      this.round = round;
    }

    return this;
  }

  setScoresFromTallies(tallies) {
    Object.keys(tallies).forEach((username) => {
      console.log('tallying: username', username);

      const roundTallies = tallies[username];
      const player = this.findPlayer(username);

      console.log('tallying: state', this.state);
      console.log('tallying: player', player);

      if (player) {
        player.setScores.push(roundTallies);
        this.players.set(username, player);
      }
    });

    return this;
  }

  startGame() {
    this.gameInProgress = true;
    this.phase = GamePhase.ROLL;

    return this;
  }

  startTimer(cb) {
    if (this.inProg) {
      return this;
    }

    this.inProg = true;
    this.phase = GamePhase.LIST;
    this.roundInProgress = true;
    this.callback = cb;
    this.start = Date.now();
    this.end = this.start + TIMER_LEN;

    this.update();

    return this;
  }

  stopTimer() {
    if (this.numPlayers === 0) {
      this.phase = GamePhase.NOT_STARTED;
    } else {
      this.phase = GamePhase.VOTE;
    }

    this.start = 0;
    this.end = 0;
    this.inProg = false;
    this.callback = () => {};

    this.io.to(this.room).emit('round-ended', { round: this.round });

    return this;
  }

  talliesToScores(tallies, done) {
    this.setScoresFromTallies(tallies);

    this.roundTallies += 1;

    if (this.roundTallies === this.numPlayers) {
      this.phase = GamePhase.SCORES;

      this.calculateScores();

      this.roundTallies = 0;

      done();
    }

    return this;
  }

  unRegisterPhaseListener(key) {
    delete this.phaseListeners[key];
    return this;
  }

  update() {
    const now = Date.now();

    const remaining = this.end - now;

    if (remaining > 0) {
      this.callback(remaining);
      setTimeout(this.update, TIMER_INTERVAL);
    } else {
      this.callback(0);
      this.stopTimer();
    }
  }

  updatePlayer(player) {
    this.state.forEach((p) => {
      if (p.username === player.username) {
        player.setOrdinal(p.ordinal);
      }
    });

    if (player.ordinal === -1) {
      player.ordinal = this.numPlayers;
    }

    this.players.set(player.username, player);

    if (!this.activePlayer) {
      this.activePlayer = player.username;
    }

    return player;
  }
};
