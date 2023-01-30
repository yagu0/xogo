import ChessRules from "/base_rules.js";

export default class AbstractAntikingRules extends ChessRules {

  static get Aliases() {
    return Object.assign({'A': AbstractAntikingRules}, ChessRules.Aliases);
  }

  static get Options() {
    return {
      styles: [
        "atomic",
        "balance",
        "cannibal",
        "capture",
        "crazyhouse",
        "doublemove",
        "madrasi",
        "progressive",
        "recycle",
        "rifle",
        "teleport",
        "zen"
      ]
    };
  }

  pieces(color, x, y) {
    let antikingSpec = super.pieces(color, x, y)['k'];
    antikingSpec["class"] = "antiking";
    return Object.assign({'a': antikingSpec}, super.pieces(color, x, y));
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return ['k', 'a'].includes(p);
  }

  // NOTE: canTake includes (wrong) captures of (anti)king,
  // to detect attacks on (anti)kings.
  canTake([x1, y1], [x2, y2]) {
    const piece1 = this.getPiece(x1, y1);
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    return (
      (piece1 != 'a' && color1 != color2) ||
      (piece1 == 'a' && color1 == color2)
    );
  }

  // Remove captures of (anti)king (see above)
  getPotentialMovesFrom([x, y]) {
    return super.getPotentialMovesFrom([x, y]).filter(m =>
      m.vanish.length == 1 || !['k', 'a'].includes(m.vanish[1].p));
  }

  underCheck(square_s, color) {
    let res = false;
    square_s.forEach(sq => {
      switch (this.getPiece(sq[0], sq[1])) {
        case 'k':
          res ||= super.underAttack(sq, [color]);
          break;
        case 'a':
          res ||= !super.underAttack(sq, [color]);
          break;
      }
    });
    return res;
  }

};
