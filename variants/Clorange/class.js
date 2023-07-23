import ChessRules from "/base_rules.js";

export default class ClorangeRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles:
        C.Options.styles.filter(s => !["crazyhouse","recycle"].includes(s))
    };
  }

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
    return res;
  }

  static get V_PIECES() {
    return ['p', 'r', 'n', 'b', 'q'];
  }
  static get NV_PIECES() {
    return ['s', 'u', 'o', 'c', 't'];
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen, V.V_PIECES.concat(V.NV_PIECES));
  }

  // Forbid non-violent pieces to capture
  canTake([x1, y1], [x2, y2]) {
    return (
      this.getColor(x1, y1) !== this.getColor(x2, y2) &&
      (['k'].concat(V.V_PIECES)).includes(this.getPiece(x1, y1))
    );
  }

  pawnPostProcess(moves, color, oppCols) {
    let res = super.pawnPostProcess(moves, color, oppCols);
    if (res.length > 0 && res[0].vanish[0].p == 's') {
      // Fix promotions of non-violent pawns (if any)
      res.forEach(m => {
        if (m.appear[0].p != 's')
          m.appear[0].p = V.NV_PIECES[V.V_PIECES.indexOf(m.appear[0].p)];
      });
    }
    return res;
  }

  prePlay(move) {
    super.prePlay(move);
    // NOTE: drop moves already taken into account in base prePlay()
    if (move.vanish.length == 2 && move.appear.length == 1) {
      const normal = V.V_PIECES.includes(move.vanish[1].p);
      const pIdx =
        (normal ? V.V_PIECES : V.NV_PIECES).indexOf(move.vanish[1].p);
      const resPiece = (normal ? V.NV_PIECES : V.V_PIECES)[pIdx];
      super.updateReserve(C.GetOppTurn(this.turn), resPiece,
        this.reserve[C.GetOppTurn(this.turn)][resPiece] + 1);
    }
  }

};
