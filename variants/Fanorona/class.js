import ChessRules from "/js/base_rules.js";
import WeiqiRules from "/variants/Weiqi/class.js";
// TODO: PiPo

export default class FanoronaRules extends ChessRules {

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
      fen: "sssssssss/sssssssss/sSsS1sSsS/SSSSSSSSS/SSSSSSSSS w 0",
      o: {}
    };
  }

  setOtherVariables(fen) {
    // Local stack of captures during a turn (squares + directions)
    this.captures = [ [] ]; //TODO
  }

  get size() {
    return { x: 5, y: 9 };
  }

  getSvgChessboard() {
    return WeiqiRules.SvgChessboard_share(
      this.playerColor, this.size, this.coordsToId);
  }

  getPiece() {
    return 's';
  }

  pieceDef(piece, color, x, y) {
    if (piece == 's') //stone
      return { "class": "stone" };
    // Arrow
    if (piece.charCodeAt(0) >= 105) {
      return {
        "class": "arrow-" + (piece.charCodeAt(0) >= 105 ? "base" : "point")
      };
    }
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
    if (piece == 'p')
      return;
    domPiece.style.setProperty('--rotate-by', V.ArrowToAngle(piece));
  }

  // After moving, add stones captured in "step" direction from new location
  // [x, y] to mv.vanish (if any captured stone!)
  addCapture([x, y], step, move) {
    let [i, j] = [x + step[0], y + step[1]];
    const oppCol = V.GetOppCol(move.vanish[0].c);
    while (
      this.onBoard(i, j) &&
      this.board[i][j] != "" &&
      this.getColor(i, j) == oppCol
    ) {
      move.vanish.push(new PiPo({ x: i, y: j, c: oppCol, p: 's' }));
      [i, j] = [i + step[0], j + step[1]];
    }
    return (move.vanish.length >= 2);
  }


  // TODO from here


  getPotentialMovesFrom([x, y]) {
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    if (L > 0) {
      var c = captures[L-1];
      if (x != c.square.x + c.step[0] || y != c.square.y + c.step[1])
        return [];
    }
    const oppCol = V.GetOppCol(this.turn);
    let steps = V.steps[V.ROOK];
    if ((x + y) % 2 == 0) steps = steps.concat(V.steps[V.BISHOP]);
    let moves = [];
    for (let s of steps) {
      if (L > 0 && c.step[0] == s[0] && c.step[1] == s[1]) {
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
      if (captures.some(c => c.square.x == i && c.square.y == j)) continue;
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        // The move is potentially allowed. Might lead to 2 different captures ---------> TODO
        let mv = super.getBasicMove([x, y], [i, j]);
        const capt = this.addCapture([i, j], s, mv);
        if (capt) {
          moves.push(mv);
          mv = super.getBasicMove([x, y], [i, j]);
        }
        const capt_bw = this.addCapture([x, y], [-s[0], -s[1]], mv);
        if (capt_bw) moves.push(mv);
        // Captures take priority (if available)
        if (!capt && !capt_bw && L == 0) moves.push(mv);
      }
    }
    return moves;
  }

  atLeastOneCapture() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    if (L > 0) {
      // If some adjacent enemy stone, with free space to capture it,
      // toward a square not already visited, through a different step
      // from last one: then yes.
      const c = captures[L-1];
      const [x, y] = [c.square.x + c.step[0], c.square.y + c.step[1]];
      let steps = V.steps[V.ROOK];
      if ((x + y) % 2 == 0) steps = steps.concat(V.steps[V.BISHOP]);
      // TODO: half of the steps explored are redundant
      for (let s of steps) {
        if (s[0] == c.step[0] && s[1] == c.step[1]) continue;
        const [i, j] = [x + s[0], y + s[1]];
        if (
          !V.OnBoard(i, j) ||
          this.board[i][j] != V.EMPTY ||
          captures.some(c => c.square.x == i && c.square.y == j)
        ) {
          continue;
        }
        if (
          V.OnBoard(i + s[0], j + s[1]) &&
          this.board[i + s[0]][j + s[1]] != V.EMPTY &&
          this.getColor(i + s[0], j + s[1]) == oppCol
        ) {
          return true;
        }
        if (
          V.OnBoard(x - s[0], y - s[1]) &&
          this.board[x - s[0]][y - s[1]] != V.EMPTY &&
          this.getColor(x - s[0], y - s[1]) == oppCol
        ) {
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          // TODO: this could be more efficient
          this.getPotentialMovesFrom([i, j]).some(m => m.vanish.length >= 2)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length >= 2);
  }

  getPossibleMovesFrom(sq) {
    let moves = this.getPotentialMovesFrom(sq);
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    if (captures.length > 0) return this.getPotentialMovesFrom(sq);
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  play(move) {
    const color = this.turn;
    move.turn = color; //for undo
    V.PlayOnBoard(this.board, move);
    if (move.vanish.length >= 2) {
      const L0 = this.captures.length;
      let captures = this.captures[L0 - 1];
      captures.push({
        square: move.start,
        step: [move.end.x - move.start.x, move.end.y - move.start.y]
      });
      if (this.atLeastOneCapture())
        // There could be other captures (optional)
        move.notTheEnd = true;
    }
    if (!move.notTheEnd) {
      this.turn = V.GetOppCol(color);
      this.movesCount++;
      this.captures.push([]);
    }
  }

  getCurrentScore() {
    const color = this.turn;
    // If no stones on board, I lose
    if (
      this.board.every(b => {
        return b.every(cell => {
          return (cell == "" || cell[0] != color);
        });
      })
    ) {
      return (color == 'w' ? "0-1" : "1-0");
    }
    return "*";
  }

};
