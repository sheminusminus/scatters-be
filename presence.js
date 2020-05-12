const moment = require('moment');

const INTERVAL_MIN = 3;
const INTERVAL = INTERVAL_MIN * 60 * 1000;
const MAX_MIN = 5;
const MAX = MAX_MIN * 60 * 1000;

module.exports = class Presence {
  constructor() {
    this.users = new Map();

    this.addUser = this.addUser.bind(this);
    this.checkUsersStatus = this.checkUsersStatus.bind(this);
    this.listAllUserNames = this.listAllUserNames.bind(this);
    this.listAllUsers = this.listAllUsers.bind(this);
    this.listOnlineUsers = this.listOnlineUsers.bind(this);
    this.setCheckUsersStatusInterval = this.setCheckUsersStatusInterval.bind(this);

    this.interval = this.setCheckUsersStatusInterval();
  }

  get state() {
    return [...this.users.values()];
  }

  get stateKeys() {
    return [...this.users.keys()];
  }

  addUser(user) {
    this.users.set(user.username, user);
  }

  listAllUsers() {
    return this.state.map((user) => user);
  }

  listAllUserNames() {
    return this.stateKeys;
  }

  listOnlineUsers() {
    return this.state
      .filter((user) => user.isOnline)
      .map((user) => user);
  }

  checkUsersStatus() {
    const now = moment();

    this.users.forEach((user) => {
      const diff = Math.abs(now.diff(moment(user.lastSeen), 'seconds'));

      const isOnline = Boolean(diff <= MAX && user.socket);

      if (isOnline !== user.isOnline) {
        user.setIsOnline(isOnline);
        this.users.set(user.username, user);
      }
    });

    this.interval = this.setCheckUsersStatusInterval();
  }

  setCheckUsersStatusInterval() {
    return setTimeout(this.checkUsersStatus, INTERVAL);
  }
};
