import ChessRules from "/js/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";
import { ArrayFun } from "/utils/array.js";

export default class EmergoRules extends ChessRules {

  // Simple encoding: A to L = 1 to 12, from left to right, if white controls.
  // Lowercase if black controls.
  // Single piece (no prisoners): A@ to L@ (+ lowercase)

  static get Options() {
    return {};
  }

  get hasFlags() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }
  get hasReserve() {
    return true;
  }
  static get HasKing() {
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

  getSquareColorClass(x, y) {
    return ((x+y) % 2 == 0 ? "dark-square": "light-square");
  }

  get size() {
    return { x: 9, y: 9 };
  }

  genRandInitBaseFen() {
    return { fen: "9/9/9/9/9/9/9/9/9", o: {} };
  }

  static get NewGameReserves() {
    return "c00c"; //c in hex = 12
  }

  static get ReserveArray() {
    return ["A@", "a@"];
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Last capture during a turn (square + direction)
    this.lastCapture = null;
    // Compute pieces drawings when required, and cache it:
    this.svgEncodedPieces = {};
  }

  getColor(x, y) {
    // TODO: if typeof x === "string" return x ?
    const sq = (typeof y == "string" ? y : this.board[x][y]);
    return sq.charCodeAt(0) < 92 ? 'w' : 'b';
  }

  getPiece(x, y) {
    // Both characters required to describe the (aggregated) "piece"
    return this.board[x][y];
  }

  pieceDef() {
    // Captures handled in getPotentialMoves() directly
    return {
      moves: [{ steps: [ [-1, -1], [-1, 1], [1, -1], [1, 1] ] }],
      "class": "emergo-piece",
    };
  }

  static GetSvgNumber(n, position) {
    switch (position) {
    case "full": {
      switch (n) {
      case 1: //unused
        return '<path d="M130,85 v60"';
      case 2:
        return '<path d="M100,85 h30 v30 h-30 v30 h30"';
      case 3:
        return '<path d="M100,85 h30 v30 h-30 M130,115 v30 h-30"';
      case 4:
        return '<path d="M100,85 v30 h30 v30 M130,85 v30"';
      case 5:
        return '<path d="M130,85 h-30 v30 h30 v30 h-30"';
      case 6:
        return '<path d="M130,85 h-30 v60 h30 v-30 h-30"';
      case 7:
        return '<path d="M100,85 h30 v60"';
      case 8:
        return '<path d="M100,85 h30 v60 h-30 z M100,115 h30"';
      case 9:
        return '<path d="M100,135 h30 v-60 h-30 v30 h30"';
      case 10:
        return '<path d="M95,85 v60 M105,85 h30 v60 h-30 v-60"';
      case 11:
        return '<path d="M95,85 v60 M135,85 v60"';
      case 12:
        return '<path d="M95,85 v60 M105,85 h30 v30 h-30 v30 h30"';
      }
    }
    case "top": {
      switch (n) {
      case 1: //unused here
        return '<path d="M130,35 v60"';
      case 2:
        return '<path d="M100,35 h30 v30 h-30 v30 h30"';
      case 3:
        return '<path d="M100,35 h30 v30 h-30 M130,65 v30 h-30"';
      case 4:
        return '<path d="M100,35 v30 h30 v30 M130,35 v30"';
      case 5:
        return '<path d="M130,35 h-30 v30 h30 v30 h-30"';
      case 6:
        return '<path d="M130,35 h-30 v60 h30 v-30 h-30"';
      case 7:
        return '<path d="M100,35 h30 v60"';
      case 8:
        return '<path d="M100,35 h30 v60 h-30 z M100,65 h30"';
      case 9:
        return '<path d="M100,95 h30 v-60 h-30 v30 h30"';
      case 10:
        return '<path d="M90,35 v60 M100,35 h30 v60 h-30 v-60"';
      case 11:
        return '<path d="M90,35 v60 M130,35 v60"';
      case 12:
        return '<path d="M90,35 v60 M100,35 h30 v30 h-30 v30 h30"';
      }
    }
    case "bottom": {
      switch (n) {
      case 1: //unused here
        return '<path d="M130,135 v60"';
      case 2:
        return '<path d="M100,135 h30 v30 h-30 v30 h30"';
      case 3:
        return '<path d="M100,135 h30 v30 h-30 M130,165 v30 h-30"';
      case 4:
        return '<path d="M100,135 v30 h30 v30 M130,135 v30"';
      case 5:
        return '<path d="M130,135 h-30 v30 h30 v30 h-30"';
      case 6:
        return '<path d="M130,135 h-30 v60 h30 v-30 h-30"';
      case 7:
        return '<path d="M100,135 h30 v60"';
      case 8:
        return '<path d="M100,135 h30 v60 h-30 z M100,165 h30"';
      case 9:
        return '<path d="M100,195 h30 v-60 h-30 v30 h30"';
      case 10:
        return '<path d="M90,135 v60 M100,135 h30 v60 h-30 v-60"';
      case 11:
        return '<path d="M90,135 v60 M130,135 v60"';
      case 12:
        return '<path d="M90,135 v60 M100,135 h30 v30 h-30 v30 h30"';
      }
    }}
    return ""; //never reached
  }

  static CharToNum(x, index) {
    const baseCharCode = {'w': 65, 'b': 97};
    if (!index)
      index = [0, 1];
    else if (!Array.isArray(index))
      index = [index];
    let res = index.map(i => {
      color = (x.charCodeAt(i) < 92 ? 'w' : 'b');
      return {
        num: piece.charCodeAt(i) - baseCharCode[color] + 1,
        col: color
      };
    });
    if (res.length == 1)
      return res[0];
    return res;
  }

  // Compute piece drawing
  getSvgEncodedPiece(piece) {
    if (this.svgEncodedPieces[piece])
      return this.svgEncodedPieces[piece];

    let rawSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 230"
           width="100%" height="100%">`;
    const numCol = V.CharToNum(piece);
    if (piece.charAt(1) == '@') {
      // Pièce simple : 'A@' à 'L@' ou 'a@' à 'l@'
      rawSvg += `
        <circle cx="115" cy="115" r="100"
                fill="${numCol[0].col=='w' ? 'whitesmoke' : 'black'}"
                ${numCol[0].col=='w' ? 'stroke="saddlebrown"' : ''}
        />`;
      if (numCol[0].num > 1) {
        rawSvg += V.GetSvgNumber(numCol[0].num, "full") + `
                    fill="none" stroke-width="5"
                    stroke="${numCol[0].col=='w' ? 'red' : 'orange'}"
                  />`;
      }
    }
    else { //composite
      rawSvg += `<defs>
        <mask id="stripe">
          <rect width="230" height="230" fill="white"/>
          <rect y="115" width="230" height="115"/>
        </mask>
      </defs>
      <circle cx="115" cy="115" r="100"
              fill="${numCol[0].col=='b' ? 'whitesmoke' : 'black'}"
              ${numCol[0].col=='b' ? 'stroke="saddlebrown"' : ''}
      />
      <circle cx="115" cy="115" r="100"
              fill="${numCol[0].col=='w' ? 'whitesmoke' : 'black'}"
              ${numCol[0].col=='w' ? 'stroke="saddlebrown"' : ''}
              mask="url(#stripe)"
      />`;
      if (numCol[0].num > 1) {
        rawSvg += V.GetSvgNumber(numCol[0].num, "top") + `
                    fill="none" stroke-width="5"
                    stroke="${numCol[0].col=='w' ? 'red' : 'orange'}"
                  />`
      }
      if (numCol[1].num > 1) {
        rawSvg += V.GetSvgNumber(numCol[1].num, "bottom") + `
                    fill="none" stroke-width="5"
                    stroke="${numCol[0].col=='b' ? 'red' : 'orange'}"
                  />`;
      }
    }
    rawSvg += "</svg>";

    // On encode le SVG pour qu'il soit lisible dans un "url()" CSS
    //const encodedSvg = btoa(unescape(encodeURIComponent(rawSvg)));
    const encodedSvg = encodeURIComponent(rawSvg).replace(/#/g, '%23');
    this.svgEncodedPieces[piece] = encodedSvg;
    return encodedSvg;
  }

  // Draw piece
  setPieceBackground(domPiece, piece) {
    const encodedSvg = this.getSvgEncodedPiece(piece);
    domPiece.style.setProperty('--piece-img',
      `url('data:image/svg+xml;utf8,${encodedSvg}')`); //;base64
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
    if (!!this.lastCapture) {
      return (
        this.atLeastOneCaptureFrom(
          this.lastCapture.square, color, this.lastCapture.step)
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

  // Return the array "arg_max(caps)" (mult. if ex-aequo)
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
    const lastStep = locSteps[ locSteps.length - 1 ];
    for (let s of this.pieceDef().moves[0].steps) {
      if (s[0] == -lastStep[0] && s[1] == -lastStep[1])
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
    for (let s of this.pieceDef().moves[0].steps) {
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
    let caps = [];
    if (this.lastCapture) {
      let locSteps = [ this.lastCapture.step ];
      let res =
        this.getLongestCapturesFrom(this.lastCapture.square, color, locSteps);
      Array.prototype.push.apply(
        caps,
        res.map(r => Object.assign({ square: this.lastCapture.square }, r))
      );
    }
    else {
      for (let i = 0; i < this.size.x; i++) {
        for (let j=0; j < this.size.y; j++) {
          if (this.board[i][j] != "" && this.getColor(i, j) == color) {
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
    const numCol1 = V.CharToNum(this.board[x1][y1]),
          numColC = V.CharToNum(this.board[capt[0]][capt[1]]);
    let mv = new Move({
      appear: [
        new PiPo({
          x: x2,
          y: y2,
          c: numCol1[0].col,
          p: this.board[x1][y1].charAt(0) +
             String.fromCharCode(this.board[x1][y1].charCodeAt(1) + 1)
        })
      ],
      vanish: [
        new PiPo({
          x: x1,
          y: y1,
          c: numCol1[0].col,
          p: this.board[x1][y1]
        }),
        new PiPo({
          x: capt[0],
          y: capt[1],
          c: numColC[0].col,
          p: this.board[capt[0]][capt[1]]
        })
      ]
    });
    if (numColC[0].num >= 2 || numColC[1].num >= 1) {
      mv.appear.push(
        new PiPo({
          x: capt[0],
          y: capt[1],
          c: numColC[0].num >= 2 ? numColC[0].col : numColC[1].col,
          p: (numColC[0].num >= 2
            ? String.fromCharCode(
                this.board[capt[0]][capt[1]].charCodeAt(0) - 1) +
              this.board[capt[0]][capt[1]].charAt(1)
            : this.board[capt[0]][capt[1]].charAt(1) + '@') //color change
        })
      );
    }
    return mv;
  }


  // TODO: finish from here


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
            for (let s of super.pieceDef('b').both[0].steps) {
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
    if (typeof x === "string") {
      if (longestCaptures.length == 0)
        return this.getDropMovesFrom([x, y]);
      return [];
    }
    const color = this.turn;
    if (!!this.reserve[color] && !this.atLeastOneCapture(color))
      return [];
    let moves = [];
    if (longestCaptures.length > 0) {
      if (
        !!this.lastCapture &&
        (x != this.lastCapture.square[0] || y != this.lastCapture.square[1])
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
    for (let s of this.pieceDef().moves[0].steps) {
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
    this.playOnBoard(move);
    if (move.vanish.length == 2) {
      this.lastCapture = {
        square: [move.end.x, move.end.y],
        step: [(move.end.x - move.start.x)/2, (move.end.y - move.start.y)/2]
      };
      if (this.atLeastOneCapture(color))
        // There could be other captures (mandatory)
        move.notTheEnd = true;
    }
    else if (move.vanish == 0) { //drop
      const firstCode = (color == 'w' ? 65 : 97);
      // Generally, reserveCount == 1 (except for shadow piece)
      const reserveCount = move.appear[0].c.charCodeAt() - firstCode + 1;
      this.reserve[color]["a@"] -= reserveCount;
      if (this.reserve[color]["a@"] == 0) this.reserve[color] = null;
    }
    if (!move.notTheEnd) {
      this.turn = C.GetOppTurn(color);
      this.movesCount++;
      this.lastCapture = null;
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
    const reserveMoves =
      this.getDropMovesFrom([color, (color=='w' ? 'A' : 'a') + '@']);
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
    }));
    if (!atLeastOnePiece)
      return (color == 'w' ? "0-1" : "1-0");
    if (!this.atLeastOneMove())
      return "1/2";
    return "*";
  }

};
