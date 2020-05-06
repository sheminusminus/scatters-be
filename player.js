class Player {
  constructor(id, username) {
    this.id = id;
    this.username = username;
    this.init();
  }

  init() {
    this.score = 0;
    this.setScores = [];
    this.roundScores = [];
    this.turn = false;
    this.rerolls = 1;
    this.ordinal = -1;
    this.answers = [];
  }

  setAnswers(_answers) {
    this.answers = _answers;
  }

  setOrdinal(ordinal) {
    this.ordinal = ordinal;
  }
}

module.exports = Player;
