const moment = require('moment');


const INTERVAL = 2000;
const MAX = 4000;

module.exports = class Presence {
  constructor() {
    this.users = new Map();

    this.addPlayer = this.addPlayer.bind(this);
    this.listAllPlayers = this.listAllPlayers.bind(this);
    this.listAllPlayerNames = this.listAllPlayerNames.bind(this);
    this.checkUsersStatus = this.checkUsersStatus.bind(this);
    this.listOnlinePlayers = this.listOnlinePlayers.bind(this);
    this.setCheckUsersStatusInterval = this.setCheckUsersStatusInterval.bind(this);

    this.interval = this.setCheckUsersStatusInterval();
  }

  get state() {
    return [...this.users.values()];
  }

  get stateKeys() {
    return [...this.users.keys()];
  }

  addPlayer(player) {
    this.users.set(player.username, {
      player,
      isOnline: true,
    });
  }

  listAllPlayers() {
    return this.state.map(({ player }) => player);
  }

  listAllPlayerNames() {
    return this.stateKeys;
  }

  listOnlinePlayers() {
    return this.state
      .filter(({ isOnline }) => isOnline)
      .map(({ player }) => player);
  }

  checkUsersStatus() {
    const now = moment();

    this.users.forEach((user) => {
      const { player } = user;

      const diff = Math.abs(now.diff(moment(player.lastSeen), 'seconds'));

      const isOnline = diff <= MAX;

      this.users.set(player.username, {
        player,
        isOnline,
      });
    });

    this.interval = this.setCheckUsersStatusInterval();
  }

  setCheckUsersStatusInterval() {
    return setTimeout(this.checkUsersStatus, INTERVAL);
  }
};
