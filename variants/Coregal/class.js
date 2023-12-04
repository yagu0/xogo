import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, sample } from "@/utils/alea";

export class CoregalRules extends ChessRules {

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'l', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: 'r'}, {p1: 'l', p2: 'r'}],
        diffCol: ['b'],
        // 'k' and 'l' useful only to get relative position
        flags: ['r', 'k', 'l']
      }
    );
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      // TODO: re-arrange flags, use another init variable "relPos" (in o)
      // (maybe after FEN parsing, easier?)
      o: {flags: s.flags + s.flags} //second set for royal queen
    };
  }

  pieces() {
    let res = super.pieces();
    res['l'] = JSON.parse(JSON.stringify(res['q']));
    // TODO: CSS royal queen symbol (with cross?)
    res['l']["class"] = "royal_queen";
    return res;
  }

  // TODO: something like that indeed (+ flags to FEN)
  setFlags(fenflags) {
    this.castleFlags = {
      'k': { 'w': [...Array(4)], b: [...Array(4)] },
      'l': { 'w': [...Array(4)], b: [...Array(4)] }
    };
    for (let i = 0; i < 8; i++) {
      this.castleFlags[i < 4 ? "k" : "l"][i % 4 < 2 ? "w" : "b"] =
        parseInt(fenflags.charAt(i), 10);
    }
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    ['k', 'l'].includes(p); //no cannibal mode
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y),
          p = this.getPiece(x, y);
    // Relative position of the selected piece: left or right ?
    // If left: small castle left, large castle right.
    // If right: usual situation.
    const finalSquares = [
      this.relPos[c][p] == "left" ? [1, 2] : [2, 3],
      this.relPos[c][p] == "right" ? [6, 5] : [5, 4]
    ];
    const moves =
      super.getCastleMoves([x, y], finalSquares, null, this.castleFlags[p]);
    return moves;
  }

  // TODO: updateFlags (just pass castleFlags arg)

};
