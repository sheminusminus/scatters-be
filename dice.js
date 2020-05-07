const VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W'];

class Dice {
  constructor() {
    this.availableValues = [...VALUES];
    this.value = null;
  }

  roll() {
    if (this.availableValues.length === 0) {
      this.availableValues = [...VALUES];
    }

    if (this.availableValues.length === 1) {
      this.value = this.availableValues[0];
      this.availableValues = [];
      return;
    }

    const valueIndex = Math.floor(Math.random() * this.availableValues.length);
    const value = this.availableValues[valueIndex];
    const i = this.availableValues.indexOf(value);
    this.availableValues = [
      ...this.availableValues.slice(0, i),
      ...this.availableValues.slice(i + 1),
    ];

    this.value = value;

    return value;
  }

  reroll() {
    this.availableValues.push(this.value);
    this.value = null;
    return this.roll();
  }

  resetRoll() {
    this.availableValues.push(this.value);
    this.value = null;
  }
}

module.exports = Dice;
