import Move from "/utils/Move.js";
import ChessRules from "/base_rules.js";

export default class DynamoRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [],
      styles: ["cylinder", "doublemove", "progressive"]
    };
  }

  get hasEnpassant() {
    return this.options["enpassant"];
  }

  canIplay(x, y) {
    // Sometimes opponent's pieces can be moved directly
    return this.playerColor == this.turn;
  }

  canTake() {
    // Captures don't occur (only pulls & pushes)
    return false;
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.subTurn = 1;
    // Last action format: e2h5/d1g4 for queen on d1 pushing pawn to h5
    // for example, and moving herself to g4. If just move: e2h5
    this.amove = [];
    if (fenParsed.amove != '-')
      this.amove = JSON.parse(fenParsed.amove);
  }

  getPartFen(o) {
    let res = super.getPartFen(o);
    res["amove"] = (o.init ? '-' : JSON.stringify(this.amove));
    return res;
  }

  addExitMove(moves, [x, y], kp) {
    moves.push(
      new Move({
        start: { x: x, y: y },
        end: { x: kp[0], y: kp[1] },
        appear: [],
        vanish: [
          { x: x, y: y, c: this.getColor(x, y), p: this.getPiece(x, y) }]
      })
    );
  }

  // Step is right, just add (push/pull) moves in this direction
  // Direction is assumed normalized.
  getMovesInDirection([x, y], [dx, dy], nbSteps, kp) {
    nbSteps = nbSteps || 8; //max 8 steps anyway
    let [i, j] = [x + dx, y + dy];
    let moves = [];
    const color = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    const lastRank = (color == 'w' ? 0 : 7);
    let counter = 1;
    while (this.onBoard(i, j) && this.board[i][j] == "") {
      if (i == lastRank && piece == 'p') {
        // Promotion by push or pull
        this.pawnPromotions.forEach(p => {
          let move = super.getBasicMove([x, y], [i, j], { c: color, p: p });
          moves.push(move);
        });
      }
      else
        moves.push(super.getBasicMove([x, y], [i, j]));
      if (++counter > nbSteps)
        break;
      i += dx;
      j += dy;
    }
    if (!this.onBoard(i, j) && piece != 'k')
      this.addExitMove(moves, [x, y], kp);
    return moves;
  }

  // Normalize direction to know the step
  getNormalizedDirection([dx, dy]) {
    const absDir = [Math.abs(dx), Math.abs(dy)];
    let divisor = 0;
    if (absDir[0] != 0 && absDir[1] != 0 && absDir[0] != absDir[1])
      // Knight
      divisor = Math.min(absDir[0], absDir[1]);
    else
      // Standard slider (or maybe a pawn or king: same)
      divisor = Math.max(absDir[0], absDir[1]);
    return [dx / divisor, dy / divisor];
  }

  // There was something on x2,y2, maybe our color, pushed or (self)pulled
  isAprioriValidExit([x1, y1], [x2, y2], color2, piece2) {
    const color1 = this.getColor(x1, y1);
    const pawnShift = (color1 == 'w' ? -1 : 1);
    const lastRank = (color1 == 'w' ? 0 : 7);
    const deltaX = Math.abs(x1 - x2);
    const deltaY = Math.abs(y1 - y2);
    const checkSlider = () => {
      const dir = this.getNormalizedDirection([x2 - x1, y2 - y1]);
      let [i, j] = [x1 + dir[0], y1 + dir[1]];
      while (this.onBoard(i, j) && this.board[i][j] == "") {
        i += dir[0];
        j += dir[1];
      }
      return !this.onBoard(i, j);
    };
    switch (piece2 || this.getPiece(x1, y1)) {
      case 'p':
        return (
          x1 + pawnShift == x2 &&
          (
            (color1 == color2 && x2 == lastRank && y1 == y2) ||
            (
              color1 != color2 &&
              deltaY == 1 &&
              !this.onBoard(2 * x2 - x1, 2 * y2 - y1)
            )
          )
        );
      case 'r':
        if (x1 != x2 && y1 != y2)
          return false;
        return checkSlider();
      case 'n':
        return (
          deltaX + deltaY == 3 &&
          (deltaX == 1 || deltaY == 1) &&
          !this.onBoard(2 * x2 - x1, 2 * y2 - y1)
        );
      case 'b':
        if (deltaX != deltaY)
          return false;
        return checkSlider();
      case 'q':
        if (deltaX != 0 && deltaY != 0 && deltaX != deltaY)
          return false;
        return checkSlider();
      case 'k':
        return (
          deltaX <= 1 &&
          deltaY <= 1 &&
          !this.onBoard(2 * x2 - x1, 2 * y2 - y1)
        );
    }
    return false;
  }

  isAprioriValidVertical([x1, y1], x2) {
    const piece = this.getPiece(x1, y1);
    const deltaX = Math.abs(x1 - x2);
    const startRank = (this.getColor(x1, y1) == 'w' ? 6 : 1);
    return (
      ['q', 'r'].includes(piece) ||
      (
        ['k', 'p'].includes(piece) &&
        (
          deltaX == 1 ||
          (deltaX == 2 && piece == 'p' && x1 == startRank)
        )
      )
    );
  }

  // Test if a piece can suicide
  canReachBorder(x, y) {
    const p = this.getPiece(x, y);
    switch (p) {
      case 'p':
      case 'k':
        return false;
      case 'n':
        return (
          x <= 1 || x >= this.size.x - 2 || y <= 1 || y >= this.size.y - 2
        );
    }
    // Slider
    let steps = [];
    if (['r', 'q'].includes(p))
      steps = steps.concat(this.pieces()['r'].both[0].steps);
    if (['b', 'q'].includes(p))
      steps = steps.concat(this.pieces()['b'].both[0].steps);
    for (let s of steps) {
      let [i, j] = [x + s[0], y + s[1]];
      while (this.onBoard(i, j) && this.board[i][j] == "") {
        i += s[0];
        j += s[1];
      }
      if (!this.onBoard(i, j))
        return true;
    }
    return false;
  }

  // NOTE: for pushes, play the pushed piece first.
  //       for pulls: play the piece doing the action first
  // NOTE: to push a piece out of the board, make it slide until its king
  getPotentialMovesFrom([x, y], color) {
    color = color || this.turn;
    const sqCol = this.getColor(x, y);
    const pawnShift = (color == 'w' ? -1 : 1);
    const pawnStartRank = (color == 'w' ? 6 : 1);
    const getMoveHash = (m) => {
      return C.CoordsToSquare(m.start) + C.CoordsToSquare(m.end);
    };
    if (this.subTurn == 1) {
      const kp = this.searchKingPos(color)[0];
      const addMoves = (dir, nbSteps) => {
        const newMoves =
          this.getMovesInDirection([x, y], [-dir[0], -dir[1]], nbSteps, kp)
          .filter(m => !movesHash[getMoveHash(m)]);
        newMoves.forEach(m => { movesHash[getMoveHash(m)] = true; });
        Array.prototype.push.apply(moves, newMoves);
      };
      // Free to play any move (if piece of my color):
      let moves = [];
      if (sqCol == color) {
        moves = super.getPotentialMovesFrom([x, y])
        if (this.canReachBorder(x, y))
          this.addExitMove(moves, [x, y], kp);
      }
      // Structure to avoid adding moves twice (can be action & move)
      let movesHash = {};
      moves.forEach(m => { movesHash[getMoveHash(m)] = true; });
      // [x, y] is pushed by 'color'
      for (let step of this.pieces()['n'].both[0].steps) {
        const [i, j] = [x + step[0], y + step[1]];
        if (
          this.onBoard(i, j) &&
          this.board[i][j] != "" &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == 'n'
        ) {
          addMoves(step, 1);
        }
      }
      for (let step of this.pieces()['r'].both[0].steps.concat(
                       this.pieces()['b'].both[0].steps))
      {
        let [i, j] = [x + step[0], y + step[1]];
        while (this.onBoard(i, j) && this.board[i][j] == "") {
          i += step[0];
          j += step[1];
        }
        if (
          this.onBoard(i, j) &&
          this.board[i][j] != "" &&
          this.getColor(i, j) == color
        ) {
          const deltaX = Math.abs(i - x);
          const deltaY = Math.abs(j - y);
          switch (this.getPiece(i, j)) {
            case 'p':
              if (
                (x - i) / deltaX == pawnShift &&
                deltaX <= 2 &&
                deltaY <= 1
              ) {
                if (sqCol == color && deltaY == 0) {
                  // Pushed forward
                  const maxSteps = (i == pawnStartRank && deltaX == 1 ? 2 : 1);
                  addMoves(step, maxSteps);
                }
                else if (sqCol != color && deltaY == 1 && deltaX == 1)
                  // Pushed diagonally
                  addMoves(step, 1);
              }
              break;
            case 'r':
              if (deltaX == 0 || deltaY == 0)
                addMoves(step);
              break;
            case 'b':
              if (deltaX == deltaY)
                addMoves(step);
              break;
            case 'q':
              // All steps are valid for a queen:
              addMoves(step);
              break;
            case 'k':
              if (deltaX <= 1 && deltaY <= 1)
                addMoves(step, 1);
              break;
          }
        }
      }
      return moves;
    }
    // If subTurn == 2 then we should have a first move,
    // which restrict what we can play now: only in the first move direction
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (
      (fm.appear.length == 2 && fm.vanish.length == 2) ||
      (fm.vanish[0].c == sqCol && sqCol != color)
    ) {
      // Castle or again opponent color: no move playable then.
      return [];
    }
    const piece = this.getPiece(x, y);
    const getPushExit = () => {
      // Piece at subTurn 1 exited: can I have caused the exit?
      if (
        this.isAprioriValidExit(
          [x, y],
          [fm.start.x, fm.start.y],
          fm.vanish[0].c
        )
      ) {
        // Seems so:
        const dir = this.getNormalizedDirection(
          [fm.start.x - x, fm.start.y - y]);
        const nbSteps =
          ['p', 'k', 'n'].includes(piece)
            ? 1
            : null;
        return this.getMovesInDirection([x, y], dir, nbSteps);
      }
      return [];
    }
    const getPushMoves = () => {
      // Piece from subTurn 1 is still on board:
      const dirM = this.getNormalizedDirection(
        [fm.end.x - fm.start.x, fm.end.y - fm.start.y]);
      const dir = this.getNormalizedDirection(
        [fm.start.x - x, fm.start.y - y]);
      // Normalized directions should match
      if (dir[0] == dirM[0] && dir[1] == dirM[1]) {
        // We don't know if first move is a pushed piece or normal move,
        // so still must check if the push is valid.
        const deltaX = Math.abs(fm.start.x - x);
        const deltaY = Math.abs(fm.start.y - y);
        switch (piece) {
          case 'p':
            if (x == pawnStartRank) {
              if (
                (fm.start.x - x) * pawnShift < 0 ||
                deltaX >= 3 ||
                deltaY >= 2 ||
                (fm.vanish[0].c == color && deltaY > 0) ||
                (fm.vanish[0].c != color && deltaY == 0) ||
                Math.abs(fm.end.x - fm.start.x) > deltaX ||
                fm.end.y - fm.start.y != fm.start.y - y
              ) {
                return [];
              }
            }
            else {
              if (
                fm.start.x - x != pawnShift ||
                deltaY >= 2 ||
                (fm.vanish[0].c == color && deltaY == 1) ||
                (fm.vanish[0].c != color && deltaY == 0) ||
                fm.end.x - fm.start.x != pawnShift ||
                fm.end.y - fm.start.y != fm.start.y - y
              ) {
                return [];
              }
            }
            break;
          case 'n':
            if (
              (deltaX + deltaY != 3 || (deltaX == 0 && deltaY == 0)) ||
              (fm.end.x - fm.start.x != fm.start.x - x) ||
              (fm.end.y - fm.start.y != fm.start.y - y)
            ) {
              return [];
            }
            break;
          case 'k':
            if (
              (deltaX >= 2 || deltaY >= 2) ||
              (fm.end.x - fm.start.x != fm.start.x - x) ||
              (fm.end.y - fm.start.y != fm.start.y - y)
            ) {
              return [];
            }
            break;
          case 'b':
            if (deltaX != deltaY)
              return [];
            break;
          case 'r':
            if (deltaX != 0 && deltaY != 0)
              return [];
            break;
          case 'q':
            if (deltaX != deltaY && deltaX != 0 && deltaY != 0)
              return [];
            break;
        }
        // Nothing should stand between [x, y] and the square fm.start
        let [i, j] = [x + dir[0], y + dir[1]];
        while (
          (i != fm.start.x || j != fm.start.y) &&
          this.board[i][j] == V.EMPTY
        ) {
          i += dir[0];
          j += dir[1];
        }
        if (i == fm.start.x && j == fm.start.y)
          return this.getMovesInDirection([x, y], dir);
      }
      return [];
    }
    const getPullExit = () => {
      // Piece at subTurn 1 exited: can I be pulled?
      // Note: kings cannot suicide, so fm.vanish[0].p is not KING.
      // Could be PAWN though, if a pawn was pushed out of board.
      if (
        fm.vanish[0].p != 'p' && //pawns cannot pull
        this.isAprioriValidExit(
          [x, y],
          [fm.start.x, fm.start.y],
          fm.vanish[0].c,
          fm.vanish[0].p
        )
      ) {
        // Seems so:
        const dir = this.getNormalizedDirection(
          [fm.start.x - x, fm.start.y - y]);
        const nbSteps = (fm.vanish[0].p == 'n' ? 1 : null);
        return this.getMovesInDirection([x, y], dir, nbSteps);
      }
      return [];
    };
    const getPullMoves = () => {
      if (fm.vanish[0].p == 'p')
        // pawns cannot pull
        return [];
      const dirM = this.getNormalizedDirection(
        [fm.end.x - fm.start.x, fm.end.y - fm.start.y]);
      const dir = this.getNormalizedDirection(
        [fm.start.x - x, fm.start.y - y]);
      // Normalized directions should match
      if (dir[0] == dirM[0] && dir[1] == dirM[1]) {
        // Am I at the right distance?
        const deltaX = Math.abs(x - fm.start.x);
        const deltaY = Math.abs(y - fm.start.y);
        if (
          (fm.vanish[0].p == 'k' && (deltaX > 1 || deltaY > 1)) ||
          (fm.vanish[0].p == 'n' &&
            (deltaX + deltaY != 3 || deltaX == 0 || deltaY == 0))
        ) {
          return [];
        }
        // Nothing should stand between [x, y] and the square fm.start
        let [i, j] = [x + dir[0], y + dir[1]];
        while (
          (i != fm.start.x || j != fm.start.y) &&
          this.board[i][j] == ""
        ) {
          i += dir[0];
          j += dir[1];
        }
        if (i == fm.start.x && j == fm.start.y)
          return this.getMovesInDirection([x, y], dir);
      }
      return [];
    };
    if (fm.vanish[0].c != color) {
      // Only possible action is a push:
      if (fm.appear.length == 0)
        return getPushExit();
      return getPushMoves();
    }
    else if (sqCol != color) {
      // Only possible action is a pull, considering moving piece abilities
      if (fm.appear.length == 0)
        return getPullExit();
      return getPullMoves();
    }
    else {
      // My color + my color: both actions possible
      // Structure to avoid adding moves twice (can be action & move)
      let movesHash = {};
      if (fm.appear.length == 0) {
        const pushes = getPushExit();
        pushes.forEach(m => { movesHash[getMoveHash(m)] = true; });
        return (
          pushes.concat(getPullExit().filter(m => !movesHash[getMoveHash(m)]))
        );
      }
      const pushes = getPushMoves();
      pushes.forEach(m => { movesHash[getMoveHash(m)] = true; });
      return (
        pushes.concat(getPullMoves().filter(m => !movesHash[getMoveHash(m)]))
      );
    }
    return [];
  }

  // Does m2 un-do m1 ? (to disallow undoing actions)
  oppositeMoves(m1, m2) {
    const isEqual = (av1, av2) => {
      for (let av of av1) {
        const avInAv2 = av2.find(elt => {
          return (
            elt.x == av.x &&
            elt.y == av.y &&
            elt.c == av.c &&
            elt.p == av.p
          );
        });
        if (!avInAv2)
          return false;
      }
      return true;
    };
    // All appear and vanish arrays must have the same length
    const mL = m1.appear.length;
    return (
      m2.appear.length == mL &&
      m1.vanish.length == mL &&
      m2.vanish.length == mL &&
      isEqual(m1.appear, m2.vanish) &&
      isEqual(m1.vanish, m2.appear)
    );
  }

  getAmove(move1, move2) {
    // Just merge (one is action one is move, one may be empty)
    return {
      appear: move1.appear.concat(move2.appear),
      vanish: move1.vanish.concat(move2.vanish)
    }
  }

  getAllPotentialMoves() {
    const color = this.turn;
    let moves = [];
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.board[x][y] != "") {
          Array.prototype.push.apply(
            moves, this.getPotentialMovesFrom([i, j], color));
        }
      }
    }
    return moves;
  }

// TODO: I over-simplified, amove need to be saved for after undos

  filterValid(moves) {
    const color = this.turn;
    if (this.subTurn == 1) {
      return moves.filter(m => {
        // A move is valid either if it doesn't result in a check,
        // or if a second move is possible to counter the check
        // (not undoing a potential move + action of the opponent)
        this.play(m);
        const kp = this.searchKingPos(color);
        let res = this.underCheck(color);
        if (this.subTurn == 2) {
          let isOpposite = this.oppositeMoves(this.amove, m);
          if (res || isOpposite) {
            const moves2 = this.getAllPotentialMoves();
            for (let m2 of moves2) {
              this.play(m2);
              let cur_kp = kp;
              if (m2.appear[0].p == 'k')
                cur_kp = [m2.appear[0].x, m2.appear[0].y];
              const res2 = this.underCheck(cur_kp, color);
              const amove = this.getAmove(m, m2);
              isOpposite = this.oppositeMoves(this.amove, amove);
              this.undo(m2);
              if (!res2 && !isOpposite) {
                res = false;
                break;
              }
            }
          }
        }
        this.undo(m);
        return !res;
      });
    }
    if (La == 0)
      return super.filterValid(moves);
    const Lf = this.firstMove.length;
    return (
      super.filterValid(
        moves.filter(m => {
          // Move shouldn't undo another:
          const amove = this.getAmove(this.firstMove, m);
          return !this.oppositeMoves(this.amove, amove);
        })
      )
    );
  }

  getEmptyMove() {
    return new Move({
      start: { x: -1, y: -1 },
      end: { x: -1, y: -1 },
      appear: [],
      vanish: []
    });
  }

  doClick(square) {
    // A click to promote a piece on subTurn 2 would trigger this.
    // For now it would then return [NaN, NaN] because surrounding squares
    // have no IDs in the promotion modal. TODO: improve this?
    if (isNaN(square[0]))
      return null;
    // If subTurn == 2 && square is empty && !underCheck && !isOpposite,
    // then return an empty move, allowing to "pass" subTurn2
    const kp = this.searchKingPos(this.turn);
    if (
      this.subTurn == 2 &&
      this.board[square[0]][square[1]] == "" &&
      !this.underCheck(kp, C.GetOppTurn(this.turn)) &&
      !this.oppositeMoves(this.amove, this.firstMove))
    ) {
      return this.getEmptyMove();
    }
    return null;
  }

  updateCastleFlags(move) {
    if (move.start.x < 0)
      return; //empty move (pass subTurn 2)
    const firstRank = { 'w': V.size.x - 1, 'b': 0 };
    for (let v of move.vanish) {
      if (v.p == 'k')
        this.castleFlags[v.c] = [this.size.y, this.size.y];
      else if (v.x == firstRank[v.c] && this.castleFlags[v.c].includes(v.y)) {
        const flagIdx = (v.y == this.castleFlags[v.c][0] ? 0 : 1);
        this.castleFlags[v.c][flagIdx] = this.size.y;
      }
    }
  }

  play(move, filterValid) {
    if (!filterValid)
      this.updateCastleFlags(move);
    const color = this.turn;
    const oppCol = C.GetOppTurn(color);
    move.subTurn = this.subTurn; //for undo
    const gotoNext = (mv) => {
      this.amove = this.getAmove(this.firstMove, mv);
      this.turn = oppCol;
      this.subTurn = 1;
      this.movesCount++;
    };
    this.playOnBoard(move);
    if (this.subTurn == 2)
      gotoNext(move);
    else {
      this.subTurn = 2;
      this.firstMove = move;
      const kp = this.searchKingPos(color);
      if (
        // Condition is true on empty arrays:
        this.getAllPotentialMoves().every(m => {
          this.playOnBoard(m);
          let cur_kp = kp;
          if (m.appear[0].p == 'k')
            cur_kp = [m.appear[0].x, m.appear[0].y];
          const res = this.underCheck(cur_kp, oppCol);
          this.undoOnBoard(m);
          return res;
        })
      ) {
        // No valid move at subTurn 2
        gotoNext(this.getEmptyMove());
      }
    }
  }

  // For filterValid()
  undo(move) {
    this.undoOnBoard(this.board, move);
    if (this.subTurn == 1) {
      this.turn = C.GetOppTurn(this.turn);
      this.movesCount--;
    }
    this.subTurn = move.subTurn;
  }

};
