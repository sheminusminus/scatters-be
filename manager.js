const shortId = require('shortid');

const Room = require('./room');

const { RoomVisibility, RoomType } = require('./constants');


module.exports = class Manager {
  constructor(presence) {
    this.presence = presence;
    this.rooms = new Map();
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

  getAllRooms(includePrivate = true) {
    if (includePrivate) {
      return this.state;
    }

    return this.state.filter((room) => room.visibility === RoomVisibility.PUBLIC);
  }

  listAllRooms(includePrivate = false) {
    const allRooms = this.state.map((room) => room.getData(true));

    if (includePrivate) {
      return allRooms;
    }

    return allRooms.filter((room) => room.visibility === RoomVisibility.PUBLIC);
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

  createRoom(
    io,
    name,
    creator,
    type = RoomType.REALTIME,
    visibility = RoomVisibility.PUBLIC,
  ) {
    const room = new Room(io, name, creator, type, visibility);

    this.rooms.set(name, room);

    console.log('all rooms', this.rooms);
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

    if (player) {
      this.presence.addUser(player);
      this.rooms.set(roomName, room);
      return player;
    }

    return false;
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
