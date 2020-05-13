const moment = require('moment');


class Player {
  constructor(username) {
    this.init = this.init.bind(this);

    this.getRoomAnswers = this.getRoomAnswers.bind(this);
    this.getRoomIsTurn = this.getRoomIsTurn.bind(this);
    this.getRoomOrdinal = this.getRoomOrdinal.bind(this);
    this.getRoomRoundScore = this.getRoomRoundScore.bind(this);
    this.getRoomScore = this.getRoomScore.bind(this);
    this.getRoomSetScores = this.getRoomSetScores.bind(this);
    this.incrRoomScore = this.incrRoomScore.bind(this);
    this.pushRoomRoundScore = this.pushRoomRoundScore.bind(this);
    this.pushRoomSetScores = this.pushRoomSetScores.bind(this);
    this.resetRoomSetScores = this.resetRoomSetScores.bind(this);
    this.setIsOnline = this.setIsOnline.bind(this);
    this.setLastSeen = this.setLastSeen.bind(this);
    this.setRoomAnswers = this.setRoomAnswers.bind(this);
    this.setRoomIsTurn = this.setRoomIsTurn.bind(this);
    this.setRoomOrdinal = this.setRoomOrdinal.bind(this);
    this.setRoomRoundScore = this.setRoomRoundScore.bind(this);
    this.getDataForRoom = this.getDataForRoom.bind(this);
    this.setCurrentRoom = this.setCurrentRoom.bind(this);
    this.getCurrentRoom = this.getCurrentRoom.bind(this);

    this.init(username);
  }

  init(username) {
    this.username = username;
    this.isOnline = true;
    this.lastSeen = moment().format();

    this.currentRoom = null;

    this._roomOrdinals = {};
    this._roomIsTurns = {};
    this._roomAnswers = {};
    this._roomSetScores = {};
    this._roomRoundScores = {};
    this._roomScores = {};
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  setCurrentRoom(room) {
    this.currentRoom = room;
  }

  getDataForRoom(room, serializable = false) {
    const baseData = {
      answers: this.getRoomAnswers(room),
      currentRoom: this.currentRoom,
      isOnline: this.isOnline,
      isTurn: this.getRoomIsTurn(room),
      lastSeen: this.lastSeen,
      ordinal: this.getRoomOrdinal(room),
      roundScores: this.getRoomRoundScore(room),
      score: this.getRoomScore(room),
      setScores: this.getRoomSetScores(room),
      username: this.username,
    };

    if (serializable) {
      return baseData;
    }

    return {
      ...this,
      ...baseData,
    };
  }

  setRoomRoundScore(room, roundScores) {
    this._roomRoundScores[room] = roundScores;
    return this.getRoomRoundScore(room);
  }

  pushRoomRoundScore(room, roundScore) {
    if (!Array.isArray(this._roomRoundScores[room])) {
      this._roomRoundScores[room] = [];
    }

    this._roomRoundScores[room].push(roundScore);

    return this.getRoomRoundScore(room);
  }

  getRoomRoundScore(room) {
    return this._roomRoundScores[room] || 0;
  }

  setRoomAnswers(room, answers) {
    this._roomAnswers[room] = answers;
    return this.getRoomAnswers(room);
  }

  getRoomAnswers(room) {
    return this._roomAnswers[room] || [];
  }

  setRoomIsTurn(room, isTurn) {
    this._roomIsTurns[room] = isTurn;
    return this.getRoomIsTurn(room);
  }

  getRoomIsTurn(room) {
    return Boolean(this._roomIsTurns[room]);
  }

  setRoomOrdinal(room, ordinal) {
    this._roomOrdinals[room] = ordinal;
    return this.getRoomOrdinal(room);
  }

  getRoomOrdinal(room) {
    if (this._roomOrdinals[room] || this._roomOrdinals[room] === 0) {
      return this._roomOrdinals[room];
    }

    return -1;
  }

  setIsOnline(isOnline) {
    this.isOnline = isOnline;
    return this;
  }

  setLastSeen(lastSeen) {
    this.lastSeen = lastSeen;
    return this;
  }

  incrRoomScore(room, byValue) {
    if (!this._roomScores[room] && this._roomScores[room] !== 0) {
      this._roomScores[room] = 0;
    }
    this._roomScores[room] += byValue;
    return this.getRoomScore(room);
  }

  getRoomScore(room) {
    return this._roomScores[room] || 0;
  }

  resetRoomSetScores(room) {
    this._roomSetScores[room] = [];
    return this.getRoomSetScores(room);
  }

  pushRoomSetScores(room, setScores) {
    if (!Array.isArray(this._roomSetScores[room])) {
      this._roomSetScores[room] = [];
    }
    this._roomSetScores[room].push(setScores);
    return this.getRoomSetScores(room);
  }

  getRoomSetScores(room) {
    return this._roomSetScores[room] || [];
  }
}


module.exports = Player;
