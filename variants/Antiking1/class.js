import ChessRules from "/base_rules.js";
import AbstractAntikingRules from "/variants/_Antiking/class.js";

export default class Antiking1Rules extends AbstractAntikingRules {

  get hasCastle() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  pieces(color, x, y) {
    const pawnShift = (color == "w" ? -1 : 1);
    let res = super.pieces(color, x, y);
    res['p'].moves = [
      {
        steps: [[pawnShift, 1], [pawnShift, -1]],
        range: 1
      }
    ];
    res['p'].attack = [
      {
        steps: [[pawnShift, 0]],
        range: 1
      }
    ];
    return res;
  }

  genRandInitBaseFen() {
    // Always deterministic setup
    return {
      fen: "2prbkqA/2p1nnbr/2pppppp/8/8/PPPPPP2/RBNN1P2/aQKBRP2",
      o: {"flags": "KAka"}
    };
  }

  // (Anti)King flags at 1 (true) if they can knight-jump
  setFlags(fenflags) {
    this.kingFlags = { w: {}, b: {} };
    for (let i=0; i<fenflags.length; i++) {
      const white = fenflags.charCodeAt(i) <= 90;
      const curChar = fenflags.charAt(i).toLowerCase();
      this.kingFlags[white ? 'w' : 'b'][curChar] = true;
    }
  }

  getFlagsFen() {
    return (
      Array.prototype.concat.apply(
        ['w', 'b'].map(c => {
          const res = Object.keys(this.kingFlags[c]).join("");
          return (c == 'w' ? res.toUpperCase() : res);
        })
      ).join("")
    );
  }

  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    let moves = super.getPotentialMovesFrom([x, y]);
    if (this.kingFlags[color][this.getPiece(x, y)]) {
      // Allow knight jump (king or antiking)
      const knightMoves = super.getPotentialMovesOf('n', [x, y]);
      // Remove captures (TODO: could be done more efficiently...)
      moves = moves.concat(knightMoves.filter(m => m.vanish.length == 1));
    }
    return moves;
  }

  prePlay(move) {
    super.prePlay(move);
    // Update king+antiking flags
    const piece = move.vanish[0].p;
    if (this.isKing(0, 0, piece))
      delete this.kingFlags[move.vanish[0].c][piece];
  }

};
