const moment = require('moment');

const { MessageStatus } = require('./constants');


module.exports = class Message {
  constructor(from, text, timestamp, status) {
    this.from = from;
    this.text = text;
    this.created = timestamp;
    this.delivered = null;
    this.status = status;
  }

  updateStatus(status) {
    this.status = status;
    if (this.isDelivered()) {
      this.delivered = moment().format();
    }
  }

  isQueued() {
    return this.status === MessageStatus.QUEUED;
  }

  isDelivered() {
    return this.status === MessageStatus.DELIVERED;
  }

  isFailed() {
    return this.status === MessageStatus.FAILED;
  }
};
