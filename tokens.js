class Tokens {
  constructor() {
    this.tokens = new Map();
  }

  setToken(username, token) {
    this.tokens.set(username, token);
  }

  getToken(username) {
    return this.tokens.get(username);
  }
}

const tokens = new Tokens();

module.exports = tokens;
