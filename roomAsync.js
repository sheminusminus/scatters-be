const Game = require('./game');
const Room = require('./room');

const { RoomType, RoomVisibility } = require('./constants');


module.exports = class RoomAsync extends Room {
  constructor(params) {
    super(params);
    this.game = null;
    this._type = RoomType.ASYNC;
    this._playerGames = new Map();
  }

  addPlayer(username, socket) {
    const player = super.addPlayer(username);
    const game = new Game(socket, this.name);
    this._playerGames.set(player.username, game);
    return player;
  }
};
