import ChessRules from "/base_rules.js";

export default class ClorangeRules extends ChessRules {

  // TODO: options : disable teleport/recycle at least ?

  get hasReserve() {
    return true;
  }

  getReserveFen(o) {
    if (o.init)
      return "00000000000000000000";
    return (
      ["w","b"].map(c => Object.values(this.reserve[c]).join("")).join("")
    );
  }

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    res['s'] = {"class": "nv-pawn", moveas: "p"};
    res['u'] = {"class": "nv-rook", moveas: "r"};
    res['o'] = {"class": "nv-knight", moveas: "n"};
    res['c'] = {"class": "nv-bishop", moveas: "b"};
    res['t'] = {"class": "nv-queen", moveas: "q"};
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen,
      ['p', 'r', 'n', 'b', 'q', 's', 'u', 'o', 'c', 't']);
  }

  postProcessPotentialMoves(moves) {
    // Remove captures for non-violent pieces:
    return super.postProcessPotentialMoves(moves).filter(m => {
      return (
        m.vanish.length != 2 ||
        m.appear.length != 1 ||
        ['p', 'r', 'n', 'b', 'q'].includes(m.vanish[0].p)
      );
    });
  }

  canTake([x1, y1], [x2, y2]) {
    return (
      this.getColor(x1, y1) !== this.getColor(x2, y2) &&
      ['p', 'r', 'n', 'b', 'q', 'k'].includes(this.getPiece(x1, y1))
    );
  }

  prePlay(move) {
    super.prePlay(move);
    // No crazyhouse or recycle, so the last call didn't update reserve:
    if (move.vanish.length == 2 && move.appear.length == 1) {
      // Capture: update reserves
      this.Reserve[move.vanish
      const pIdx = ['p', 'r', 'n', 'b', 'q'].indexOf(move.vanish[1].p);
      // TODO
      if normal
          ? ChessRules.PIECES.findIndex(p => p == move.vanish[1].p)
          : V.NON_VIOLENT.findIndex(p => p == move.vanish[1].p);
      const rPiece = (normal ? V.NON_VIOLENT : ChessRules.PIECES)[pIdx];
      this.reserve[move.vanish[1].c][rPiece]++;
    }
  }

};
