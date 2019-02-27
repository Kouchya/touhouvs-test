const app = require('express')()
var http = require('http').Server(app)
const io = require('socket.io')(http)

const chars = require('./src/char.js')
const card = require('./src/card.js')

http.listen(9001)
console.log('Listening on port 9001...')

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
      attrs = ['name', 'hp', 'basehp', 'sc', 'handcards', 'uselimit']
      let p1 = {}, p2 = {}
      for (let attr of attrs) {
        p1[attr] = plyr[attr]
        p2[attr] = oppo[attr]
      }
      for (let clientid of clients) {
        if (clientid === socket.id) {
          socket.emit('char selected', p1, p2)
        } else {
          io.to(clientid).emit('char selected', p2, p1)
        }
      }
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
      let result = {} // any msg to be sent to cli will first be stored here
      for (let i = 0; plyr.use[i] !== undefined || oppo.use[i] !== undefined; i++) {
        let plyrcard, oppocard
        if (plyr.use[i] !== undefined) {
          plyrcard = plyr.card = plyr.handcards[plyr.use[i]]
        }
        if (oppo.use[i] !== undefined) {
          oppocard = oppo.card = oppo.handcards[oppo.use[i]]
        }

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
        } else if (mode === 'normal') {
          // Fight!
          let factor = 1
          if (defender.card !== undefined) {
            if (attacker.card.atk / defender.card.dfs >= 2) {
              factor = 2 // critical hit
            } else if (attacker.card.atk / defender.card.dfs <= 0.5) {
              factor = 0.5 // anti-critical
            } else {
              factor += (attacker.card.atk - defender.card.dfs) / 10
            }
          }

          let dmg = Math.floor(attacker.card.getBaseDamage() * factor)

          if (defender.card !== undefined && ['close', 'remote'].includes(attacker.card.getType())) {
            if (defender.card.name === 'catch' && attacker.card.getType() === 'close') {
              dmg = 0
              attacker.sufferDamage(70)
              continue
            } else if (defender.card.name === 'harden') {
              if (defender.card.dfs < attacker.card.atk) {
                dmg /= 2
              } else if (defender.card.dfs >= attacker.card.atk) {
                dmg = 0
              }
            } else if (defender.card.name === 'lure' && attacker.card.getType() === 'remote') {
              dmg = 0
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
            defender.card.doEffect(defender, attacker)
          }
        }
      }
    }
  })
})

