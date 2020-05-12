const moment = require('moment');

const Player = require('./player');


const IGNORE_PROPS = ['isOnline', 'lastSeen'];

const onChange = (object, onChange) => {
  const handler = {
    set(target, property, value) {
      const shouldHandle = !IGNORE_PROPS.includes(property);

      if (shouldHandle) {
        onChange(property, value);
      }

      return Reflect.set(...arguments);
    },
  };

  return new Proxy(object, handler);
};

module.exports = (username) => {
  const player = new Player(username);

  const handleChange = (property, value) => {
    console.log('player change detected', player, property, value);

    if (!player.isOnline) {
      console.log('setting isOnline from change on:', property);
      player.setIsOnline(true);
      player.setLastSeen(moment().format());
    }
  };

  return onChange(player, handleChange);
};
