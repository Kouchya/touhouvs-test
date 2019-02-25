class Char {
  constructor(name, basehp, sc) {
    this.name = name
    this.hp = this.basehp = basehp
    this.sc = sc
  }
}

class Reimu extends Char {
  constructor() {
    super(
      'Hakurei Reimu',
      3000,
      []
    )
  }
}

class Marisa extends Char {
  constructor() {
    super(
      'Kirisame Marisa',
      2400,
      []
    )
  }
}

module.exports = {
	Reimu,
  Marisa
}