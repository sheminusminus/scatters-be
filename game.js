const Dice = require('./dice');
const Player = require('./player');

// const TIMER_MIN = 3;
// const TIMER_MIN = 0.5;
const TIMER_MIN = 0.2;
const TIMER_LEN = TIMER_MIN * 60 * 1000;
const SETS_PER_ROUND = 12;

const GameStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PRE_ROLL: 'PRE_ROLL',
  ROLLING: 'ROLLING',
  SCORES: 'SCORES',
  TIMER_ACTIVE: 'TIMER_ACTIVE',
  VOTING: 'VOTING',
};

module.exports = class Game {
  constructor(io, roomName) {
    this.io = io;
    this.players = new Map();
    this.room = roomName;
    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.startGame = this.startGame.bind(this);
    this.endGame = this.endGame.bind(this);
    this.addPlayer = this.addPlayer.bind(this);
    this.findPlayer = this.findPlayer.bind(this);
    this.findPlayerById = this.findPlayerById.bind(this);
    this.removePlayer = this.removePlayer.bind(this);
    this.updatePlayer = this.updatePlayer.bind(this);
    this.nextTurn = this.nextTurn.bind(this);
    this.rollDice = this.rollDice.bind(this);
    this.setPlayerAnswers = this.setPlayerAnswers.bind(this);
    this.resetDiceRoll = this.resetDiceRoll.bind(this);
    this.talliesToScores = this.talliesToScores.bind(this);
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
    this.status = 'NOT_STARTED';
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
  }

  endGame() {
    this.init();
  }

  startGame() {
    this.gameInProgress = true;
  }

  update() {
    const now = Date.now();

    const remaining = this.end - now;

    if (remaining > 0) {
      console.log('remaining', remaining);
      this.callback(remaining);
      setTimeout(this.update, 1000);
    } else {
      console.log('buzz!!', remaining);
      this.callback(0);
      this.stopTimer();
    }
  }

  stopTimer() {
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

    if (!this.activePlayer || !this.findPlayerById(id)) {
      this.activePlayer = id;
    }
  }

  unwaitAllPlayers() {
    this.players.forEach((player) => {
      player.setWaiting(false);
      this.players.set(player.id, player);
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
      const roundTallies = tallies[playerId];
      const player = this.findPlayerById(playerId);
      player.setScores.push(roundTallies);
    });

    this.roundTallies += 1;

    if (this.roundTallies === this.numPlayersNotWaiting) {
      this.playersNotWaiting.forEach((player) => {
        let roundScore = 0;

        for (let i = 0; i < SETS_PER_ROUND; i += 1) {
          let setScore = 0;

          for (let j = 0; j < this.numPlayersNotWaiting; j += 1) {
            const score = player.setScores[j][i];
            setScore += score;
          }
          if (setScore > 0) {
            roundScore += 1;
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

  get state() {
    return [...this.players.values()];
  }
};
