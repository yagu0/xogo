import ChessRules from "/js/base_rules.js";
import AbstractOnGridRules from "/variants/_OnGrid/class.js";
import PiPo from "/utils/PiPo.js";

export default class FanoronaRules extends AbstractOnGridRules {

  static get Options() {
    return {};
  }

  get hasFlags() {
    return false;
  }

  get hasEnpassant() {
    return false;
  }
  static get HasKing() {
    return false;
  }

  genRandInitBaseFen() {
    return {
      fen: "sssssssss/sssssssss/sSsS1sSsS/SSSSSSSSS/SSSSSSSSS",
      o: {}
    };
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Local stack of captures during a turn (squares + directions)
    this.captures = [];
  }

  get size() {
    return { x: 5, y: 9 };
  }

  getPiece() {
    return 's';
  }

  pieceDef(piece, color, x, y) {
    if (piece == 's') //stone
      return { "class": "stone" };
    // Arrow
    return {
      "class": "arrow-" + (piece.charCodeAt(0) >= 105 ? "behind" : "front")
    };
  }

  // a,b,c,d,e,f,g,h : dot on point, N to NO
  // i,j,k,l,m,n,o,p : dot on base, N to NO
  static ArrowToAngle(arrow) {
    let ccode = arrow.charCodeAt(0);
    if (ccode >= 105) { //i
      ccode -= 8;
      arrow = String.fromCharCode(ccode);
    }
    return (45 * (ccode - 97)) + "deg";
  }

  // Draw arrow
  setPieceBackground(domPiece, piece) {
    if (piece == 's')
      return;
    domPiece.style.setProperty('--rotate-by', V.ArrowToAngle(piece));
  }

  getPotentialMovesFrom([x, y], justCapt) {
    // After moving, add stones captured in "step" direction from new location
    // [x, y] to mv.vanish (if any captured stone!)
    const oppCol = C.GetOppTurn(this.turn);
    const addCapture = ([x, y], step, move) => {
      let [i, j] = [x + step[0], y + step[1]];
      while (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        this.getColor(i, j) == oppCol
      ) {
        move.vanish.push(new PiPo({ x: i, y: j, c: oppCol, p: 's' }));
        [i, j] = [i + step[0], j + step[1]];
      }
      return (move.vanish.length >= 2);
    };
    const stepToArrow = (s, forward) => {
      const baseShift = (forward ? 0 : 8),
            colShift = (this.playerColor=='w' ? 0 : 4);
      const doShift = (c) => {
        return String.fromCharCode(
          97 + (c.charCodeAt(0) - 97 + colShift) % 8 + baseShift);
      };
      switch (s) {
      case "-1_0": return doShift('a');
      case "-1_1": return doShift('b');
      case "0_1": return doShift('c');
      case "1_1": return doShift('d');
      case "1_0": return doShift('e');
      case "1_-1": return doShift('f');
      case "0_-1": return doShift('g');
      case "-1_-1": return doShift('h');
      }
      return ''; //never reached
    };
    const L = this.captures.length;
    if (L > 0) {
      const c = this.captures[L-1];
      if (x != c.square.x + c.step[0] || y != c.square.y + c.step[1])
        return (!justCapt ? [] : false);
    }
    let steps = super.pieceDef('r').both[0].steps;
    if ((x + y) % 2 == 0)
      steps = steps.concat(super.pieceDef('b').both[0].steps);
    let moves = [];
    for (let s of steps) {
      if (!justCapt && L > 0 && c.step[0] == s[0] && c.step[1] == s[1]) {
        // Add a move to say "I'm done capturing"
        moves.push(
          new Move({
            appear: [],
            vanish: [],
            start: { x: x, y: y },
            end: { x: x - s[0], y: y - s[1] }
          })
        );
        continue;
      }
      let [i, j] = [x + s[0], y + s[1]];
      if (this.captures.some(c => c.square.x == i && c.square.y == j))
        continue;
      if (this.onBoard(i, j) && this.board[i][j] == "") {
        // The move is possible. Might lead to 2 different captures
        let mv = super.getBasicMove([x, y], [i, j]);
        const capt = addCapture([i, j], s, mv);
        if (capt) {
          if (!!justCapt)
            return true;
          mv.choice = stepToArrow(s[0] + "_" + s[1], true);
          moves.push(mv);
          mv = super.getBasicMove([x, y], [i, j]); //cheap enough
        }
        const capt_bw = addCapture([x, y], [-s[0], -s[1]], mv);
        if (capt_bw) {
          if (!!justCapt)
            return true;
          mv.choice = stepToArrow(s[0] + "_" + s[1], false);
          moves.push(mv);
        }
        // Captures take priority (if available)
        if (!justCapt && !capt && !capt_bw && L == 0)
          moves.push(mv);
      }
    }
    return (!justCapt ? moves : false);
  }

  atLeastOneCapture() {
    const oppCol = C.GetOppTurn(this.turn);
    const L = this.captures.length;
    // Called after at least one capture, so L > 0
    if (L > 0) {
      const c = this.captures[L-1];
      return this.getPotentialMovesFrom([c.square.x, c.square.y], true);
    }
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == this.turn &&
          this.getPotentialMovesFrom([i, j], true)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  filterValid(moves) {
    return moves;
  }

  play(move) {
    this.playOnBoard(move);
    if (move.vanish.length >= 2) {
      this.captures.push({
        square: move.start,
        step: [move.end.x - move.start.x, move.end.y - move.start.y]
      });
      if (this.atLeastOneCapture())
        // There could be other captures (optional)
        move.notTheEnd = true;
    }
    if (!move.notTheEnd) {
      this.turn = C.GetOppTurn(this.turn);
      this.movesCount++;
      this.captures = [];
    }
  }

  getCurrentScore() {
    // If no stones on board, I lose
    if (
      this.board.every(b => {
        return b.every(cell => {
          return (cell == "" || cell[0] != this.turn);
        });
      })
    ) {
      return (this.turn == 'w' ? "0-1" : "1-0");
    }
    return "*";
  }

};
