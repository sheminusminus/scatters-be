const moment = require('moment');


module.exports = class Invitations {
  constructor() {
    this.invitesTo = new Map();
    this.invitesFrom = new Map();

    this.addInvite = this.addInvite.bind(this);
    this.setInvitesFrom = this.setInvitesFrom.bind(this);
    this.setInvitesTo = this.setInvitesTo.bind(this);
  }

  setInvitesTo(from, to, room) {
    const received = this.invitesTo.get(to);

    const newReceived = {
      [room]: {
        from,
        room,
        time: moment().format(),
        notified: false,
      },
    };

    if (received) {
      const nextReceived = {
        ...received,
        ...newReceived,
      };
      this.invitesTo.set(to, nextReceived);
    } else {
      this.invitesTo.set(to, newReceived);
    }
  }

  setInvitesFrom(from, to, room) {
    const sent = this.invitesFrom.get(from);

    const newSent = {
      [`${room}-${to}`]: {
        to,
        room,
        time: moment().format(),
      },
    };

    if (sent) {
      const nextSent = {
        ...sent,
        ...newSent,
      };
      this.invitesFrom.set(from, nextSent);
    } else {
      this.invitesFrom.set(from, newSent);
    }
  }

  addInvite(from, to, room) {
    this.setInvitesFrom(from, to, room);
    this.setInvitesTo(from, to, room);
  }
};
