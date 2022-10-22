import ChessRules from "/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js";

export default class AmbiguousRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: ["cylinder"]
    };
  }

  get hasFlags() {
    return false;
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    if (this.movesCount == 0)
      this.subTurn = 2;
    else
      this.subTurn = 1;
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        diffCol: ['b']
      }
    );
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {}
    };
  }

  canStepOver(x, y) {
    return this.board[x][y] == "" || this.getPiece(x, y) == V.GOAL;
  }

  // Subturn 1: play a move for the opponent on the designated square.
  // Subturn 2: play a move for me (which just indicate a square).
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    if (this.subTurn == 2) {
      // Just play a normal move (which in fact only indicate a square)
      let movesHash = {};
      return (
        super.getPotentialMovesFrom([x, y])
        .filter(m => {
          // Filter promotions: keep only one, since no choice for now.
          if (m.appear[0].p != m.vanish[0].p) {
            const hash = C.CoordsToSquare(m.start) + C.CoordsToSquare(m.end);
            if (!movesHash[hash]) {
              movesHash[hash] = true;
              return true;
            }
            return false;
          }
          return true;
        })
        .map(m => {
          if (m.vanish.length == 1)
            m.appear[0].p = V.GOAL;
          else {
            m.appear[0].p = V.TARGET_CODE[m.vanish[1].p];
            m.appear[0].c = m.vanish[1].c;
          }
          m.vanish.shift();
          return m;
        })
      );
    }
    // At subTurn == 1, play a targeted move for the opponent.
    // Search for target:
    let target = {x: -1, y: -1};
    outerLoop: for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.board[i][j] != "") {
          const piece = this.getPiece(i, j);
          if (
            piece == V.GOAL ||
            Object.keys(V.TARGET_DECODE).includes(piece)
          ) {
            target = {x: i, y:j};
            break outerLoop;
          }
        }
      }
    }
    const moves = super.getPotentialMovesFrom([x, y], oppCol);
    return moves.filter(m => m.end.x == target.x && m.end.y == target.y);
  }

  canIplay(x, y) {
    const color = this.getColor(x, y);
    return (
      (this.subTurn == 1 && ![this.turn, this.playerColor].includes(color)) ||
      (this.subTurn == 2 && super.canIplay(x, y))
    );
  }

  // Code for empty square target
  static get GOAL() {
    return 'g';
  }

  static get TARGET_DECODE() {
    return {
      's': 'p',
      't': 'q',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      'l': 'k'
    };
  }

  static get TARGET_CODE() {
    return {
      'p': 's',
      'q': 't',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'k': 'l'
    };
  }

  pieces(color, x, y) {
    const targets = {
      's': {"class": "target-pawn"},
      'u': {"class": "target-rook"},
      'o': {"class": "target-knight"},
      'c': {"class": "target-bishop"},
      't': {"class": "target-queen"},
      'l': {"class": "target-king"}
    };
    return Object.assign({ 'g': {"class": "target"} },
      targets, super.pieces(color, x, y));
  }

  atLeastOneMove() {
    // Since there are no checks this seems true (same as for Magnetic...)
    return true;
  }

  filterValid(moves) {
    return moves;
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return ['k', 'l'].includes(p);
  }

  getCurrentScore() {
    // This function is only called at subTurn 1
    const color = C.GetOppCol(this.turn);
    if (this.searchKingPos(color).length == 0)
      return (color == 'w' ? "0-1" : "1-0");
    return "*";
  }

  postPlay(move) {
    const color = this.turn;
    if (this.subTurn == 2 || this.searchKingPos(color).length == 0) {
      this.turn = C.GetOppCol(color);
      this.movesCount++;
    }
    this.subTurn = 3 - this.subTurn;
  }

};
