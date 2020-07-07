// const TIMER_MIN = 3;
// const TIMER_MIN = 0.5;
const TIMER_MIN = 0.2;
const TIMER_LEN = TIMER_MIN * 60 * 1000;
const TIMER_INTERVAL = 250;

module.exports = class Timer {
  constructor() {
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this._update = this._update.bind(this);

    this._init();
  }

  _init() {
    this._inProg = false;
    this._startTime = 0;
    this._endTime = 0;
    this._callback = null;
    this._timeout = null;

    return this;
  }

  _fire(timeRemaining) {
    if (this._callback) {
      this._callback(timeRemaining);
    }
  }

  _update() {
    const now = Date.now();

    const remaining = this._endTime - now;

    if (remaining > 0) {
      this._fire(remaining);
      this._timeout = setTimeout(this._update, TIMER_INTERVAL);
    } else {
      this._fire(0);
      this.stop();
    }
  }

  reset() {
    this._init();
  }

  start(done) {
    if (this._inProg) {
      return;
    }

    this._inProg = true;

    this._startTime = Date.now();
    this._endTime = this._startTime + TIMER_LEN;

    this._callback = done;
    this._update();
  }

  stop() {
    clearTimeout(this._timeout);
    this._init();
  }

  get startTime() {
    return this._startTime;
  }

  get endTime() {
    return this._endTime;
  }

  get inProgress() {
    return this._inProg;
  }
};
