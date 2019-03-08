const app = require('express')()
var http = require('http').Server(app)
const io = require('socket.io')(http)

const chars = require('./src/char.js')
const card = require('./src/card.js')
let results = require('./src/result.js')

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
      plyr = players[socket.id]
      for (let i = 0; i < 7; i++) {
        plyr.handcards.push(new card.Card())
        oppo.handcards.push(new card.Card())
      }
      attrs = ['name', 'hp', 'basehp', 'sc', 'handcards', 'uselimit', 'hasused']
      let p1 = {}, p2 = {}
      for (let attr of attrs) {
        p1[attr] = plyr[attr]
        p2[attr] = oppo[attr]
      }
      /*for (let clientid of clients) {
        if (clientid === socket.id) {
          socket.emit('char selected', p1, p2)
        } else {
          io.to(clientid).emit('char selected', p2, p1)
        }
      }*/
      emitSep(clients, socket, 'char selected', p1, p2)
    }
  })

  // user has chosen its action
  socket.on('use', acts => {
    plyr = players[socket.id]
    plyr.use = acts
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
      results = []
      for (let i = 0; plyr.use[i] !== undefined || oppo.use[i] !== undefined; i++) {
        let plyrcard, oppocard
        if (plyr.use[i] !== undefined) {
          plyrcard = plyr.card = plyr.handcards[plyr.use[i]]
          plyr.hasused.push(plyrcard.name)
        }
        if (oppo.use[i] !== undefined) {
          oppocard = oppo.card = oppo.handcards[oppo.use[i]]
          oppo.hasused.push(oppocard.name)
        }
        emitAll(room, 'highlight card', plyrcard !== undefined ? plyrcard.name : undefined, oppocard !== undefined ? oppocard.name : undefined)

        let attacker, defender
        let mode = 'normal' // if not normal, then nobody moves
        if (plyrcard === undefined) {
          if (oppocard.getType() !== 'defend') {
            attacker = oppo
            defender = plyr
          }
        } else if (oppocard === undefined) {
          if (plyrcard.getType() !== 'defend') {
            attacker = plyr
            defender = oppo
          }
        } else if (plyrcard.getType() === 'defend') {
          if (oppocard.getType() !== 'defend') {
            attacker = oppo
            defender = plyr
          }
        } else if (oppocard.getType() === 'defend') {
          if (plyrcard.getType() !== 'defend') {
            attacker = plyr
            defender = oppo
          }
        } else if (plyrcard.atk > oppocard.atk) {
          attacker = plyr
          defender = oppo
        } else if (plyrcard.atk < oppocard.atk) {
          attacker = oppo
          defender = plyr
        } else {
          mode = 'tied'
        }

        if (mode === 'tied') {
          // nobody moves
          results.push({
            'content': 'tied',
            'args': {}
          })
        } else if (mode === 'normal') {
          // Fight!
          results.push({
            'content': 'use hint',
            'args': {
              'player': attacker.name,
              'card': attacker.card.name
            }
          })
          let factor = 1
          if (defender.card !== undefined) {
            if (attacker.card.atk / defender.card.dfs >= 2 || (attacker.card.name === 'break' && defender.card !== undefined && defender.card.name === 'harden')) {
              factor = 2 // critical hit
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
                  'content': 'weak harden',
                  'args': {
                    'player': defender.name
                  }
                })
              } else if (defender.card.dfs >= attacker.card.atk) {
                dmg = 0
                results.push({
                  'content': 'strong harden',
                  'args': {
                    'player': defender.name
                  }
                })
              }
            } else if (defender.card.name === 'lure' && attacker.card.getType() === 'close') {
              dmg = 0
              results.push({
                'content': 'lure',
                'args': {
                  'player': defender.name
                }
              })
              attacker.sufferDamage(attacker.card.getBaseDamage())
              attacker.card.doEffect(defender, attacker)
              continue
            }
          }

          if (dmg > 0) {
            defender.sufferDamage(dmg)
          }

          attacker.card.doEffect(attacker, defender)
          if (defender.card !== undefined && defender.card.name === 'lvlup') {
            results.push({
              'content': 'use hint',
              'args': {
                'player': defender.name,
                'card': 'lvlup'
              }
            })
            defender.card.doEffect(defender, attacker)
          }
        }
        emitAll(room, 'results', results)
      }
    }
  })
})

