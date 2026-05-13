import { ChessRules } from "@/js/base_rules";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";
import { ArrayFun } from "@/utils/array";

export default class EmergoRules extends ChessRules {

  // Simple encoding: A to L = 1 to 12, from left to right, if white controls.
  // Lowercase if black controls.
  // Single piece (no prisoners): A@ to L@ (+ lowercase)

  static get Options() {
    return null;
  }

  get hasFlags() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  // board element == piece class ref:
  board2fen(b) {
    return b;
  }
  fen2board(f) {
    return f;
  }

  getBoard(position) {
    const rows = position.split("/");
    let board = ArrayFun.init(this.size.x, this.size.y, "");
    for (let i = 0; i < rows.length; i++) {
      let j = 0;
      for (let indexInRow = 0; indexInRow < rows[i].length; indexInRow++) {
        const character = rows[i][indexInRow];
        const num = parseInt(character, 10);
        if (!isNaN(num))
          // If num is a number, just shift j:
          j += num;
        else
          // Something at position i,j
          board[i][j++] = this.fen2board(character + rows[i][++indexInRow]);
      }
    }
    return board;
  }

  getColor(x, y) {
    if (x >= this.size.x)
      return x == this.size.x ? "w" : "b";
    if (this.board[x][y].charCodeAt(0) < 97)
      return 'w';
    return 'b';
  }

  getPiece(x, y) {
    return this.board[x][y];
  }

  get size() {
    return { x: 9, y: 9 };
  }

  genRandInitBaseFen() {
    return { fen: "9/9/9/9/9/9/9/9/9 w 0 12,12", o: {} };
  }

  static get ReserveArray() {
    // Piece type doesn't matter
    return ['@']; //TODO ::



  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Local stack of captures during a turn (squares + directions)
    this.captures = [ [] ];
  }

  atLeastOneCaptureFrom([x, y], color, forbiddenStep) {
    for (let s of super.pieces()['b'].both[0].steps) {
      if (
        !forbiddenStep ||
        (s[0] != -forbiddenStep[0] || s[1] != -forbiddenStep[1])
      ) {
        const [i, j] = [x + s[0], y + s[1]];
        if (
          this.onBoard(i + s[0], j + s[1]) &&
          this.board[i][j] != "" &&
          this.getColor(i, j) != color &&
          this.board[i + s[0]][j + s[1]] == ""
        ) {
          return true;
        }
      }
    }
    return false;
  }

  atLeastOneCapture(color) {
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    if (L > 0) {
      return (
        this.atLeastOneCaptureFrom(
          captures[L-1].square, color, captures[L-1].step)
      );
    }
    for (let i = 0; i < this.size.x; i++) {
      for (let j=0; j< this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == color &&
          this.atLeastOneCaptureFrom([i, j], color)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  maxLengthIndices(caps) {
    let maxLength = 0;
    let res = [];
    for (let i = 0; i < caps.length; i++) {
      if (caps[i].length > maxLength) {
        res = [i];
        maxLength = caps[i].length;
      }
      else if (caps[i].length == maxLength)
        res.push(i);
    }
    return res;
  };

  getLongestCaptures_aux([x, y], color, locSteps) {
    let res = [];
    const L = locSteps.length;
    const lastStep = (L > 0 ? locSteps[L-1] : null);
    for (let s of super.pieces()['b'].both[0].steps) {
      if (!!lastStep && s[0] == -lastStep[0] && s[1] == -lastStep[1])
        continue;
      const [i, j] = [x + s[0], y + s[1]];
      if (
        this.onBoard(i + s[0], j + s[1]) &&
        this.board[i + s[0]][j + s[1]] == "" &&
        this.board[i][j] != "" &&
        this.getColor(i, j) != color
      ) {
        const move = this.getBasicMove([x, y], [i + s[0], j + s[1]], [i, j]);
        locSteps.push(s);
        this.playOnBoard(move);
        const nextRes =
          this.getLongestCaptures_aux([i + s[0], j + s[1]], color, locSteps);
        res.push(1 + nextRes);
        locSteps.pop();
        this.undoOnBoard(move);
      }
    }
    if (res.length == 0)
      return 0;
    return Math.max(...res);
  }

  getLongestCapturesFrom([x, y], color, locSteps) {
    let res = [];
    const L = locSteps.length;
    const lastStep = (L > 0 ? locSteps[L-1] : null);
    for (let s of super.pieces()['b'].both[0].steps) {
      if (!!lastStep && s[0] == -lastStep[0] && s[1] == -lastStep[1])
        continue;
      const [i, j] = [x + s[0], y + s[1]];
      if (
        this.onBoard(i + s[0], j + s[1]) &&
        this.board[i + s[0]][j + s[1]] == "" &&
        this.board[i][j] != "" &&
        this.getColor(i, j) != color
      ) {
        const move = this.getBasicMove([x, y], [i + s[0], j + s[1]], [i, j]);
        locSteps.push(s);
        this.playOnBoard(move);
        const stepRes =
          this.getLongestCaptures_aux([i + s[0], j + s[1]], color, locSteps);
        res.push({ step: s, length: 1 + stepRes });
        locSteps.pop();
        this.undoOnBoard(move);
      }
    }
    return this.maxLengthIndices(res).map(i => res[i]);;
  }

  getAllLongestCaptures(color) {
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    let caps = [];
    if (L > 0) {
      let locSteps = [ captures[L-1].step ];
      let res =
        this.getLongestCapturesFrom(captures[L-1].square, color, locSteps);
      Array.prototype.push.apply(
        caps,
        res.map(r => Object.assign({ square: captures[L-1].square }, r))
      );
    }
    else {
      for (let i = 0; i < this.size.x; i++) {
        for (let j=0; j < this.size.y; j++) {
          if (
            this.board[i][j] != "" &&
            this.getColor(i, j) == color
          ) {
            let locSteps = [];
            let res = this.getLongestCapturesFrom([i, j], color, locSteps);
            Array.prototype.push.apply(
              caps,
              res.map(r => Object.assign({ square: [i, j] }, r))
            );
          }
        }
      }
    }
    return this.maxLengthIndices(caps).map(i => caps[i]);
  }

  getBasicMove([x1, y1], [x2, y2], capt) {
    const cp1 = this.board[x1][y1];
    if (!capt) {
      return new Move({
        appear: [ new PiPo({ x: x2, y: y2, c: cp1[0], p: cp1[1] }) ],
        vanish: [ new PiPo({ x: x1, y: y1, c: cp1[0], p: cp1[1] }) ]
      });
    }
    // Compute resulting types based on jumped + jumping pieces
    const color = this.getColor(x1, y1);
    const firstCodes = (color == 'w' ? [65, 97] : [97, 65]);
    const cpCapt = this.board[capt[0]][capt[1]];
    let count1 = [cp1.charCodeAt(0) - firstCodes[0], -1];
    if (cp1[1] != '@')
      count1[1] = cp1.charCodeAt(1) - firstCodes[0];
    let countC = [cpCapt.charCodeAt(0) - firstCodes[1], -1];
    if (cpCapt[1] != '@')
      countC[1] = cpCapt.charCodeAt(1) - firstCodes[1];
    count1[1]++;
    countC[0]--;
    let colorChange = false,
        captVanish = false;
    if (countC[0] < 0) {
      if (countC[1] >= 0) {
        colorChange = true;
        countC = [countC[1], -1];
      }
      else
        captVanish = true;
    }
    const incPrisoners = String.fromCharCode(firstCodes[0] + count1[1]);
    let mv = new Move({
      appear: [
        new PiPo({
          x: x2,
          y: y2,
          c: cp1[0],
          p: incPrisoners
        })
      ],
      vanish: [
        new PiPo({ x: x1, y: y1, c: cp1[0], p: cp1[1] }),
        new PiPo({ x: capt[0], y: capt[1], c: cpCapt[0], p: cpCapt[1] })
      ]
    });
    if (!captVanish) {
      mv.appear.push(
        new PiPo({
          x: capt[0],
          y: capt[1],
          c: String.fromCharCode(
               firstCodes[(colorChange ? 0 : 1)] + countC[0]),
          p: (colorChange ? '@' : cpCapt[1]),
        })
      );
    }
    return mv;
  }


// TODO: + style
  getSquareColorClass(x, y) {
    return ((x+y) % 2 == 0 ? "dark-square": "light-square");
  }




  getDropMovesFrom([c, p]) {
    const color = c;
    if (!this.reserve[color] || this.atLeastOneCapture(color))
      return [];
    let moves = [];
    const oppCol = C.GetOppTurn(color);
    const shadowPiece =
      !this.reserve[oppCol]
        ? this.reserve[color]['p'] - 1
        : 0;
    const appearColor = String.fromCharCode(
      (color == 'w' ? 'A' : 'a').charCodeAt(0) + shadowPiece);
    const addMove = ([i, j]) => {
      moves.push(
        new Move({
          appear: [ new PiPo({ x: i, y: j, c: appearColor, p: '@' }) ],
          vanish: [],
          start: { x: this.size.x + (color == 'w' ? 0 : 1), y: 0 }
        })
      );
    };
    const opponentCanCapture = this.atLeastOneCapture(oppCol);
    for (let i = 0; i < this.size.x; i++) {
      for (let j = i % 2; j < this.size.y; j += 2) {
        if (
          this.board[i][j] == "" &&
          // prevent playing on central square at move 1:
          (this.movesCount >= 1 || i != 4 || j != 4)
        ) {
          if (opponentCanCapture)
            addMove([i, j]);
          else {
            let canAddMove = true;
            for (let s of super.pieces()['b'].both[0].steps) {
              if (
                this.onBoard(i + s[0], j + s[1]) &&
                this.onBoard(i - s[0], j - s[1]) &&
                this.board[i + s[0]][j + s[1]] != "" &&
                this.board[i - s[0]][j - s[1]] == "" &&
                this.getColor(i + s[0], j + s[1]) == oppCol
              ) {
                canAddMove = false;
                break;
              }
            }
            if (canAddMove)
              addMove([i, j]);
          }
        }
      }
    }
    return moves;
  }

  getPossibleMovesFrom([x, y], longestCaptures) {
    if (x >= this.size.x) {
      if (longestCaptures.length == 0)
        return this.getReserveMoves(x);
      return [];
    }
    const color = this.turn;
    if (!!this.reserve[color] && !this.atLeastOneCapture(color))
      return [];
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    let moves = [];
    if (longestCaptures.length > 0) {
      if (
        L > 0 &&
        (x != captures[L-1].square[0] || y != captures[L-1].square[1])
      ) {
        return [];
      }
      longestCaptures.forEach(lc => {
        if (lc.square[0] == x && lc.square[1] == y) {
          const s = lc.step;
          const [i, j] = [x + s[0], y + s[1]];
          moves.push(this.getBasicMove([x, y], [i + s[0], j + s[1]], [i, j]));
        }
      });
      return moves;
    }
    // Just search simple moves:
    for (let s of V.steps[V.BISHOP]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (this.onBoard(i, j) && this.board[i][j] == "")
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    const longestCaptures = this.getAllLongestCaptures(this.getColor(x, y));
    return this.getPossibleMovesFrom([x, y], longestCaptures);
  }

  filterValid(moves) {
    return moves;
  }

  play(move) {
    const color = this.turn;
    move.turn = color; //for undo
    V.PlayOnBoard(this.board, move);
    if (move.vanish.length == 2) {
      const L0 = this.captures.length;
      let captures = this.captures[L0 - 1];
      captures.push({
        square: [move.end.x, move.end.y],
        step: [(move.end.x - move.start.x)/2, (move.end.y - move.start.y)/2]
      });
      if (this.atLeastOneCapture(color))
        // There could be other captures (mandatory)
        move.notTheEnd = true;
    }
    else if (move.vanish == 0) {
      const firstCode = (color == 'w' ? 65 : 97);
      // Generally, reserveCount == 1 (except for shadow piece)
      const reserveCount = move.appear[0].c.charCodeAt() - firstCode + 1;
      this.reserve[color][V.PAWN] -= reserveCount;
      if (this.reserve[color][V.PAWN] == 0) this.reserve[color] = null;
    }
    if (!move.notTheEnd) {
      this.turn = V.GetOppCol(color);
      this.movesCount++;
      this.captures.push([]);
    }
  }

  atLeastOneMove() {
    const color = this.turn;
    if (this.atLeastOneCapture(color))
      return true;
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.board[i][j] != "" && this.getColor(i, j) == color) {
          const moves = this.getPossibleMovesFrom([i, j], []);
          if (moves.length > 0)
            return true;
        }
      }
    }


    // TODO: adapt
    const reserveMoves =
      this.getReserveMoves(this.size.x + (this.turn == "w" ? 0 : 1));
    return (reserveMoves.length > 0);
  }



  getCurrentScore() {
    const color = this.turn;
    const testColorCode = (c) => {
      return (c <= 90 && color == 'w') || (c >= 97 && color == 'b');
    };
    // If no pieces on board + reserve, I lose
    if (!!this.reserve[color])
      return "*";
    const atLeastOnePiece = this.board.some(row => row.some(cell => {
      return cell != "" && testColorCode(cell.charCodeAt(0));
    });
    if (!atLeastOnePiece)
      return (color == 'w' ? "0-1" : "1-0");
    if (!this.atLeastOneMove())
      return "1/2";
    return "*";
  }

};
