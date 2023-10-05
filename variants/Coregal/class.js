import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, sample } from "@/utils/alea";

export class CoregalRules extends ChessRules {

//TODO: CSS royal queen symbol

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'l', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: 'r'}, {p1: 'l', p2: 'r'}],
        diffCol: ['b'],
        flags: ['r', 'k', 'l'] //TODO: add 'k' to all 'flags' calls ??!
      }
    );
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

  pieces() {
    let res = super.pieces();
    res['l'] = JSON.parse(JSON.stringify(res['q']));
    res['l']["class"] = "royal_queen";
    return res;
  }

  setFlags(fenflags) {
    // white pieces positions, then black pieces positions
    this.castleFlags = { w: [...Array(4)], b: [...Array(4)] };
    for (let i = 0; i < 8; i++) {
      this.castleFlags[i < 4 ? "w" : "b"][i % 4] =
        parseInt(fenflags.charAt(i), 10);
    }
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    ['k', 'l'].includes(p); //no cannibal mode
  }

  getCastleMoves([x, y]) {
    // Relative position of the selected piece: left or right ?
    // If left: small castle left, large castle right.
    // If right: usual situation.
    const c = this.getColor(x, y);
    const relPos = (this.castleFlags[c][1] == y ? "left" : "right");

    const finalSquares = [
      relPos == "left" ? [1, 2] : [2, 3],
      relPos == "right" ? [6, 5] : [5, 4]
    ];
    const saveFlags = JSON.stringify(this.castleFlags[c]);
    // Alter flags to follow base_rules semantic
    this.castleFlags[c] = [0, 3].map(i => this.castleFlags[c][i]);
    const moves = super.getCastleMoves([x, y], finalSquares);
    this.castleFlags[c] = JSON.parse(saveFlags);
    return moves;
  }

};
