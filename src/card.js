const { CardInfo, CardNames, SpellInfo } = require('./cardinfo.js')

class Card {
  constructor(name, atk, dfs, subcards) {
    this.name = name ? name : CardNames[Math.floor(Math.random() * CardNames.length)]
    this.atk = atk ? atk : Math.floor(Math.random() * 10 + 1)
    this.dfs = dfs ? dfs : Math.floor(Math.random() * 10 + 1)
    this.isSpell = !CardNames.includes(this.name)
    this.info = this.isSpell ? SpellInfo[this.name] : CardInfo[this.name]
    this.tag = this.isSpell ? '' : this.info.tag
    this.subcards = subcards ? subcards : (this.isSpell ? [] : [this.name])
  }

  serialize() {
    return {
      name: this.name,
      atk: this.atk,
      dfs: this.dfs
    }
  }

  getBaseDamage() {
    return this.info.dmg
  }

  getType() {
    return this.info.type ? this.info.type : 'remote'
  }

  setAtk(num) {
    this.atk = num
  }

  doEffect(owner, oppo, crit, results) {
    // do card effects
    if (this.isSpell) {
      if (this.info.effect !== undefined) {
        return this.info.effect(owner, oppo, crit, results)
      }
    }
    if (this.name === 'break') {
      if (oppo.card !== undefined && oppo.card.name === 'harden') {
        oppo.setCond('blocked', {round: 1, num: 2}, results)
        return ['blocked']
      }
    } else if (this.name === 'lvlup') {
      owner.levelUp(1, results)
      return ['lvlup']
    } else if (this.name === 'tackle') {
      if (oppo.card !== undefined && oppo.card.name === 'harden') {
        oppo.levelDown(1, results)
        return ['lvldown']
      }
    }
    return []
  }
}

const CommonSpells = [
  {
    name: ['Kaisei'],
    group: /^bcs/
  },
  {
    name: ['Kaminagi'],
    group: /^sal/
  },
  {
    name: ['Typhoon'],
    group: /^acc/
  },
  {
    name: ['Fate'],
    group: /^bul/
  }
]

module.exports = {
  Card,
  CommonSpells
}