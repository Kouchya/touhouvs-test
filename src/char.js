class Char {
  constructor(name, basehp, sc) {
    this.name = name
    this.hp = this.basehp = basehp
    this.sc = sc
    this.handcards = []
    this.uselimit = 3
    this.use = []
  }
}

class Reimu extends Char {
  constructor() {
    super(
      'Reimu',
      3000,
      []
    )
  }
}

class Marisa extends Char {
  constructor() {
    super(
      'Marisa',
      2400,
      []
    )
  }
}

module.exports = {
	Reimu,
  Marisa
}