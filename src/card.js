let results = require('./result.js')

const CardInfo = {
  punch: {
    dmg: 50,
    type: 'close'
  },
  kick: {
    dmg: 60,
    type: 'close'
  },
  spirit: {
    dmg: 80,
    type: 'remote'
  },
  throw: {
    dmg: 70,
    type: 'remote'
  },
  anger: {
    dmg: 100,
    type: 'remote'
  },
  break: {
    dmg: 120,
    type: 'close'
  },
  lvlup: {
    dmg: 0,
    type: 'lvlup'
  },
  harden: {
    dmg: 0,
    type: 'defend'
  },
  tackle: {
    dmg: 80,
    type: 'close'
  },
  lure: {
    dmg: 0,
    type: 'defend'
  },
  dream: {
    dmg: 0,
    type: 'special'
  }
}

const CardNames = Object.keys(CardInfo)

class Card {
  constructor() {
    this.name = CardNames[Math.floor(Math.random() * CardNames.length)]
    this.atk = Math.floor(Math.random() * 10 + 1)
    this.dfs = Math.floor(Math.random() * 10 + 1)
  }

  getBaseDamage() {
    return CardInfo[this.name].dmg
  }

  getType() {
    return CardInfo[this.name].type
  }

  doEffect(owner, oppo) {
    // do card effects
    if (this.name === 'break') {
      if (oppo.card !== undefined && oppo.card.name === 'harden') {
        oppo.setCond('blocked', {round: 1, num: 2})
      }
    } else if (this.name === 'lvlup') {
      owner.levelUp(1)
    } else if (this.name === 'tackle') {
      if (oppo.card !== undefined && oppo.card.name === 'harden') {
        oppo.levelDown(1)
      }
    }
  }
}

module.exports = {
  Card
}