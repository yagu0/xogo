import ChessRules from "/base_rules.js";
import Move from "/utils/Move.js";
import PiPo from "/utils/PiPo.js";

export default class AbstractSpecialCaptureRules extends ChessRules {

  // Wouldn't make sense:
  get hasEnpassant() {
    return false;
  }

  pieces() {
    return Object.assign({},
      super.pieces(),
      {
        '+': {"class": "push-action"},
        '-': {"class": "pull-action"}
      }
    );
  }

  // Modify capturing moves among listed pincer moves
  addPincerCaptures(moves, byChameleon) {
    const steps = this.pieces()['p'].moves[0].steps;
    const color = moves[0].vanish[0].c;
    const oppCol = C.GetOppTurn(color);
    moves.forEach(m => {
      if (byChameleon && m.start.x != m.end.x && m.start.y != m.end.y)
        // Chameleon not moving as pawn
        return;
      // Try capturing in every direction
      for (let step of steps) {
        const sq2 = [m.end.x + 2 * step[0], this.getY(m.end.y + 2 * step[1])];
        if (
          this.onBoard(sq2[0], sq2[1]) &&
          this.board[sq2[0]][sq2[1]] != "" &&
          this.getColor(sq2[0], sq2[1]) == color
        ) {
          // Potential capture
          const sq1 = [m.end.x + step[0], this.getY(m.end.y + step[1])];
          if (
            this.board[sq1[0]][sq1[1]] != "" &&
            this.getColor(sq1[0], sq1[1]) == oppCol
          ) {
            const piece1 = this.getPiece(sq1[0], sq1[1]);
            if (!byChameleon || piece1 == 'p') {
              m.vanish.push(
                new PiPo({
                  x: sq1[0],
                  y: sq1[1],
                  c: oppCol,
                  p: piece1
                })
              );
            }
          }
        }
      }
    });
  }

  addCoordinatorCaptures(moves, byChameleon) {
    const color = moves[0].vanish[0].c;
    const oppCol = V.GetOppTurn(color);
    const kp = this.searchKingPos(color)[0];
    moves.forEach(m => {
      // Check piece-king rectangle (if any) corners for enemy pieces
      if (m.end.x == kp[0] || m.end.y == kp[1])
        return; //"flat rectangle"
      const corner1 = [m.end.x, kp[1]];
      const corner2 = [kp[0], m.end.y];
      for (let [i, j] of [corner1, corner2]) {
        if (this.board[i][j] != "" && this.getColor(i, j) == oppCol) {
          const piece = this.getPiece(i, j);
          if (!byChameleon || piece == 'r') {
            m.vanish.push(
              new PiPo({
                x: i,
                y: j,
                p: piece,
                c: oppCol
              })
            );
          }
        }
      }
    });
  }

  getLeaperCaptures([x, y], byChameleon, onlyOne) {
    // Look in every direction for captures
    const steps = this.pieces()['r'].moves[0].steps;
    const color = this.getColor(x, y);
    const oppCol = C.GetOppTurn(color);
    let moves = [];
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], this.getY(y + step[1])];
      while (this.onBoard(i, j) && this.board[i][j] == "")
        [i, j] = [i + step[0], this.getY(j + step[1])];
      if (
        !this.onBoard(i, j) ||
        this.getColor(i, j) == color ||
        (byChameleon && this.getPiece(i, j) != 'n')
      ) {
        continue; //nothing to eat
      }
      let vanished = [];
      while (true) {
        // Found something (more) to eat:
        vanished.push(
          new PiPo({x: i, y: j, c: oppCol, p: this.getPiece(i, j)}));
        [i, j] = [i + step[0], this.getY(j + step[1])];
        while (this.onBoard(i, j) && this.board[i][j] == "") {
          let mv = this.getBasicMove([x, y], [i, j]);
          Array.prototype.push.apply(mv.vanish, vanished);
          moves.push(mv);
          [i, j] = [i + step[0], this.getY(j + step[1])];
        }
        if (
          onlyOne ||
          !this.onBoard(i, j) ||
          this.getColor(i, j) == color ||
          (byChameleon && this.getPiece(i, j) != 'n')
        ) {
          continue outerLoop;
        }
      }
    }
    return moves;
  }

  // Chameleon
  getChameleonCaptures(moves, pushPullType, onlyOneJump) {
    const [x, y] = [moves[0].start.x, moves[0].start.y];
    moves = moves.concat(
      this.getLeaperCaptures([x, y], "asChameleon", onlyOneJump));
    // No "king capture" because king cannot remain under check
    this.addPincerCaptures(moves, "asChameleon");
    this.addCoordinatorCaptures(moves, "asChameleon");
    this.addPushmePullyouCaptures(moves, "asChameleon", pushPullType);
    // Post-processing: merge similar moves, concatenating vanish arrays
    let mergedMoves = {};
    moves.forEach(m => {
      const key = m.end.x + this.size.x * m.end.y;
      if (!mergedMoves[key])
        mergedMoves[key] = m;
      else {
        for (let i = 1; i < m.vanish.length; i++)
          mergedMoves[key].vanish.push(m.vanish[i]);
      }
    });
    return Object.values(mergedMoves);
  }

  // type: nothing (freely, capture all), or pull or push, or "exclusive"
  addPushmePullyouCaptures(moves, byChameleon, type) {
    const [sx, sy] = [moves[0].start.x, moves[0].start.y];
    const adjacentSteps = this.pieces()['r'].moves[0].steps;
    let capturingPullDir = {};
    const color = moves[0].vanish[0].c;
    const oppCol = C.GetOppTurn(color);
    if (type != "push") {
      adjacentSteps.forEach(step => {
        const [bi, bj] = [sx - step[0], this.getY(sy - step[1])];
        if (
          this.onBoard(bi, bj) &&
          this.board[bi][bj] != "" &&
          this.getColor(bi, bj) == oppCol &&
          (!byChameleon || this.getPiece(bi, bj) == 'q')
        ) {
          capturingPullDir[step[0] + "." + step[1]] = true;
        }
      });
    }
    moves.forEach(m => {
      const [ex, ey] = [m.end.x, m.end.y];
      const step = [
        ex != sx ? (ex - sx) / Math.abs(ex - sx) : 0,
        ey != sy ? (ey - sy) / Math.abs(ey - sy) : 0
      ];
      let vanishPull, vanishPush;
      if (type != "pull") {
        const [fi, fj] = [ex + step[0], this.getY(ey + step[1])];
        if (
          this.onBoard(fi, fj) &&
          this.board[fi][fj] != "" &&
          this.getColor(bi, bj) == oppCol &&
          (!byChameleon || this.getPiece(fi, fj) == 'q')
        ) {
          vanishPush =
            new PiPo({x: fi, y: fj, p: this.getPiece(fi, fj), c: oppCol});
        }
      }
      if (capturingPullDir[step[0] + "." + step[1]]) {
        const [bi, bj] = [sx - step[0], this.getY(sy - step[1])];
        vanishPull =
          new PiPo({x: bi, y: bj, p: this.getPiece(bi, bj), c: oppCol});
      }
      if (vanishPull && vanishPush && type == "exclusive") {
        // Create a new move for push action (cannot play both)
        let newMove = JSON.parse(JSON.stringify(m));
        newMove.vanish.push(vanishPush);
        newMove.choice = '+';
        moves.push(newMove);
        m.vanish.push(vanishPull);
        m.choice = '-';
      }
      else {
        if (vanishPull)
          m.vanish.push(vanishPull);
        if (vanishPush)
          m.vanish.push(vanishPush);
      }
    });
  }

  underAttack([x, y], oppCols) {
    // Generate all potential opponent moves, check if king captured.
    // TODO: do it more efficiently.
    const color = this.getColor(x, y);
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (
          this.board[i][j] != "" && oppCols.includes(this.getColor(i, j)) &&
          this.getPotentialMovesFrom([i, j]).some(m => {
            return (
              m.vanish.length >= 2 &&
              [1, m.vanish.length - 1].some(k => m.vanish[k].p == 'k')
            );
          })
        ) {
          return true;
        }
      }
    }
    return false;
  }

};
