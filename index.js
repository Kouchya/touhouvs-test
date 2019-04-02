const app = require('express')()
var http = require('http').Server(app)
const io = require('socket.io')(http)

const card = require('./src/card.js')
const cardinfo = require('./src/cardinfo.js')
const chars = require('./src/char.js')
const util = require('./src/util.js')

http.listen(9001)
console.log('Listening on port 9001...')

function emitSep(clients, socket, msg, selfdata, oppodata) {
  for (let clientid of clients) {
    if (clientid === socket.id) {
      socket.emit(msg, selfdata, oppodata)
    } else {
      io.to(clientid).emit(msg, oppodata, selfdata)
    }
  }
}

function emitAll(clients, msg, ...data) {
  if (Array.isArray(clients)) {
    for (let clientid of clients) {
      io.to(clientid).emit(msg, ...data)
    }
  } else if (typeof clients === 'string') {
    io.to(clients).emit(msg, ...data)
  }
}

let players = {}

io.on('connection', socket => {
  let roomid
  for (roomid = 1; ; roomid++) {
    let room = io.sockets.adapter.rooms['Room #' + roomid]
    if (!room || room.length < 2) {
      socket.join('Room #' + roomid)
      break
    }
  }
  console.log(`Client user ${socket.id} has joined in Room #${roomid}!`)

  // disconnecting
  socket.on('disconnecting', reason => {
    let rooms = Object.keys(socket.rooms)
    let room
    for (let r of rooms) {
      if (r !== socket.id) {
        room = r
        break
      }
    }
    console.log(`Client user ${socket.id} disconnected from ${room}...`)
  })

  // user has selected a char
  socket.on('select char', char => {
    players[socket.id] = new chars[char]()
    let plyr = players[socket.id]
    plyr.handcards.push(new card.Card('spirit'))
    plyr.handcards.push(new card.Card('spirit'))
    plyr.handcards.push(new card.Card('throw'))
    plyr.handcards.push(new card.Card('tackle'))
    plyr.handcards.push(new card.Card('break'))
    plyr.handcards.push(new card.Card('anger'))
    plyr.handcards.push(new card.Card('lvlup'))
    while (plyr.handcards.length < plyr.getMaxCards()) {
      plyr.handcards.push(new card.Card())
    }

    let rooms = Object.keys(socket.rooms)
    let room
    for (let r of rooms) {
      if (r !== socket.id) {
        room = r
        break
      }
    }
    let clients = Object.keys(io.sockets.adapter.rooms[room].sockets)
    let oppo = undefined
    for (let clientid of clients) {
      if (clientid !== socket.id) {
        oppo = players[clientid]
        break
      }
    }
    if (oppo !== undefined) {
      plyr.oppo = oppo
      oppo.oppo = plyr
      emitSep(
        clients,
        socket,
        'battle',
        plyr.serialize(),
        oppo.serialize()
      )
    }
  })

  // user has chosen its action
  socket.on('use', acts => {
    socket.emit('op prohibit')
    let plyr = players[socket.id]
    plyr.use = acts.slice()
    let rooms = Object.keys(socket.rooms)
    let room
    for (let r of rooms) {
      if (r !== socket.id) {
        room = r
        break
      }
    }
    let clients = Object.keys(io.sockets.adapter.rooms[room].sockets)
    let oppo = undefined
    for (let clientid of clients) {
      if (clientid !== socket.id) {
        oppo = players[clientid]
        break
      }
    }
    if (oppo !== undefined && oppo.use.length > 0) {
      // emitSep(clients, socket, 'chosen cards', plyr.use, oppo.use)
      let plyrstr = plyr.use.reduce((str, index) => {
        return str + plyr.handcards[index].tag
      }, '')
      let plyrrawcards = plyr.use.map(index => {
        return plyr.handcards[index]
      })

      let oppostr = oppo.use.reduce((str, index) => {
        return str + oppo.handcards[index].tag
      }, '')
      let opporawcards = oppo.use.map(index => {
        return oppo.handcards[index]
      })

      let results = []
      if (plyrstr === '' && oppostr === '') {
        results.push({
          content: 'both-do-nothing',
          args: {}
        })
      }

      while (plyrstr.length > 0 || oppostr.length > 0) {
        let plyrcard, oppocard

        if (plyrstr.startsWith('?')) {
          plyrstr = plyrstr.substring(1)
          results.push({
            'content': 'blocked',
            'args': {
              'player': plyr.name,
              'card': plyrrawcards[0].name,
              'atk': plyrrawcards[0].atk,
              'dfs': plyrrawcards[0].dfs
            }
          })
          plyrrawcards.shift()
        } else {
          let self_match = false
          for (let sc of plyr.allsc) {
            if (plyr.hasSealed(sc.name[0])) {
              continue
            }
            let res = sc.group.exec(plyrstr)
            if (res !== null) {
              let scindex = Math.min(plyr.lvl, sc.name.length) - 1
              if (plyr.hasCond('#wait-for-seal')) {
                results.push({
                  'content': 'seal-waited',
                  'args': {
                    'player': plyr.name,
                    'card': sc.name[scindex]
                  }
                })
                plyr.clearCond('#wait-for-seal')
                plyr.setSealed(sc.name, 5, results)
                continue
              }
              plyrstr = plyrstr.substring(res[0].length)
              let group = plyrrawcards.splice(0, res[0].length)
              let name = sc.name[scindex]
              let atk = group.reduce((sum, card) => {
                return sum + card.atk
              }, 0)
              let dfs = group.reduce((sum, card) => {
                return sum + card.dfs
              }, 0)
              plyrcard = new card.Card(name, atk, dfs, group.map(card => {
                return { name: card.name, atk: card.atk, dfs: card.dfs }
              }))
              self_match = true
              break
            }
          }
          if (!self_match) {
            plyrstr = plyrstr.substring(1)
            plyrcard = plyrrawcards.shift()
          }
        }

        if (oppostr.startsWith('?')) {
          oppostr = oppostr.substring(1)
          results.push({
            'content': 'blocked',
            'args': {
              'player': oppo.name,
              'card': opporawcards[0].name,
              'atk': opporawcards[0].atk,
              'dfs': opporawcards[0].dfs
            }
          })
          opporawcards.shift()
        } else {
          let oppo_match = false
          for (let sc of oppo.allsc) {
            if (oppo.hasSealed(sc.name[0])) {
              continue
            }
            let res = sc.group.exec(oppostr)
            if (res !== null) {
              let scindex = Math.min(oppo.lvl, sc.name.length) - 1
              if (oppo.hasCond('#wait-for-seal')) {
                results.push({
                  'content': 'seal-waited',
                  'args': {
                    'player': oppo.name,
                    'card': sc.name[scindex]
                  }
                })
                oppo.clearCond('#wait-for-seal')
                oppo.setSealed(sc.name, 5, results)
                continue
              }
              oppostr = oppostr.substring(res[0].length)
              let group = opporawcards.splice(0, res[0].length)
              let name = sc.name[scindex]
              let atk = group.reduce((sum, card) => {
                return sum + card.atk
              }, 0)
              let dfs = group.reduce((sum, card) => {
                return sum + card.dfs
              }, 0)
              oppocard = new card.Card(name, atk, dfs, group.map(card => {
                return { name: card.name, atk: card.atk, dfs: card.dfs }
              }))
              oppo_match = true
              break
            }
          }
          if (!oppo_match) {
            oppostr = oppostr.substring(1)
            oppocard = opporawcards.shift()
          }
        }

        plyr.card = plyrcard
        oppo.card = oppocard

        if (plyrcard !== undefined) {
          let args = {
            'player': plyr.name,
            'card': plyrcard.name,
            'atk': plyrcard.atk,
            'dfs': plyrcard.dfs
          }
          let content = 'use-card'
          if (plyrcard.isSpell) {
            args.subcards = plyrcard.subcards
            content = 'use-spell'
          }
          results.push({ content, args })
        }
        if (oppocard !== undefined) {
          let args = {
            'player': oppo.name,
            'card': oppocard.name,
            'atk': oppocard.atk,
            'dfs': oppocard.dfs
          }
          let content = 'use-card'
          if (oppocard.isSpell) {
            args.subcards = oppocard.subcards
            content = 'use-spell'
          }
          results.push({ content, args })
        }

        let movers = []
        if (plyrcard === undefined && oppocard === undefined) {
          movers = []
        } else if (plyrcard === undefined) {
          if (oppocard.getType() !== 'defend') {
            movers = [oppo]
          } else {
            movers = []
          }
        } else if (oppocard === undefined) {
          if (plyrcard.getType() !== 'defend') {
            movers = [plyr]
          } else {
            movers = []
          }
        } else if (plyrcard.getType() === 'defend') {
          if (oppocard.getType() !== 'defend') {
            movers = [oppo]
          } else {
            movers = []
          }
        } else if (oppocard.getType() === 'defend') {
          if (plyrcard.getType() !== 'defend') {
            movers = [plyr]
          } else {
            movers = []
          }
        } else {
          if (plyrcard.isSpell && oppocard.isSpell) {
            if (plyrcard.atk > oppocard.atk) {
              movers = [plyr, oppo]
            } else if (plyrcard.atk < oppocard.atk) {
              movers = [oppo, plyr]
            } else {
              movers = []
            }
          } else if (plyrcard.isSpell) {
            movers = [plyr, oppo]
          } else if (oppocard.isSpell) {
            movers = [oppo, plyr]
          } else {
            if (plyrcard.atk > oppocard.atk) {
              movers = [plyr]
              if (oppocard.getType() === 'buff') {
                movers.push(oppo)
              }
            } else if (plyrcard.atk < oppocard.atk) {
              movers = [oppo]
              if (plyrcard.getType() === 'buff') {
                movers.push(plyr)
              }
            } else {
              movers = []
            }
          }
        }

        if (movers.length === 0) {
          // counteraction
          results.push({
            'content': 'tied',
            'args': {}
          })
        } else {
          // Fight!
          for (let attacker of movers) {
            let defender = attacker.oppo
            results.push({
              'content': 'use-hint',
              'args': {
                'player': attacker.name,
                'card': attacker.card.name,
                'atk': attacker.card.atk,
                'dfs': attacker.card.dfs
              }
            })

            let factor = 1
            let crit = false
            if (['close', 'remote'].includes(attacker.card.getType()) && defender.card !== undefined && defender.card.getType() !== 'defend') {
              if (attacker.card.atk / defender.card.dfs >= 2 || (attacker.card.name === 'break' && defender.card !== undefined && defender.card.name === 'harden')) {
                factor = 2 // critical hit
                crit = true
                results.push({
                  'content': 'critical',
                  'args': {}
                })
              } else if (attacker.card.atk / defender.card.dfs <= 0.5) {
                factor = 0.5 // anti-critical
                results.push({
                  'content': 'anti-critical',
                  'args': {}
                })
              } else {
                factor += (attacker.card.atk - defender.card.dfs) / 10
              }
            }

            let dmg = Math.floor(attacker.card.getBaseDamage() * factor)

            if (defender.card !== undefined && ['close', 'remote'].includes(attacker.card.getType())) {
              if (defender.card.name === 'harden' && attacker.card.name !== 'break') {
                if (defender.card.dfs < attacker.card.atk) {
                  dmg /= 2
                  results.push({
                    'content': 'weak-harden',
                    'args': {
                      'player': defender.name
                    }
                  })
                } else if (defender.card.dfs >= attacker.card.atk) {
                  dmg = 0
                  results.push({
                    'content': 'strong-harden',
                    'args': {
                      'player': defender.name
                    }
                  })
                }
              } else if (defender.card.name === 'lure' && attacker.card.getType() === 'close' && !attacker.card.isSpell) {
                dmg = 0
                results.push({
                  'content': 'lure',
                  'args': {
                    'player': defender.name
                  }
                })
                attacker.sufferDamage(attacker.card.getBaseDamage(), results)
                if (attacker.dead()) {
                  break
                }
                // attacker.card.doEffect(defender, attacker, crit, results)
                continue
              }
            }

            if (attacker.hasCond('damage-fix')) {
              dmg *= attacker.conds['damage-fix'].factor
            }

            dmg = Math.floor(dmg)
            if (dmg > 0) {
              defender.sufferDamage(dmg, results)
            }
            if (defender.dead()) {
              break
            }

            let effect = attacker.card.doEffect(attacker, defender, crit, results)
            if (effect.includes('blocked')) {
              if (defender.name === plyr.name) {
                let num = Math.min(plyr.conds.blocked.num, plyrstr.length)
                if (num > 0) {
                  plyrstr = '?'.repeat(num) + plyrstr.substring(num)
                }
              } else if (defender.name === oppo.name) {
                let num = Math.min(oppo.conds.blocked.num, oppostr.length)
                if (num > 0) {
                  oppostr = '?'.repeat(num) + oppostr.substring(num)
                }
              }
            }
            if (attacker.card.isSpell && !effect.includes('lvlup')) {
              attacker.lvl = 1
            }
            if (attacker.dead() || defender.dead()) {
              break
            }
          }
          if (plyr.dead() || oppo.dead()) {
            break
          }
        }
      }

      if (!plyr.dead() && !oppo.dead()) {
        plyr.passRound(results)
      }
      if (!plyr.dead() && !oppo.dead()) {
        oppo.passRound(results)
      }
      
      plyr.handcards = plyr.handcards.filter((_, index) => {
        return !plyr.use.includes(index)
      })
      if (plyr.hasCond('#change-all-handcards')) {
        plyr.clearCond('#change-all-handcards', results)
        let cards = []
        for (let name of cardinfo.CardNames) {
          if (!plyr.unavailable(name)) {
            cards.push(name)
          }
        }
        if (cards.length > 0) {
          plyr.handcards = plyr.handcards.map(_ => {
            return new card.Card(util.randchoice(cards))
          })
        } else {
          plyr.handcards = []
        }
      }
      oppo.handcards = oppo.handcards.filter((_, index) => {
        return !oppo.use.includes(index)
      })
      if (oppo.hasCond('#change-all-handcards')) {
        oppo.clearCond('#change-all-handcards', results)
        let cards = []
        for (let name of cardinfo.CardNames) {
          if (!oppo.unavailable(name)) {
            cards.push(name)
          }
        }
        if (cards.length > 0) {
          oppo.handcards = oppo.handcards.map(_ => {
            return new card.Card(util.randchoice(cards))
          })
        } else {
          oppo.handcards = []
        }
      }
      plyr.use = []
      oppo.use = []
      results.push({
        'content': 'roundend',
        'args': {}
      })
      emitAll(clients, 'result', results)
    }
  })

  // start next round
  socket.on('roundend', () => {
    let plyr = players[socket.id]

    let rooms = Object.keys(socket.rooms)
    let room
    for (let r of rooms) {
      if (r !== socket.id) {
        room = r
        break
      }
    }
    let clients = Object.keys(io.sockets.adapter.rooms[room].sockets)
    let oppo = undefined
    for (let clientid of clients) {
      if (clientid !== socket.id) {
        oppo = players[clientid]
        break
      }
    }

    let dummy = false
    for (let card of plyr.handcards) {
      if (['You', 'Play', 'Cards', 'Like', 'Cai', 'Xu', 'Kun'].includes(card.name)) {
        dummy = true
        break
      }
    }
    if (dummy) {
      plyr.handcards = []
    }

    let cards = []
    for (let name of cardinfo.CardNames) {
      if (!plyr.unavailable(name)) {
        cards.push(name)
      }
    }
    while (cards.length > 0 && plyr.handcards.length < plyr.getMaxCards()) {
      plyr.handcards.push(new card.Card(util.randchoice(cards)))
    }
    while (plyr.handcards.length > plyr.getMaxCards()) {
      util.randpop(plyr.handcards)
    }

    if (plyr.handcards.length === 0) {
      plyr.handcards.push(new card.Card('You', 1, 1))
      plyr.handcards.push(new card.Card('Play', 1, 1))
      plyr.handcards.push(new card.Card('Cards', 1, 1))
      plyr.handcards.push(new card.Card('Like', 1, 1))
      plyr.handcards.push(new card.Card('Cai', 1, 1))
      plyr.handcards.push(new card.Card('Xu', 1, 1))
      plyr.handcards.push(new card.Card('Kun', 1, 1))
    }

    if (oppo !== undefined) {
      if (plyr.dead() || oppo.dead()) {
        emitSep(
          clients,
          socket,
          'gameover',
          plyr.dead() ? 0 : 1,
          plyr.dead() ? 1 : 0
        )
      } else {
        emitSep(
          clients,
          socket,
          'battle',
          plyr.serialize(),
          oppo.serialize()
        )
      }
    }
  })
})

