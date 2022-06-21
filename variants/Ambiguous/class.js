import ChessRules from "/base_rules.js";
import { randInt, shuffle } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export default class AmbiguousRules extends ChessRules {

  // TODO: options

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

  genRandInitFen(seed) {
    const gr = new GiveawayRules(
      {mode: "suicide", options: this.options, genFenOnly: true});
    return gr.genRandInitFen(seed);
  }

  // Subturn 1: play a move for the opponent on the designated square.
  // Subturn 2: play a move for me (which just indicate a square).
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    if (this.subTurn == 2) {
      // Just play a normal move (which in fact only indicate a square)
      let movesHash = {};
      return (
        super.getPotentialMovesFrom([x, y])
        .filter(m => {
          // Filter promotions: keep only one, since no choice now.
          if (m.appear[0].p != m.vanish[0].p) {
            const hash = V.CoordsToSquare(m.start) + V.CoordsToSquare(m.end);
            if (!movesHash[hash]) {
              movesHash[hash] = true;
              return true;
            }
            return false;
          }
          return true;
        })
        .map(m => {
          if (m.vanish.length == 1) m.appear[0].p = V.GOAL;
          else m.appear[0].p = V.TARGET_CODE[m.vanish[1].p];
          m.appear[0].c = oppCol;
          m.vanish.shift();
          return m;
        })
      );
    }
    // At subTurn == 1, play a targeted move for opponent
    // Search for target (we could also have it in a stack...)
    let target = { x: -1, y: -1 };
    outerLoop: for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const piece = this.board[i][j][1];
          if (
            piece == V.GOAL ||
            Object.keys(V.TARGET_DECODE).includes(piece)
          ) {
            target = { x: i, y: j};
            break outerLoop;
          }
        }
      }
    }
    // TODO: could be more efficient than generating all moves.
    this.turn = oppCol;
    const emptyTarget = (this.board[target.x][target.y][1] == V.GOAL);
    if (emptyTarget) this.board[target.x][target.y] = V.EMPTY;
    let moves = super.getPotentialMovesFrom([x, y]);
    if (emptyTarget) {
      this.board[target.x][target.y] = color + V.GOAL;
      moves.forEach(m => {
        m.vanish.push({
          x: target.x,
          y: target.y,
          c: color,
          p: V.GOAL
        });
      });
    }
    this.turn = color;
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

  pieces() {
    // .........
  }

  atLeastOneMove() {
    // Since there are no checks this seems true (same as for Magnetic...)
    return true;
  }

  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    // This function is only called at subTurn 1
    const color = V.GetOppCol(this.turn);
    if (this.kingPos[color][0] < 0) return (color == 'w' ? "0-1" : "1-0");
    return "*";
  }

  play(move) {
    let kingCaptured = false;
    if (this.subTurn == 1) {
      this.prePlay(move);
      this.epSquares.push(this.getEpSquare(move));
      kingCaptured = this.kingPos[this.turn][0] < 0;
    }
    if (kingCaptured) move.kingCaptured = true;
    V.PlayOnBoard(this.board, move);
    if (this.subTurn == 2 || kingCaptured) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
    }
    if (!kingCaptured) this.subTurn = 3 - this.subTurn;
  }

};
