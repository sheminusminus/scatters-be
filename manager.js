const shortId = require('shortid');

const Room = require('./room');


module.exports = class Manager {
  constructor(presence) {
    this.presence = presence;
    this.rooms = new Map();
    this.players = new Map();
  }

  get state() {
    return [...this.rooms.values()];
  }

  get stateKeys() {
    return [...this.rooms.keys()];
  }

  recordPlayer(player) {
    this.players.set(player.username, player);
  }

  listAllPlayers() {
    return [...this.players.values()];
  }

  listAllPlayerNames() {
    return [...this.players.keys()];
  }

  listPlayersInRoom(roomName) {
    const room = this.rooms.get(roomName);

    if (room) {
      return room.state;
    }

    return undefined;
  }

  createRoom(io, name) {
    const roomId = shortId.generate();
    const room = new Room(io, name, roomId);

    this.rooms.set(name, room);

    return room;
  }

  deleteRoom(name) {
    this.rooms.delete(name);
  }

  findRoom(name) {
    return this.rooms.get(name);
  }

  findRoomsForPlayer(username) {
    return this.state.filter((room) => {
      const playerInRoom = room.findPlayer(username);
      return Boolean(playerInRoom);
    }).reduce((obj, room) => ({
      ...obj,
      [room.name]: room.name,
    }), {});
  }

  addPlayerToRoom(roomName, username) {
    const room = this.findRoom(roomName);
    const player = room.addPlayer(username);
    this.presence.addPlayer(player);
    this.rooms.set(roomName, room);
  }

  removePlayerFromRoom(roomName, username) {
    const room = this.findRoom(roomName);
    room.removePlayer(username);
    this.rooms.set(roomName, room);
  }
};
