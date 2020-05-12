const moment = require('moment');

const Player = require('./player');


const onChange = (object, onChange) => {
  const handler = {
    get(target, property, receiver) {
      try {
        return new Proxy(target[property], handler);
      } catch (err) {
        return Reflect.get(target, property, receiver);
      }
    },
    defineProperty(target, property, descriptor) {
      onChange();
      return Reflect.defineProperty(target, property, descriptor);
    },
    deleteProperty(target, property) {
      onChange();
      return Reflect.deleteProperty(target, property);
    },
  };

  return new Proxy(object, handler);
};

module.exports = (username, afterChange) => {
  const player = new Player(username);

  return onChange(player, () => {
    player.lastSeen = moment().format();

    if (afterChange) {
      afterChange();
    }
  });
};
