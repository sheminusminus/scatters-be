const shortId = require('shortid');

const Room = require('./room');


module.exports = class Manager {
  constructor() {
    this.rooms = new Map();
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

  findRoomById(id) {
    return this.state.find((room) => room.id === id);
  }

  findRoomsForPlayer(username) {
    return this.state.filter((room) => {
      const playerInRoom = room.findPlayer(username);
      return Boolean(playerInRoom);
    });
  }

  addPlayerToRoom(_room, id, username) {
    const room = this.findRoom(_room);
    room.addPlayer(id, username);
    this.rooms.set(_room, room);
  }

  removePlayerFromRoom(_room, id, username) {
    const room = this.findRoom(_room);
    room.removePlayer(id);
    this.rooms.set(_room, room);
  }

  get state() {
    return Array.from(this.rooms.values());
  }
};
