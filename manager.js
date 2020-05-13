const shortId = require('shortid');

const createPlayer = require('./playerPresence');

const Room = require('./room');


module.exports = class Manager {
  constructor(presence) {
    this.presence = presence;
    this.rooms = new Map();
    // this.players = new Map();
    this.allPlayersSeen = new Set();
  }

  get state() {
    return [...this.rooms.values()];
  }

  get stateKeys() {
    return [...this.rooms.keys()];
  }

  recordPlayer(username) {
    this.allPlayersSeen.add(username);
  }

  listAllRooms() {
    return this.state.map((room) => room.getData(true));
  }

  listRoomsExcluding(excludedRooms = []) {
    const excludedNames = excludedRooms.map(r => r.name);
    const all = this.listAllRooms();
    console.log('all rooms', all);
    return all.filter((room) => !excludedNames.includes(room.name));
  }

  listAllPlayers() {
    return Array.from(this.allPlayersSeen);
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
    }).map((room) => room.getData(true));
  }

  addPlayerToRoom(roomName, username) {
    const room = this.findRoom(roomName);
    const player = room.addPlayer(username);
    this.presence.addUser(player);
    this.rooms.set(roomName, room);
    return player;
  }

  removePlayerFromRoom(roomName, username) {
    const room = this.findRoom(roomName);
    room.removePlayer(username);
    this.rooms.set(roomName, room);
  }

  setPlayerOffline() {

  }

  getPlayersAway(roomName) {
    const room = this.findRoom(roomName);
    room.getPlayersAway();
  }

  setPlayerAway(roomName, username) {
    const room = this.findRoom(roomName);
    room.setPlayerAway(username);
  }

  setPlayerBack(roomName, username) {
    const room = this.findRoom(roomName);
    room.setPlayerBack(username);
  }
};
