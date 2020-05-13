const fetch = require('node-fetch');


module.exports = class Notifs {
  constructor() {
    this.tokens = new Map();
  }

  setToken(username, token) {
    this.tokens.set(username, token);
  }

  async sendNotification(username, title, body) {
    console.log(username, title, body);
    const token = this.tokens.get(username);

    const data = {
      to: token,
      title,
      body,
    };

    fetch('https://exp.host/--/api/v2/push/send', {
      method: 'post',
      body:    JSON.stringify(data),
      headers: {
        'accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        accept: 'application/json',
        host: 'exp.host',
      },
    }).then(res => res.json()).then(json => console.log(json));
  }
}
