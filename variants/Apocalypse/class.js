import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";

export default class ApocalypseRules extends ChessRules {

  static get Options() {
    return {};
  }

  get hasFlags() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }
  get hideMoves() {
    return true;
  }

  get pawnPromotions() {
    return ['n', 'p'];
  }

  get size() {
    return {x: 5, y: 5};
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Often a simple move, but sometimes an array (pawn relocation)
    this.whiteMove = fenParsed.whiteMove != "-"
      ? JSON.parse(fenParsed.whiteMove)
      : [];
    this.firstMove = null; //used if black turn pawn relocation
    this.penalties = ArrayFun.toObject(
      ['w', 'b'],
      [0, 1].map(i => parseInt(fenParsed.penalties.charAt(i), 10))
    );
  }

  genRandInitBaseFen() {
    return {
      fen: "npppn/p3p/5/P3P/NPPPN",
      o: {}
    };
  }

  getPartFen(o) {
    return {
      whiteMove: (o.init || !this.whiteMove) ? "-" : this.whiteMove,
      penalties: o.init ? "00" : Object.values(this.penalties).join("")
    };
  }

  getWhitemoveFen() {
    if (this.whiteMove.length == 0)
      return "-";
    if (this.whiteMove.length == 1)
      return JSON.stringify(this.whiteMove[0]);
    return JSON.stringify(this.whiteMove); //pawn relocation
  }

  // Allow pawns to move diagonally and capture vertically,
  // because some of these moves might be valid a posteriori.
  // They will be flagged as 'illegal' in a first time, however.
  pieces(color, x, y) {
    const pawnShift = (color == "w" ? -1 : 1);
    return {
      'p': {
        "class": "pawn",
        moves: [
          {
            steps: [[pawnShift, 0], [pawnShift, -1], [pawnShift, 1]],
            range: 1
          }
        ],
      },
      'n': super.pieces(color, x, y)['n']
    };
  }

  // Allow self-captures, because they might be valid
  // if opponent takes on the same square (luck...)
  canTake() {
    return true;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    if (this.subTurn == 2) {
      const start = this.firstMove.end;
      if (x == start.x && y == start.y) {
        // Move the pawn to any empty square not on last rank (== x)
        for (let i=0; i<this.size.x; i++) {
          if (i == x)
            continue;
          for (let j=0; j<this.size.y; j++) {
            if (this.board[i][j] == "")
              moves.push(this.getBasicMove([x, y], [i, j]));
          }
        }
      }
    }
    else {
      const oppCol = C.GetOppCol(this.getColor(x, y));
      moves = super.getPotentialMovesFrom([x, y]).filter(m => {
        // Remove pawn push toward own color (absurd)
        return (
          m.vanish[0].p != 'p' ||
          m.end.y != m.start.y ||
          m.vanish.length == 1 ||
          m.vanish[1].c == oppCol
        );
      });
      // Flag a priori illegal moves
      moves.forEach(m => {
        if (
          // Self-capture test:
          (m.vanish.length == 2 && m.vanish[1].c == m.vanish[0].c) ||
          // Pawn going diagonaly to empty square, or vertically to occupied
          (
            m.vanish[0].p == 'p' &&
            (
              (m.end.y == m.start.y && m.vanish.length == 2) ||
              (m.end.y != m.start.y && m.vanish.length == 1)
            )
          )
        ) {
          m.illegal = true;
        }
      });
    }
    return moves;
  }

  pawnPostProcess(moves, color, oppCol) {
    let knightCount = 0;
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == 'n'
        ) {
          knightCount++;
        }
      }
    }
    return super.pawnPostProcess(moves, color, oppCol).filter(m => {
      if (
        m.vanish[0].p == 'p' &&
        (
          (color == 'w' && m.end.x == 0) ||
          (color == 'b' && m.end.x == this.size.x - 1)
        )
      ) {
        // Pawn promotion
        if (knightCount <= 1 && m.appear[0].p == 'p')
          return false; //knight promotion mandatory
        if (knightCount == 2 && m.appear[0].p == 'n')
          m.illegal = true; //will be legal only if one knight is captured
      }
      return true;
    });
  }

  filterValid(moves) {
    // No checks:
    return moves;
  }

  // White and black (partial) moves were played: merge
  resolveSynchroneMove(move) {
    const condensate = (mArr) => {
      const illegal = (mArr.length == 1 && mArr[0].illegal) ||
                      (!mArr[0] && mArr[1].illegal);
      if (mArr.length == 1)
        return Object.assign({illegal: illegal}, mArr[0]);
      if (!mArr[0])
        return Object.assign({illegal: illegal}, mArr[1]);
      // Pawn relocation
      return {
        start: mArr[0].start,
        end: mArr[1].end,
        vanish: mArr[0].vanish,
        appear: mArr[1].appear,
        segments: [
          [[mArr[0].start.x, mArr[0].start.y], [mArr[0].end.x, mArr[0].end.y]],
          [[mArr[1].start.x, mArr[1].start.y], [mArr[1].end.x, mArr[1].end.y]]
        ]
      };
    };
    const compatible = (m1, m2) => {
      if (m2.illegal)
        return false;
      // Knight promotion?
      if (m1.appear[0].p != m1.vanish[0].p)
        return m2.vanish.length == 2 && m2.vanish[1].p == 'n';
      if (
        // Self-capture attempt?
        (m1.vanish.length == 2 && m1.vanish[1].c == m1.vanish[0].c) ||
        // Pawn captures something by anticipation?
        (
          m1.vanish[0].p == 'p' &&
          m1.vanish.length == 1 &&
          m1.start.y != m1.end.y
        )
      ) {
        return m2.end.x == m1.end.x && m2.end.y == m1.end.y;
      }
      // Pawn push toward an enemy piece?
      if (
        m1.vanish[0].p == 'p' &&
        m1.vanish.length == 2 &&
        m1.start.y == m1.end.y
      ) {
        return m2.start.x == m1.end.x && m2.start.y == m1.end.y;
      }
      return true;
    };
    const adjust = (res) => {
      if (!res.wm || !res.bm)
        return;
      for (let c of ['w', 'b']) {
        const myMove = res[c + 'm'], oppMove = res[C.GetOppCol(c) + 'm'];
        if (
          // More general test than checking moves ends,
          // because of potential pawn relocation
          myMove.vanish.length == 2 &&
          myMove.vanish[1].x == oppMove.start.x &&
          myMove.vanish[1].y == oppMove.start.y
        ) {
          // Whatever was supposed to vanish, finally doesn't vanish
          myMove.vanish.pop();
        }
      }
      if (res.wm.end.y == res.bm.end.y && res.wm.end.x == res.bm.end.x) {
        // Collision (necessarily on empty square)
        if (!res.wm.illegal && !res.bm.illegal) {
          if (res.wm.vanish[0].p != res.bm.vanish[0].p) {
            const vanishColor = (res.wm.vanish[0].p == 'n' ? 'b' : 'w');
            res[vanishColor + 'm'].appear.shift();
          }
          else {
            // Collision of two pieces of same nature: both disappear
            res.wm.appear.shift();
            res.bm.appear.shift();
          }
        }
        else {
          const c = (!res.wm.illegal ? 'w' : 'b');
          // Illegal move wins:
          res[c + 'm'].appear.shift();
        }
      }
    };
    // Clone moves to avoid altering them:
    let whiteMove = JSON.parse(JSON.stringify(this.whiteMove)),
        blackMove = JSON.parse(JSON.stringify([this.firstMove, move]));
    [whiteMove, blackMove] = [condensate(whiteMove), condensate(blackMove)];
    let res = {
      wm: (
        (!whiteMove.illegal || compatible(whiteMove, blackMove))
          ? whiteMove
          : null
      ),
      bm: (
        (!blackMove.illegal || compatible(blackMove, whiteMove))
          ? blackMove
          : null
      )
    };
    adjust(res);
    return res;
  }

  play(move, callback) {
    const color = this.turn;
    if (color == 'w')
      this.whiteMove.push(move);
    if (
      move.vanish[0].p == 'p' && move.appear[0].p == 'p' &&
      (
        (color == 'w' && move.end.x == 0) ||
        (color == 'b' && move.end.x == this.size.x - 1)
      )
    ) {
      // Pawn on last rank : will relocate
      this.subTurn = 2;
      this.firstMove = move;
      if (color == this.playerColor) {
        this.playOnBoard(move);
        this.playVisual(move);
      }
      callback();
      return;
    }
    if (color == this.playerColor && this.firstMove) {
      // The move was played on board: undo it
      this.undoOnBoard(this.firstMove);
      const revFirstMove = {
        start: this.firstMove.end,
        end: this.firstMove.start,
        appear: this.firstMove.vanish,
        vanish: this.firstMove.appear
      };
      this.playVisual(revFirstMove);
    }
    this.turn = C.GetOppCol(color);
    this.movesCount++;
    this.subTurn = 1;
    this.firstMove = null;
    if (color == 'b') {
      // A full turn just ended
      const res = this.resolveSynchroneMove(move);
      const afterAnimate = () => {
        // start + end don't matter for playOnBoard() and playVisual().
        // Merging is necessary because moves may overlap.
        let toPlay = {appear: [], vanish: []};
        for (let c of ['w', 'b']) {
          if (res[c + 'm']) {
            Array.prototype.push.apply(toPlay.vanish, res[c + 'm'].vanish);
            Array.prototype.push.apply(toPlay.appear, res[c + 'm'].appear);
          }
        }
        this.playOnBoard(toPlay);
        this.playVisual(toPlay);
        callback();
      };
      if (res.wm)
        this.animate(res.wm, () => {if (!res.bm) afterAnimate();});
      if (res.bm)
        this.animate(res.bm, afterAnimate);
      if (!res.wm && !res.bm) {
        this.displayIllegalInfo("both illegal");
        ['w', 'b'].forEach(c => this.penalties[c]++);
      }
      else if (!res.wm) {
        this.displayIllegalInfo("white illegal");
        this.penalties['w']++;
      }
      else if (!res.bm) {
        this.displayIllegalInfo("black illegal");
        this.penalties['b']++;
      }
      this.whiteMove = [];
    }
    else
      callback();
  }

  displayIllegalInfo(msg) {
    super.displayMessage(null, msg, "illegal-text", 2000);
  }

  atLeastOneLegalMove(color) {
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == color &&
          this.getPotentialMovesFrom([i, j]).some(m => !m.illegal)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getCurrentScore() {
    if (this.turn == 'b') {
      // Turn (white + black) not over yet.
      // Could be stalemate if black cannot move (legally):
      if (!this.atLeastOneLegalMove('b'))
        return "1/2";
      return "*";
    }
    // Count footmen: if a side has none, it loses
    let fmCount = {w: 0, b: 0};
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.board[i][j] != "" && this.getPiece(i, j) == 'p')
          fmCount[this.getColor(i, j)]++;
      }
    }
    if (Object.values(fmCount).some(v => v == 0)) {
      if (fmCount['w'] == 0 && fmCount['b'] == 0)
        // Everyone died
        return "1/2";
      if (fmCount['w'] == 0) return "0-1";
      return "1-0"; //fmCount['b'] == 0
    }
    // Check penaltyFlags: if a side has 2 or more, it loses
    if (Object.values(this.penalties).every(v => v == 2)) return "1/2";
    if (this.penalties['w'] == 2) return "0-1";
    if (this.penalties['b'] == 2) return "1-0";
    if (!this.atLeastOneLegalMove('w') || !this.atLeastOneLegalMove('b'))
      // Stalemate (should be very rare)
      return "1/2";
    return "*";
  }

};
