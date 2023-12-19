import ChessRules from "/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js"

export default class CoregalRules extends ChessRules {

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
    // Re-arrange flags: king + royal queen positions are only
    // useful to know ordering, and thus allowed castles.
    let flags = "";
    let relPos = { 'w': {}, 'b': {} };
    for (let c of [0, 1]) {
      const col = (c == 0 ? 'w' : 'b');
      let first = "";
      for (let i=4*c; i<4*(c+1); i++) {
        const pos = parseInt(s.flags.charAt(i), 10);
        const symb = s[col][pos];
        if (['k', 'l'].includes(symb)) {
          if (!first) {
            relPos[col][symb] = '0'; //left
            first = symb;
          }
          else
            relPos[col][symb] = '1'; //right
        }
        else
          flags += s.flags.charAt(i);
      }
    }
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {
        flags: flags + flags, //duplicate: one for each royal piece
        relPos: this.getRelposFen(relPos)
      }
    };
  }

  getPartFen(o) {
    return (Object.assign(
      {"relpos": o.init ? o.relPos : this.getRelposFen()},
      super.getPartFen(o)
    ));
  }

  getRelposFen(relPos) {
    relPos = relPos || this.relPos;
    return (
      relPos['w']['k'] + relPos['w']['l'] +
      relPos['b']['k'] + relPos['b']['l']
    );
  }

  setOtherVariables(fenParsed, pieceArray) {
    super.setOtherVariables(fenParsed, pieceArray);
    this.relPos = {
      'w': {
        'k': fenParsed.relpos[0],
        'l': fenParsed.relpos[1]
      },
      'b': {
        'k': fenParsed.relpos[2],
        'l': fenParsed.relpos[3]
      }
    };
  }

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    res['l'] = JSON.parse(JSON.stringify(res['q']));
    // TODO: CSS royal queen symbol (with cross?)
    res['l']["class"] = "royal_queen";
    res['='] = {"class": "castle"}; //for castle display
    return res;
  }

  setFlags(fenflags) {
    this.castleFlags = {
      k: {
        w: [0, 1].map(i => parseInt(fenflags.charAt(i), 10)),
        b: [2, 3].map(i => parseInt(fenflags.charAt(i), 10))
      },
      l: {
        w: [4, 5].map(i => parseInt(fenflags.charAt(i), 10)),
        b: [6, 7].map(i => parseInt(fenflags.charAt(i), 10))
      }
    };
  }

  getFlagsFen() {
    return ['k', 'l'].map(p => {
      return ['w', 'b'].map(c => {
        return this.castleFlags[p][c].map(x => x.toString(10)).join("");
      }).join("")
    }).join("");
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return ['k', 'l'].includes(p); //no cannibal mode
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y),
          p = this.getPiece(x, y);
    // Relative position of the selected piece: left or right ?
    // If left: small castle left, large castle right.
    // If right: usual situation.
    const finalSquares = [
      this.relPos[c][p] == '0' ? [1, 2] : [2, 3], //0 == left
      this.relPos[c][p] == '1' ? [6, 5] : [5, 4] //1 == right
    ];
    let moves =
      super.getCastleMoves([x, y], finalSquares, null, this.castleFlags[p][c]);
    if (p == 'l')
      moves.forEach(m => m.choice = '='); //required (for display)
    return moves;
  }

  updateCastleFlags(move) {
    super.updateCastleFlags(move, this.castleFlags['k'], 'k');
    super.updateCastleFlags(move, this.castleFlags['l'], 'l');
  }

};
