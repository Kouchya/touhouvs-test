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
    let joined = false
    io.of('Room #' + roomid).clients((error, clients) => {
      if (error) {
        throw error
      }
      if (clients.length < 2) {
        console.log(clients)
        socket.join('Room #' + roomid)
        joined = true
        return
      }
    })
    if (joined) {
      break
    }
  }
  console.log(`Client user ${socket.id} has joined in Room #${roomid}!`)
  socket.on('disconnect', () => {
    let room = Object.keys(socket.rooms)[1]
    socket.leave(room)
    console.log(`Client user ${socket.id} disconnected from ${room}...`)
  })
  socket.on('select char', char => {
    players[socket.id] = new chars[char]()
    let room = Object.keys(socket.rooms)[1]
    io.of(room).clients((error, clients) => {
      if (error) {
        throw error
      }
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
})

io.on('connection', socket => {
  socket.on('foo', () => {
    //io.sendTo(socket, msg)
  })
})
