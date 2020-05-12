const moment = require('moment');


class Player {
  constructor(username) {
    this.init = this.init.bind(this);

    this.setAnswers = this.setAnswers.bind(this);
    this.setIsOnline = this.setIsOnline.bind(this);
    this.setLastSeen = this.setLastSeen.bind(this);
    this.setOrdinal = this.setOrdinal.bind(this);

    this.init(username);
  }

  init(username) {
    this.username = username;
    this.answers = [];
    this.isOnline = true;
    this.isTurn = false;
    this.lastSeen = moment().format();
    this.ordinal = -1;
    this.rerolls = 1;
    this.roundScores = [];
    this.score = 0;
    this.setScores = [];
  }

  setAnswers(answers) {
    this.answers = answers;
    return this;
  }

  setIsOnline(isOnline) {
    this.isOnline = isOnline;
    return this;
  }

  setLastSeen(lastSeen) {
    this.lastSeen = lastSeen;
    return this;
  }

  setOrdinal(ordinal) {
    this.ordinal = ordinal;
    return this;
  }
}


module.exports = Player;
