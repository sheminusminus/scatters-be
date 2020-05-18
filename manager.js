const Room = require('./room');
const RoomAsync = require('./roomAsync');

const getOrCreatePlayer = require('./playerPresence');

const { RoomType, RoomVisibility } = require('./constants');


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

  createRoom(params) {
    const { name, type } = params;

    let room;

    if (type === RoomType.ASYNC) {
      room = new RoomAsync(params);
    } else {
      room = new Room(params);
    }

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

  findOrCreatePlayer(username) {
    const player = getOrCreatePlayer(username);
    this.recordPlayer(username);
    return player;
  }

  addPlayerToRoom(roomName, username) {
    const room = this.findRoom(roomName);

    let player;

    if (room) {
      player = room.addPlayer(username);
    } else {
      player = getOrCreatePlayer(username);
    }

    if (player) {
      this.presence.addUser(player);

      if (room) {
        this.rooms.set(roomName, room);
      }

      return player.getDataForRoom(roomName, true);
    }

    return false;
  }

  removePlayerFromRoom(roomName, username) {
    const room = this.findRoom(roomName);

    if (room) {
      room.removePlayer(username);
      this.rooms.set(roomName, room);
    }
  }

  setPlayerOffline() {

  }

  getPlayersAway(roomName) {
    const room = this.findRoom(roomName);
    if (room) {
      room.getPlayersAway();
    }
  }

  setPlayerAway(roomName, username) {
    const room = this.findRoom(roomName);
    if (room) {
      room.setPlayerAway(username);
    }
  }

  setPlayerBack(roomName, username) {
    const room = this.findRoom(roomName);
    if (room) {
      room.setPlayerBack(username);
    }
  }
};
