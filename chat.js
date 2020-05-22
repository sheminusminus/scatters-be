const moment = require('moment');

const { MessageStatus } = require('./constants');

const Message = require('./message');
const Notifs = require('./notifs');


const notifs = new Notifs();

module.exports = class Chat {
  constructor(roomName) {
    this.room = roomName;
    this.usernames = [];
    this.messages = [];
    this.interval = null;
  }

  async update(tokens) {
    await this.deliverMessageQueue(tokens);
  }

  addMessage(from, text, tokens) {
    const message = new Message(from, text, moment().format(), MessageStatus.QUEUED);
    this.messages.push(message);
    this.update(tokens).then(() => console.log('delivered things?'));
  }

  addPlayer(username) {
    this.usernames.push(username);
  }

  getQueuedMessages() {
    return this.messages.filter((message) => message.isQueued());
  }

  getTranscript() {
    return this.messages.reduce((all, message) => {
      if (message.isDelivered()) {
        return [...all, {
          from: message.from,
          timestamp: message.delivered,
          text: message.text,
        }];
      }

      return all;
    }, []);
  }

  async deliverMessageQueue(tokens) {
    await this.getQueuedMessages().reduce(async (promise, message) => {
      await promise;

      message.updateStatus(MessageStatus.DELIVERED);

      const from = message.from;

      await this.usernames.reduce(async (promise2, uN) => {
        await promise2;

        try {
          const result = await notifs.sendMessageNotification(
            tokens,
            uN,
            `Message in ${this.room} from ${from}`,
            message.text,
            this.room,
          );
          console.log(result);
        } catch (err) {
          console.log(err);
          message.updateStatus(MessageStatus.FAILED);
        }
      }, Promise.resolve());
    }, Promise.resolve());
  }
};
