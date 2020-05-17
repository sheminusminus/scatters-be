const Game = require('./game');

const { GameType } = require('./constants');


module.exports = class AsyncGame extends Game {
  constructor(io, roomName) {
    super(io, roomName);
    this.type = GameType.ASYNC;
  }
};
