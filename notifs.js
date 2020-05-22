const fetch = require('node-fetch');

const { pushNotifServiceUrl } = require('./constants');


module.exports = class Notifs {
  sendNotification(tokens, username, title, body, data) {
    console.log(username, title, body, data);

    return new Promise((resolve, reject) => {
      const token = tokens.getToken(username);

      if (token && username && title && body) {
        const { room, id: manifestId, incrementBadge } = data;

        const notifData = {
          body,
          data: { room, incrementBadge: incrementBadge || 0 },
          title,
          to: token,
          _category: `${manifestId}:roomInvite`,
        };

        fetch(pushNotifServiceUrl, {
          method: 'post',
          body:    JSON.stringify(notifData),
          headers: {
            'accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
            accept: 'application/json',
            host: 'exp.host',
          },
        }).then(res => res.json()).then(json => resolve(json)).catch((err) => reject(err));
      }
    });
  }

  sendMessageNotification(tokens, username, title, body, room) {
    console.log(username, title, body, room);

    return new Promise((resolve, reject) => {
      const token = tokens.getToken(username);

      console.log(token, username);
      if (token && username && title && body) {
        const notifData = {
          body,
          data: { room, incrementBadge: 1 },
          title,
          to: token,
        };

        fetch(pushNotifServiceUrl, {
          method: 'post',
          body:    JSON.stringify(notifData),
          headers: {
            'accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
            accept: 'application/json',
            host: 'exp.host',
          },
        }).then(res => res.json()).then(json => resolve(json)).catch((err) => reject(err));
      }
    });
  }
}
