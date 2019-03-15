const app = require('express')()
var http = require('http').Server(app)
const io = require('socket.io')(http)

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
    players[socket.id] = { 'name': char, 'use': [] }
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
      emitSep(clients, socket, 'char selected', char, oppo.name)
      /* attrs = ['name', 'hp', 'basehp', 'sc', 'handcards', 'uselimit', 'hasused']
      let p1 = {}, p2 = {}
      for (let attr of attrs) {
        p1[attr] = plyr[attr]
        p2[attr] = oppo[attr]
      } */
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
      emitSep(clients, socket, 'chosen cards', plyr.use, oppo.use)
      plyr.use = []
      oppo.use = []
    }
  })
})

