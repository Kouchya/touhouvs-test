function randint(n, m) {
  if (!n && !m) {
    n = 0
    m = 99
  } else if (!m) {
    m = n - 1
    n = 0
  }
  return Math.floor(Math.random() * (m - n + 1) + n)
}

function randchoice(list, pop) {
  let index = randint(list.length)
  let item = list[index]
  if (pop) {
    list.splice(index, 1)
  }
  return item
}

function randchoices(list, num, pop) {
  if (num <= 0) {
    return []
  }

  let _list = list.slice()
  if (num >= list.length) {
    if (pop) {
      list = []
    }
    return _list
  }
  
  let result = []
  for (let i = 0; i < num; i++) {
    let item = randchoice(_list, true)
    result.push(item)
  }
  if (pop) {
    list = _list
  }
  return result
}

function randpop(list) {
  let i = randint(list.length)
  list.splice(i, 1)
}

module.exports = {
  randint,
  randchoice
}