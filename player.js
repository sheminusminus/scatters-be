const moment = require('moment');


class Player {
  constructor(username) {
    this.init(username);
    this.setAnswers = this.setAnswers.bind(this);
    this.setOrdinal = this.setOrdinal.bind(this);
  }

  init(username) {
    this.username = username;
    this.answers = [];
    this.ordinal = -1;
    this.rerolls = 1;
    this.roundScores = [];
    this.score = 0;
    this.setScores = [];
    this.isTurn = false;
    this.lastSeen = moment().format();
  }

  setAnswers(_answers) {
    this.answers = _answers;
    return this;
  }

  setOrdinal(ordinal) {
    this.ordinal = ordinal;
    return this;
  }
}

module.exports = Player;
