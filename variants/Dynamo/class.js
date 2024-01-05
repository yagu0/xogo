import ChessRules from "/base_rules.js";

export default class DynamoRules extends ChessRules {

  static get Options() {
    // TODO
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
    this.lastAction = [];
    if (fenParsed.amove != '-') {
      this.lastAction = fenParsed.amove.split('/').map(a => {
        return {
          c1: C.SquareToCoords(C.SquareFromUsual(a.substr(0, 2))),
          c2: C.SquareToCoords(C.SquareFromUsual(a.substr(2, 2)))
        };
      });
    }
  }

  getPartFen(o) {
    let res = super.getPartFen(o);
    if (o.init)
      res["amove"] = '-';
    else {
      res["amove"] = this.lastAction.map(a => {
        C.UsualFromSquare(C.CoordsToSquare(a.c1)) +
        C.UsualFromSquare(C.CoordsToSquare(a.c2))
      }).join('/');
    }
    return res;
  }

  // Step is right, just add (push/pull) moves in this direction
  // Direction is assumed normalized.
  getMovesInDirection([x, y], [dx, dy], nbSteps) {
    nbSteps = nbSteps || 8; //max 8 steps anyway
    let [i, j] = [x + dx, y + dy];
    let moves = [];
    const color = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    const lastRank = (color == 'w' ? 0 : 7);
    let counter = 1;
    while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
      if (i == lastRank && piece == V.PAWN) {
        // Promotion by push or pull
        V.PawnSpecs.promotions.forEach(p => {
          let move = super.getBasicMove([x, y], [i, j], { c: color, p: p });
          moves.push(move);
        });
      }
      else moves.push(super.getBasicMove([x, y], [i, j]));
      if (++counter > nbSteps) break;
      i += dx;
      j += dy;
    }
    if (!V.OnBoard(i, j) && piece != V.KING) {
      // Add special "exit" move, by "taking king"
      moves.push(
        new Move({
          start: { x: x, y: y },
          end: { x: this.kingPos[color][0], y: this.kingPos[color][1] },
          appear: [],
          vanish: [{ x: x, y: y, c: color, p: piece }]
        })
      );
    }
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
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += dir[0];
        j += dir[1];
      }
      return !V.OnBoard(i, j);
    };
    switch (piece2 || this.getPiece(x1, y1)) {
      case V.PAWN:
        return (
          x1 + pawnShift == x2 &&
          (
            (color1 == color2 && x2 == lastRank && y1 == y2) ||
            (
              color1 != color2 &&
              deltaY == 1 &&
              !V.OnBoard(2 * x2 - x1, 2 * y2 - y1)
            )
          )
        );
      case V.ROOK:
        if (x1 != x2 && y1 != y2) return false;
        return checkSlider();
      case V.KNIGHT:
        return (
          deltaX + deltaY == 3 &&
          (deltaX == 1 || deltaY == 1) &&
          !V.OnBoard(2 * x2 - x1, 2 * y2 - y1)
        );
      case V.BISHOP:
        if (deltaX != deltaY) return false;
        return checkSlider();
      case V.QUEEN:
        if (deltaX != 0 && deltaY != 0 && deltaX != deltaY) return false;
        return checkSlider();
      case V.KING:
        return (
          deltaX <= 1 &&
          deltaY <= 1 &&
          !V.OnBoard(2 * x2 - x1, 2 * y2 - y1)
        );
    }
    return false;
  }

  isAprioriValidVertical([x1, y1], x2) {
    const piece = this.getPiece(x1, y1);
    const deltaX = Math.abs(x1 - x2);
    const startRank = (this.getColor(x1, y1) == 'w' ? 6 : 1);
    return (
      [V.QUEEN, V.ROOK].includes(piece) ||
      (
        [V.KING, V.PAWN].includes(piece) &&
        (
          deltaX == 1 ||
          (deltaX == 2 && piece == V.PAWN && x1 == startRank)
        )
      )
    );
  }

  // NOTE: for pushes, play the pushed piece first.
  //       for pulls: play the piece doing the action first
  // NOTE: to push a piece out of the board, make it slide until its king
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const sqCol = this.getColor(x, y);
    const pawnShift = (color == 'w' ? -1 : 1);
    const pawnStartRank = (color == 'w' ? 6 : 1);
    const getMoveHash = (m) => {
      return V.CoordsToSquare(m.start) + V.CoordsToSquare(m.end);
    };
    if (this.subTurn == 1) {
      const addMoves = (dir, nbSteps) => {
        const newMoves =
          this.getMovesInDirection([x, y], [-dir[0], -dir[1]], nbSteps)
          .filter(m => !movesHash[getMoveHash(m)]);
        newMoves.forEach(m => { movesHash[getMoveHash(m)] = true; });
        Array.prototype.push.apply(moves, newMoves);
      };
      // Free to play any move (if piece of my color):
      let moves =
        sqCol == color
          ? super.getPotentialMovesFrom([x, y])
          : [];
      // There may be several suicide moves: keep only one
      let hasExit = false;
      moves = moves.filter(m => {
        const suicide = (m.appear.length == 0);
        if (suicide) {
          if (hasExit) return false;
          hasExit = true;
        }
        return true;
      });
      // Structure to avoid adding moves twice (can be action & move)
      let movesHash = {};
      moves.forEach(m => { movesHash[getMoveHash(m)] = true; });
      // [x, y] is pushed by 'color'
      for (let step of V.steps[V.KNIGHT]) {
        const [i, j] = [x + step[0], y + step[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.KNIGHT
        ) {
          addMoves(step, 1);
        }
      }
      for (let step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
        let [i, j] = [x + step[0], y + step[1]];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color
        ) {
          const deltaX = Math.abs(i - x);
          const deltaY = Math.abs(j - y);
          switch (this.getPiece(i, j)) {
            case V.PAWN:
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
            case V.ROOK:
              if (deltaX == 0 || deltaY == 0) addMoves(step);
              break;
            case V.BISHOP:
              if (deltaX == deltaY) addMoves(step);
              break;
            case V.QUEEN:
              // All steps are valid for a queen:
              addMoves(step);
              break;
            case V.KING:
              if (deltaX <= 1 && deltaY <= 1) addMoves(step, 1);
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
          [V.PAWN, V.KING, V.KNIGHT].includes(piece)
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
          case V.PAWN:
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
          case V.KNIGHT:
            if (
              (deltaX + deltaY != 3 || (deltaX == 0 && deltaY == 0)) ||
              (fm.end.x - fm.start.x != fm.start.x - x) ||
              (fm.end.y - fm.start.y != fm.start.y - y)
            ) {
              return [];
            }
            break;
          case V.KING:
            if (
              (deltaX >= 2 || deltaY >= 2) ||
              (fm.end.x - fm.start.x != fm.start.x - x) ||
              (fm.end.y - fm.start.y != fm.start.y - y)
            ) {
              return [];
            }
            break;
          case V.BISHOP:
            if (deltaX != deltaY) return [];
            break;
          case V.ROOK:
            if (deltaX != 0 && deltaY != 0) return [];
            break;
          case V.QUEEN:
            if (deltaX != deltaY && deltaX != 0 && deltaY != 0) return [];
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
        fm.vanish[0].p != V.PAWN && //pawns cannot pull
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
        const nbSteps = (fm.vanish[0].p == V.KNIGHT ? 1 : null);
        return this.getMovesInDirection([x, y], dir, nbSteps);
      }
      return [];
    };
    const getPullMoves = () => {
      if (fm.vanish[0].p == V.PAWN)
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
          (fm.vanish[0].p == V.KING && (deltaX > 1 || deltaY > 1)) ||
          (fm.vanish[0].p == V.KNIGHT &&
            (deltaX + deltaY != 3 || deltaX == 0 || deltaY == 0))
        ) {
          return [];
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
    };
    if (fm.vanish[0].c != color) {
      // Only possible action is a push:
      if (fm.appear.length == 0) return getPushExit();
      return getPushMoves();
    }
    else if (sqCol != color) {
      // Only possible action is a pull, considering moving piece abilities
      if (fm.appear.length == 0) return getPullExit();
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

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    const c = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (this.canTake([x, y], [i, j]))
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
      else {
        // Add potential board exit (suicide), except for the king
        if (piece != V.KING) {
          moves.push({
            start: { x: x, y: y},
            end: { x: this.kingPos[c][0], y: this.kingPos[c][1] },
            appear: [],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                c: c,
                p: piece
              })
            ]
          });
        }
      }
    }
    return moves;
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
        if (!avInAv2) return false;
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

  // TODO: just stack in this.lastAction instead
  getAmove(move1, move2) {
    // Just merge (one is action one is move, one may be empty)
    return {
      appear: move1.appear.concat(move2.appear),
      vanish: move1.vanish.concat(move2.vanish)
    }
  }

  filterValid(moves) {
    const color = this.turn;
    const La = this.amoves.length;
    if (this.subTurn == 1) {
      return moves.filter(m => {
        // A move is valid either if it doesn't result in a check,
        // or if a second move is possible to counter the check
        // (not undoing a potential move + action of the opponent)
        this.play(m);
        let res = this.underCheck(color);
        if (this.subTurn == 2) {
          let isOpposite = La > 0 && this.oppositeMoves(this.amoves[La-1], m);
          if (res || isOpposite) {
            const moves2 = this.getAllPotentialMoves();
            for (let m2 of moves2) {
              this.play(m2);
              const res2 = this.underCheck(color);
              const amove = this.getAmove(m, m2);
              isOpposite =
                La > 0 && this.oppositeMoves(this.amoves[La-1], amove);
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
    if (La == 0) return super.filterValid(moves);
    const Lf = this.firstMove.length;
    return (
      super.filterValid(
        moves.filter(m => {
          // Move shouldn't undo another:
          const amove = this.getAmove(this.firstMove[Lf-1], m);
          return !this.oppositeMoves(this.amoves[La-1], amove);
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
    if (isNaN(square[0])) return null;
    // If subTurn == 2 && square is empty && !underCheck && !isOpposite,
    // then return an empty move, allowing to "pass" subTurn2
    const La = this.amoves.length;
    const Lf = this.firstMove.length;
    if (
      this.subTurn == 2 &&
      this.board[square[0]][square[1]] == V.EMPTY &&
      !this.underCheck(this.turn) &&
      (La == 0 || !this.oppositeMoves(this.amoves[La-1], this.firstMove[Lf-1]))
    ) {
      return this.getEmptyMove();
    }
    return null;
  }

  play(move) {
    if (this.subTurn == 1 && move.vanish.length == 0) {
      // Patch to work with old format: (TODO: remove later)
      move.ignore = true;
      return;
    }
    const color = this.turn;
    move.subTurn = this.subTurn; //for undo
    const gotoNext = (mv) => {
      const L = this.firstMove.length;
      this.amoves.push(this.getAmove(this.firstMove[L-1], mv));
      this.turn = V.GetOppCol(color);
      this.subTurn = 1;
      this.movesCount++;
    };
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    if (this.subTurn == 2) gotoNext(move);
    else {
      this.subTurn = 2;
      this.firstMove.push(move);
      this.toNewKingPos(move);
      if (
        // Condition is true on empty arrays:
        this.getAllPotentialMoves().every(m => {
          V.PlayOnBoard(this.board, m);
          this.toNewKingPos(m);
          const res = this.underCheck(color);
          V.UndoOnBoard(this.board, m);
          this.toOldKingPos(m);
          return res;
        })
      ) {
        // No valid move at subTurn 2
        gotoNext(this.getEmptyMove());
      }
      this.toOldKingPos(move);
    }
    this.postPlay(move);
  }

  toNewKingPos(move) {
    for (let a of move.appear)
      if (a.p == V.KING) this.kingPos[a.c] = [a.x, a.y];
  }

  postPlay(move) {
    if (move.start.x < 0) return;
    this.toNewKingPos(move);
    this.updateCastleFlags(move);
  }

  updateCastleFlags(move) {
    const firstRank = { 'w': V.size.x - 1, 'b': 0 };
    for (let v of move.vanish) {
      if (v.p == V.KING) this.castleFlags[v.c] = [V.size.y, V.size.y];
      else if (v.x == firstRank[v.c] && this.castleFlags[v.c].includes(v.y)) {
        const flagIdx = (v.y == this.castleFlags[v.c][0] ? 0 : 1);
        this.castleFlags[v.c][flagIdx] = V.size.y;
      }
    }
  }

  undo(move) {
    if (!!move.ignore) return; //TODO: remove that later
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.subTurn == 1) {
      this.amoves.pop();
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    if (move.subTurn == 1) this.firstMove.pop();
    this.subTurn = move.subTurn;
    this.toOldKingPos(move);
  }

  toOldKingPos(move) {
    // (Potentially) Reset king position
    for (let v of move.vanish)
      if (v.p == V.KING) this.kingPos[v.c] = [v.x, v.y];
  }

};
