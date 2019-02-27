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
      let result = {}
      for (let i = 0; plyr.use[i] !== undefined || oppo.use[i] !== undefined; i++) {
        let plyrcard, oppocard
        if (plyr.use[i] !== undefined) {
          plyrcard = plyr.card = plyr.handcards[plyr.use[i]]
        }
        if (oppo.use[i] !== undefined) {
          oppocard = oppo.card = oppo.handcards[oppo.use[i]]
        }

        let attacker, defender
        let mode = 'tied'
        if (plyrcard === undefined) {
          if (!oppocard.isDefense()) {
            mode = 'normal'
            attacker = oppo
            defender = plyr
          }
        } else if (oppocard === undefined) {
          if (!plyrcard.isDefense()) {
            mode = 'normal'
            attacker = plyr
            defender = oppo
          }
        } else if (plyrcard.isDefense()) {
          if (!oppocard.isDefense()) {
            mode = 'defending'
            attacker = oppo
            defender = plyr
          }
        } else if (oppocard.isDefense()) {
          if (!plyrcard.isDefense()) {
            mode = 'defending'
            attacker = plyr
            defender = oppo
          }
        } else if (plyrcard.atk > oppocard.atk) {
          mode = 'normal'
          attacker = plyr
          defender = oppo
        } else if (plyrcard.atk < oppocard.atk) {
          mode = 'normal'
          attacker = oppo
          defender = plyr
        }

        if (mode === 'defending') {
          if (defender.card.name === 'catch' && !attacker.card.isClose()) {
            mode = 'normal'
          } else if (defender.card.name === 'lure' && attacker.card.isClose()) {
            mode = 'normal'
          }
        }

        if (mode === 'tied') {
          // nobody moves
        } else if (mode === 'normal') {
          // PK! but note the undefined cases
        } else if (mode === 'defending') {
          // deal with nasty defend cards
        }
      }
    }
  })
})

