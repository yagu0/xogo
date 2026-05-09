import ChessRules from "/js/base_rules.js";

export default class SleepyRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["balance", "capture", "cylinder", "dark", "rifle", "zen"]
    };
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.states = JSON.parse(fenParsed.states);
  }

  getPartFen(o) {
    return {
      "states": (o.init ? '0'.repeat(64) : JSON.stringify(this.states)),
      ...super.getPartFen(o)
    };
  }

  pieces(color, x, y) {
    return {
      's': {"class": "sleepy-pawn"},
      'u': {"class": "sleepy-rook"},
      'o': {"class": "sleepy-knight"},
      'c': {"class": "sleepy-bishop"},
      't': {"class": "sleepy-queen"},
      ...super.pieces(color, x, y)
    };
  }

  static get M_PIECES() {
    return ['p', 'r', 'n', 'b', 'q'];
  }
  static get S_PIECES() {
    return ['s', 'u', 'o', 'c', 't'];
  }

  getPotentialMovesOf(piece, [x, y]) {
    if (V.S_PIECES.includes(piece))
      return [];
    return super.getPotentialMovesOf(piece, [x, y]);
  }

  getStateIndex(coords) {
    return this.size.y * coords.x + coords.y;
  }

  prePlay(move) {
    super.prePlay(move);
    // 1) Wake up observed pieces
    // TODO: findDestSquares(attackOnly = true) with changing piece color on board
    // Loop on found squares + if index in S_PIECES then change
    // 2) Update sleepy status
    const indices = [move.start, move.end].map(this.getStateIndex);
    this.states[indices[1]] = this.states[indices[0]] + 1;
    this.states[indices[0]] = 0;
    if (this.states[indices[1]] >= 3)
      move.appear[0].p = V.S_PIECES[V.M_PIECES.indexOf(move.appear[0].p)];
  }

};
