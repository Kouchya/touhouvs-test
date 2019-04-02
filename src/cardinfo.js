const util = require('./util.js')

const CardInfo = {
  punch: {
    dmg: 50,
    type: 'close',
    tag: 'p'
  },
  kick: {
    dmg: 60,
    type: 'close',
    tag: 'k'
  },
  spirit: {
    dmg: 80,
    type: 'remote',
    tag: 's'
  },
  throw: {
    dmg: 70,
    type: 'remote',
    tag: 't'
  },
  anger: {
    dmg: 100,
    type: 'remote',
    tag: 'a'
  },
  break: {
    dmg: 120,
    type: 'close',
    tag: 'b'
  },
  lvlup: {
    dmg: 0,
    type: 'buff',
    tag: 'l'
  },
  harden: {
    dmg: 0,
    type: 'defend',
    tag: 'h'
  },
  tackle: {
    dmg: 80,
    type: 'close',
    tag: 'c'
  },
  lure: {
    dmg: 0,
    type: 'defend',
    tag: 'u'
  },
  dream: {
    dmg: 0,
    type: 'special',
    tag: 'd'
  }
}

const CardNames = Object.keys(CardInfo)

const SpellInfo = {
  'Musou Myoutama': {
    dmg: 320,
    effect (owner, oppo, crit, results) {
      oppo.setCond('#wait-for-seal', { round: 1, num: 1 }, results)
      return ['wait-for-seal']
    }
  },
  'Musou Fuuin': {
    dmg: 480,
    effect (owner, oppo, crit, results) {
      oppo.setCond('#wait-for-seal', { round: 1, num: 2 }, results)
      return ['wait-for-seal']
    }
  },
  'Musou Tensei': {
    dmg: 0,
    effect (owner, oppo, crit, results) {
      let eff = []
      if (!oppo.hasCond('hurt@musou-tensei')) {
        oppo.setCond('hurt@musou-tensei', { round: -1, num: 220 }, results)
        eff.push('hurt')
      }
      if (!oppo.hasCond('continuous-seal')) {
        oppo.setCond('continuous-seal', { round: -1 }, results)
        eff.push('continuous-seal')
      }
      return eff
    }
  },
  'Circle Seal': {
    dmg: 240,
    effect (owner, oppo, crit, results) {
      oppo.setUnavail(util.randchoice(CardNames), 3, results)
      return ['unavail']
    }
  },
  'Double Enchant': {
    dmg: 360,
    effect (owner, oppo, crit, results) {
      let cards = util.randchoices(CardNames, 2)
      for (let card of cards) {
        oppo.setUnavail(card, 3, results)
      }
      return ['unavail']
    }
  },
  'Hakurei Bullet Enchant': {
    dmg: 480,
    effect (owner, oppo, crit, results) {
      let cards = util.randchoices(CardNames, 3)
      for (let card of cards) {
        oppo.setUnavail(card, 3, results)
      }
      oppo.setCond('hurt@hakurei-bullet-enchant', { round: 5, num: 120 }, results, ['num'])
      return ['unavail', 'hurt']
    }
  },
  'Subspace Cavity': {
    dmg: 280,
    effect (owner, oppo, crit, results) {
      let card_ids = oppo.handcards.map((_, index) => index).filter(index => {
        return !oppo.use.includes(index)
      })
      if (card_ids.length > 0) {
        let index = util.randchoice(card_ids)
        if (results) {
          results.push({
            content: 'set-atk',
            args: {
              player: oppo.name,
              card: oppo.handcards[index].name,
              atk: oppo.handcards[index].atk,
              dfs: oppo.handcards[index].dfs
            }
          })
        }
        oppo.handcards[index].setAtk(1)
        return ['set-atk-1']
      }
      return []
    }
  },
  'Subspace Cavity Teleport': {
    dmg: 420,
    effect (owner, oppo, crit, results) {
      let card_ids = oppo.handcards.map((_, index) => index).filter(index => {
        return !oppo.use.includes(index)
      })
      if (card_ids.length > 0) {
        let indices = util.randchoices(card_ids, 2)
        for (let index of indices) {
          if (results) {
            results.push({
              content: 'set-atk',
              args: {
                player: oppo.name,
                card: oppo.handcards[index].name,
                atk: oppo.handcards[index].atk,
                dfs: oppo.handcards[index].dfs
              }
            })
          }
          oppo.handcards[index].setAtk(1)
        }
        return ['set-atk-1']
      }
      return []
    }
  },
  'Dream Subspace Cavity': {
    dmg: 560,
    effect (owner, oppo, crit, results) {
      let card_ids = oppo.handcards.map((_, index) => index).filter(index => {
        return !oppo.use.includes(index)
      })
      if (card_ids.length > 0) {
        let indices = util.randchoices(card_ids, 3)
        for (let index of indices) {
          if (results) {
            results.push({
              content: 'set-atk',
              args: {
                player: oppo.name,
                card: oppo.handcards[index].name,
                atk: oppo.handcards[index].atk,
                dfs: oppo.handcards[index].dfs,
                num: 1
              }
            })
          }
          oppo.handcards[index].setAtk(1)
        }
        return ['set-atk-1']
      }
      return []
    }
  },
  'Persuasion Needle': {
    dmg: 220,
    effect (owner, oppo, crit, results) {
      let possib = util.randint()
      if (crit) {
        possib = Math.floor(possib / 2)
      }
      if (possib < 35) {
        oppo.reduceMaxCards(1, 2, results, 'persuasion-needle')
        return ['handcard-limit']
      }
      return []
    }
  },
  'Kishin Persuasion Needle': {
    dmg: 330,
    effect (owner, oppo, crit, results) {
      let possib = util.randint()
      if (crit) {
        possib = Math.floor(possib / 2)
      }
      if (possib < 35) {
        oppo.reduceMaxCards(2, 2, results, 'persuasion-needle')
        return ['handcard-limit']
      }
      return []
    }
  },
  'Onmyou Persuasion Needle': {
    dmg: 440,
    effect (owner, oppo, crit, results) {
      let possib = util.randint()
      if (crit) {
        possib = Math.floor(possib / 2)
      }
      if (possib < 35) {
        oppo.reduceMaxCards(3, 2, results, 'persuasion-needle')
        return ['handcard-limit']
      }
      return []
    }
  },
  'Stardust': {
    dmg: 340
  },
  'Stardust Fantasy': {
    dmg: 480
  },
  'Milky Way': {
    dmg: 560
  },
  'Witch Dash': {
    dmg: 280,
    effect (owner, oppo, crit, results) {
      owner.addMaxCards(1, 2, results, 'witch-dash')
      return ['handcard-up']
    }
  },
  'Witch Fantasy': {
    dmg: 420,
    effect (owner, oppo, crit, results) {
      owner.addMaxCards(2, 2, results, 'witch-dash')
      return ['handcard-up']
    }
  },
  'Meteorite': {
    dmg: 560,
    effect (owner, oppo, crit, results) {
      owner.addMaxCards(2, 2, results, 'witch-dash')
      return ['handcard-up']
    }
  },
  'Witch Bullet': {
    dmg: 240,
    effect (owner, oppo, crit, results) {
      owner.levelUp(1, results)
      return ['lvlup']
    }
  },
  'Witch Shoot': {
    dmg: 360,
    effect (owner, oppo, crit, results) {
      owner.levelUp(1, results)
      return ['lvlup']
    }
  },
  'Witch Starlight': {
    dmg: 480,
    effect (owner, oppo, crit, results) {
      owner.setCond('damage-fix', { round: 3, factor: 2 }, results)
      return ['double-damage']
    }
  },
  'Kaisei': {
    dmg: 0,
    type: 'buff',
    effect (owner, oppo, crit, results) {
      owner.addUseLimit(2, 4, results, 'kaisei')
      return ['handcard-up']
    }
  },
  'Kaminagi': {
    dmg: 0,
    type: 'buff',
    effect (owner, oppo, crit, results) {
      owner.recover(Math.floor(owner.basehp * 0.3), results)
      return ['recover']
    }
  },
  'Typhoon': {
    dmg: 0,
    type: 'buff',
    effect (owner, oppo, crit, results) {
      let card_ids = owner.handcards.map((_, index) => index).filter(index => {
        return !owner.use.includes(index)
      })
      if (card_ids.length > 0) {
        let card = owner.handcards[card_ids[0]]
        if (results) {
          results.push({
            content: 'set-atk',
            args: {
              player: owner.name,
              card: card.name,
              atk: card.atk,
              dfs: card.dfs,
              num: 10
            }
          })
        }
        card.setAtk(10)
        return ['set-atk-10']
      }
      return []
    }
  },
  'Fate': {
    dmg: 0,
    type: 'buff',
    effect (owner, oppo, crit, results) {
      owner.setCond('#change-all-handcards', { round: -1 }, results)
    }
  }
}

const SpellNames = Object.keys(SpellInfo)

module.exports = {
  CardInfo,
  CardNames,
  SpellInfo,
  SpellNames
}