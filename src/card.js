const TYPES = [
  'punch',
  'kick',
  'spirit',
  'throw',
  'anger',
  'break',
  'lvlup',
  'catch',
  'harden',
  'tackle',
  'lure',
  'dream'
]

class Card {
  constructor() {
    this.name = TYPES[Math.floor(Math.random() * TYPES.length)]
    this.atk = Math.floor(Math.random() * 10 + 1)
    this.dfs = Math.floor(Math.random() * 10 + 1)
  }

  isDefense() {
    return ['catch', 'harden', 'lure'].includes(this.name)
  }

  isClose() {
    return ['punch', 'kick', 'tackle']
  }
}

module.exports = {
  Card
}