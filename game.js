const Dice = require('./dice');
const Timer = require('./timer');

const createPlayer = require('./playerPresence');

const SETS_PER_ROUND = 12;

const GamePhase = require('./constants').GamePhase;

module.exports = class Game {
  constructor(io, roomName) {
    this.io = io;
    this.players = new Map();
    this.playersAway = new Set();
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
    this.updatePlayer = this.updatePlayer.bind(this);
    this.getPlayersAway = this.getPlayersAway.bind(this);
    this.setPlayerAway = this.setPlayerAway.bind(this);
    this.setPlayerBack = this.setPlayerBack.bind(this);

    void this.init();
  }

  get activePlayer() {
    return this._activePlayer;
  }

  set activePlayer(newValue) {
    const lastActivePlayer = this.players.get(this._activePlayer);
    const player = this.players.get(newValue);

    if (lastActivePlayer) {
      lastActivePlayer.setRoomIsTurn(this.room, false);
      this.players.set(lastActivePlayer.username, lastActivePlayer);
    }

    if (player) {
      player.setRoomIsTurn(this.room, true);
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
    this._lastPhase = this._phase;
    this._phase = val;

    if (this._lastPhase !== this._phase) {
      Object.keys(this.phaseListeners).forEach((key) => {
        this.phaseListeners[key]({
          room: this.room,
        });
      });
    }
  }

  get state() {
    return [...this.players.values()];
  }

  get stateKeys() {
    return [...this.players.keys()];
  }

  get startTime() {
    return this.timer.startTime;
  }

  get endTime() {
    return this.timer.endTime;
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

      const setScores = player.getRoomSetScores(this.room);

      for (let i = 0; i < SETS_PER_ROUND; i += 1) {
        let setScore = 0;

        for (let j = 0; j < this.numPlayers; j += 1) {
          const score = setScores[j][i];
          setScore += score;
        }

        const answers = player.getRoomAnswers(this.room);

        if (setScore > 0) {
          let alliterationScore = 0;
          const answer = answers[i];

          if (answer) {
            const words = answer.split(' ');

            words.forEach((w, idx) => {
              const char = w[0];
              if (char && char.toLowerCase() === this.dice.value.toLowerCase() && idx > 0) {
                alliterationScore += 1;
              }
            });
          }

          roundScore += 1;
          roundScore += alliterationScore;
        }
      }

      player.pushRoomRoundScore(this.room, roundScore);
      player.incrRoomScore(this.room, roundScore);
      player.resetRoomSetScores(this.room);
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
    this.dice = new Dice();
    this.timer = new Timer();

    this._activePlayer = null;

    this._lastPhase = null;
    this._phase = GamePhase.NOT_STARTED;

    this.roundInProgress = false;
    this.gameInProgress = false;
    this.round = 0;
    this.roundTallies = 0;

    return this;
  }

  nextRound() {
    this.gameInProgress = false;
    this.roundInProgress = false;
    this.roundTallies = 0;
    this.phase = GamePhase.ROLL;

    this.round += 1;

    this.nextTurn();
    this.timer.reset();

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
        player.setRoomOrdinal(this.room, idx);
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

    player.setRoomAnswers(this.room, answers);

    this.players.set(username, player);

    return this.state.reduce((arr, p) => {
      const roomAnswers = p.getRoomAnswers(this.room);

      if (roomAnswers === 0) {
        return arr;
      }

      return [
        ...arr,
        {
          username: p.username,
          answers: roomAnswers,
        },
      ];
    }, []);
  }

  getPlayersAway() {
    return this.state.filter((player) => {
      return this.playersAway.has(player.username);
    });
  }

  setPlayerAway(username) {
    const player = this.findPlayer(username);

    if (player) {
      this.playersAway.add(username);
      player.setCurrentRoom(null);
      this.players.set(player.username, player);
    }
  }

  setPlayerBack(username) {
    const player = this.findPlayer(username);

    if (player) {
      this.playersAway.delete(player.username)
      player.setCurrentRoom(this.room);
      this.players.set(player.username, player);
    }
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
        player.pushRoomSetScores(this.room, roundTallies);
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

  startTimer(done) {
    this.phase = GamePhase.LIST;
    this.roundInProgress = true;

    this.timer.start((timeLeft) => {
      if (timeLeft === 0) {
        this.afterStopTimer();
      }
      done(timeLeft);
    });
  }

  stopTimer() {
    this.timer.stop();
  }

  afterStopTimer() {
    if (this.numPlayers === 0) {
      this.phase = GamePhase.NOT_STARTED;
    } else {
      this.phase = GamePhase.VOTE;
    }

    this.io.to(this.room).emit('round-ended', { round: this.round });
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

  updatePlayer(player) {
    this.state.forEach((p) => {
      if (p.username === player.username) {
        const roomOrdinal = p.getRoomOrdinal(this.room);
        if (roomOrdinal) {
          player.setRoomOrdinal(this.room, roomOrdinal);
        }
      }
    });

    if (player.getRoomOrdinal(this.room) === -1) {
      player.setRoomOrdinal(this.room, this.numPlayers);
    }

    this.players.set(player.username, player);

    if (!this.activePlayer) {
      this.activePlayer = player.username;
    }

    return player;
  }
};
