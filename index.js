const app = require('express')()
var http = require('http').Server(app)
const io = require('socket.io')(http)

const chars = require('./src/char.js')

http.listen(9001)
console.log('Listening on port 9001...')

let players = {}

io.on('connection', socket => {
  let roomid
  for (roomid = 1; ; roomid++) {
    let room = io.of('Room #' + roomid)
    if (Object.keys(room.connected).length < 2) {
      socket.join('Room #' + roomid)
      break
    }
  }
  console.log(`Client user ${socket.id} has joined in Room #${roomid}!`)
  socket.on('disconnect', () => {
    let rooms = Object.keys(socket.rooms)
    let room = rooms[rooms.length - 1]
    socket.leave(room)
    console.log(`Client user ${socket.id} disconnected from ${room}...`)
  })
  socket.on('select char', char => {
    players[socket.id] = new chars[char]()
    let rooms = Object.keys(socket.rooms)
    let room = rooms[rooms.length - 1]
    let clients = Object.keys(io.of(room).connected)
    let oppo = undefined
    for (let clientid of clients) {
      if (clientid !== socket.id) {
        oppo = players[clientid].constructor.name
      }
    }
    if (oppo !== undefined) {
      for (let clientid of clients) {
        if (clientid === socket.id) {
          socket.send('char selected', char, oppo)
        } else {
          io.to(clientid).emit('char selected', oppo, char)
        }
      }
    }
  })
})

io.on('connection', socket => {
  socket.on('foo', () => {
    //io.sendTo(socket, msg)
  })
})
