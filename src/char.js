const util = require('./util.js')
const { CommonSpells } = require('./card.js')

class Char {
  constructor(name, basehp, sc) {
    this.name = name
    this.hp = this.basehp = basehp
    this.sc = sc
    this.allsc = this.sc.concat(CommonSpells)
    this.handcards = []
    this.maxcards = 7
    this.uselimit = 5
    this.use = []
    this.card = undefined
    this.conds = {}
    this.sealed = []
    this.lvl = 1
    this.unavaillist = []
    this.oppo = undefined
  }

  serialize() {
    return {
      name: this.name,
      hp: this.hp,
      basehp: this.basehp,
      handcards: this.handcards.map(card => card.serialize()),
      uselimit: this.getUseLimit(),
      conds: this.conds,
      lvl: this.lvl
    }
  }

  dead() {
    return this.hp <= 0
  }

  sufferDamage(dmg, results) {
    this.hp -= dmg
    results.push({
      'content': 'damage',
      'args': {
        'player': this.name,
        'num': dmg
      }
    })
    if (this.hp < 0) {
      this.hp = 0
    }
    results.push({
      'content': 'hpchange-result',
      'args': {
        'player': this.name,
        'num': this.hp
      }
    })
  }

  recover(num, results) {
    this.hp += num
    results.push({
      'content': 'recover',
      'args': {
        'player': this.name,
        num
      }
    })
    if (this.hp > this.basehp) {
      this.hp = this.basehp
    }
    results.push({
      'content': 'hpchange-result',
      'args': {
        'player': this.name,
        'num': this.hp
      }
    })
  }

  hasCond(cond) {
    return Object.keys(this.conds).includes(cond)
  }

  hasClearableCond(cond) {
    return this.hasCond(cond) && this.conds[cond].round === 0
  }

  setCond(cond, args, results, add) {
    if (add && this.hasCond(cond)) {
      for (let key in args) {
        if (add.includes(key)) {
          this.conds[cond][key] += args[key]
        } else {
          this.conds[cond][key] = args[key]
        }
      }
    } else {
      this.conds[cond] = {}
      for (let key in args) {
        this.conds[cond][key] = args[key]
      }
    }
    args.player = this.name
    if (results && !cond.startsWith('#')) {
      results.push({
        content: 'set-cond-' + cond.split('@')[0],
        args
      })
    }
  }

  clearCond(cond, results) {
    if (!Object.keys(this.conds).includes(cond)) {
      return
    }
    delete this.conds[cond]
    if (results && !cond.startsWith('#')) {
      results.push({
        content: 'clear-cond',
        args: {
          player: this.name,
          cond: cond.split('@')[0]
        }
      })
    }
  }

  levelUp(num, results) {
    this.lvl += num
    if (this.lvl > 3) {
      this.lvl = 3
    }
    if (results) {
      results.push({
        content: 'lvlup',
        args: {
          player: this.name,
          num: num
        }
      })
      results.push({
        content: 'lvlchange-result',
        args: {
          player: this.name,
          num: this.lvl
        }
      })
    }
  }

  levelDown(num, results) {
    this.lvl -= num
    if (this.lvl <= 1) {
      this.lvl = 1
    }
    if (results) {
      results.push({
        content: 'lvldown',
        args: {
          player: this.name,
          num: num
        }
      })
      results.push({
        content: 'lvlchange-result',
        args: {
          player: this.name,
          num: this.lvl
        }
      })
    }
  }

  hasSealed(spell) {
    for (let seal of this.sealed) {
      if (seal.spell.includes(spell)) {
        return true
      }
    }
    return false
  }

  setSealed(spell, round, results) {
    if (spell === 'random') {
      let spells = this.sc.map(sc => sc.name).filter(names => !this.hasSealed(names[0]))
      if (spells.length > 0) {
        spell = util.randchoice(spells)
      }
    } else if (typeof spell === 'string') {
      for (let sc of this.sc) {
        if (sc.name.includes(spell)) {
          spell = sc.name
          break
        }
      }
    }
    if (spell instanceof Array) {
      if (this.hasSealed(spell[0])) {
        for (let seal of this.sealed) {
          if (seal.spell.includes(spell[0])) {
            seal.round = round
            break
          }
        }
      } else {
        this.sealed.push({ spell, round })
      }
      if (results) {
        results.push({
          content: 'set-sealed',
          args: {
            player: this.name,
            card: spell[0],
            round
          }
        })
      }
    }
  }

  unavailable(card) {
    for (let item of this.unavaillist) {
      if (item.name === card) {
        return true
      }
    }
    return false
  }

  setUnavail(name, round, results) {
    if (this.unavailable(name)) {
      for (let item of this.unavaillist) {
        if (item.name === name) {
          item.round = round
          break
        }
      }
    } else {
      this.unavaillist.push({ name, round })
    }
    if (results) {
      results.push({
        content: 'set-unavailable',
        args: {
          player: this.name,
          card: name,
          round
        }
      })
    }
  }

  getMaxCards() {
    let num = this.maxcards
    for (let condname in this.conds) {
      if (condname === 'handcard-up') {
        num += this.conds[condname].num
      } else if (condname === 'handcard-limit') {
        num -= this.conds[condname].num
      }
    }
    if (num < 1) {
      num = 1
    }
    return num
  }

  addMaxCards(num, round, results) {
    owner.setCond('handcard-up', { round, num }, results, ['num'])
  }

  reduceMaxCards(num, round, results) {
    oppo.setCond('handcard-limit', { round, num }, results, ['num'])
  }

  getUseLimit() {
    let num = this.uselimit
    for (let condname in this.conds) {
      if (condname === 'uselimit-up') {
        num += this.conds[condname].num
      } else if (condname === 'uselimit-down') {
        num -= this.conds[condname].num
      }
    }
    if (num < 1) {
      num = 1
    }
    return num
  }

  addUseLimit(num, round, results) {
    owner.setCond('uselimit-up', { round, num }, results, ['num'])
  }

  reduceUseLimit(num, round, results) {
    oppo.setCond('uselimit-down', { round, num }, results, ['num'])
  }

  passRound(results) {
    for (let seal of this.sealed) {
      if (seal.round > 0) {
        seal.round -= 1
      }
    }

    let _sealed = []
    for (let seal of this.sealed) {
      if (seal.round !== 0) {
        _sealed.push(seal)
      } else {
        results.push({
          content: 'clear-seal',
          args: {
            player: this.name,
            card: seal.spell[0]
          }
        })
      }
    }
    this.sealed = _sealed

    for (let condname in this.conds) {
      if (condname.startsWith('hurt@')) {
        this.sufferDamage(this.conds[condname].num, results)
      } else if (condname === 'continuous-seal') {
        this.setSealed('random', 1, results)
      }
    }

    for (let condname in this.conds) {
      if (this.conds[condname].round > 0) {
        this.conds[condname].round -= 1
      }
    }

    if (this.hasClearableCond('#wait-for-seal')) {
      // this.setCond('sealed', { round: 5, card: util.randchoice(this.sc).name }, results)
      let num = this.conds['#wait-for-seal'].num
      for (let i = 0; i < num; i++) {
        this.setSealed('random', 5, results)
      }
    }

    for (let condname in this.conds) {
      if (this.conds[condname].round === 0) {
        this.clearCond(condname, results)
      }
    }

    let _unavail = []
    for (let item of this.unavaillist) {
      if (item.round > 0) {
        item.round -= 1
      }
      if (item.round !== 0) {
        _unavail.push(item)
      }
    }
    this.unavaillist = _unavail
  }
}

class Reimu extends Char {
  constructor() {
    super(
      'Reimu',
      3000,
      [
        {
          name: [
            'Musou Myoutama',
            'Musou Fuuin',
            'Musou Tensei'
          ],
          group: /^sstcb/
        },
        {
          name: [
            'Circle Seal',
            'Double Enchant',
            'Hakurei Bullet Enchant'
          ],
          group: /^ssbh/
        },
        {
          name: [
            'Subspace Cavity',
            'Subspace Cavity Teleport',
            'Dream Subspace Cavity'
          ],
          group: /^ukb/
        },
        {
          name: [
            'Persuasion Needle',
            'Kishin Persuasion Needle',
            'Onmyou Persuasion Needle'
          ],
          group: /^sp/
        }
      ]
    )
  }
}

class Marisa extends Char {
  constructor() {
    super(
      'Marisa',
      2400,
      [
        {
          name: [
            'Stardust',
            'Stardust Fantasy',
            'Milky Way'
          ],
          group: /^llcb/
        },
        {
          name: [
            'Witch Dash',
            'Witch Fantasy',
            'Meteorite'
          ],
          group: /^lac/
        },
        {
          name: [
            'Witch Bullet',
            'Witch Shoot',
            'Witch Starlight'
          ],
          group: /^sb/
        }
      ]
    )
  }
}

module.exports = {
  Reimu,
  Marisa
}