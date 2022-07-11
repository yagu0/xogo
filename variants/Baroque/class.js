import ChessRules from "/base_rules.js";
import GiveawayRules from "/variants/Giveaway/class.js";
import {Random} from "/utils/alea.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class BaroqueRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.Select,
      input: [
        {
          label: "Capture king",
          variable: "taking",
          type: "checkbox",
          defaut: false
        }
      ],
      styles: [
        "balance",
        "capture",
        "crazyhouse",
        "cylinder",
        "doublemove",
        "progressive",
        "recycle",
        "teleport"
      ]
    };
  }

  get hasFlags() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  genRandInitBaseFen() {
    if (this.options["randomness"] == 0)
      return "rnbkqbnm/pppppppp/8/8/8/8/PPPPPPPP/MNBQKBNR";
    const options = Object.assign({mode: "suicide"}, this.options);
    const gr = new GiveawayRules({options: options, genFenOnly: true});
    let res = gr.genRandInitBaseFen();
    let immPos = {};
    for (let c of ['w', 'b']) {
      const rookChar = (c == 'w' ? 'R' : 'r');
      switch (Random.randInt(2)) {
        case 0:
          immPos[c] = res.fen.indexOf(rookChar);
          break;
        case 1:
          immPos[c] = res.fen.lastIndexOf(rookChar);
          break;
      }
    }
    res.fen = res.fen.substring(0, immPos['b']) + 'i' +
              res.fen.substring(immPos['b'] + 1, immPos['w']) + 'I' +
              res.fen.substring(immPos['w'] + 1);
    return res;
  }

  // Although other pieces keep their names here for coding simplicity,
  // keep in mind that:
  //  - a "rook" is a coordinator, capturing by coordinating with the king
  //  - a "knight" is a long-leaper, capturing as in draughts
  //  - a "bishop" is a chameleon, capturing as its prey
  //  - a "queen" is a withdrawer, capturing by moving away from pieces

  pieces() {
    return Object.assign({},
      super.pieces(),
      {
        'p': {
          "class": "pawn",
          moves: [
            {steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]}
          ]
        },
        'r': {
          "class": "rook",
          moves: [
            {
              steps: [
                [1, 0], [0, 1], [-1, 0], [0, -1],
                [1, 1], [1, -1], [-1, 1], [-1, -1]
              ]
            }
          ]
        },
        'n': {
          "class": "knight",
          moveas: 'r'
        },
        'b': {
          "class": "bishop",
          moveas: 'r'
        },
        'q': {
          "class": "queen",
          moveas: 'r'
        },
        'i': {
          "class": "immobilizer",
          moveas: 'q'
        }
      }
    );
  }

  // Is piece on square (x,y) immobilized?
  isImmobilized([x, y]) {
    const piece = this.getPiece(x, y);
    const color = this.getColor(x, y);
    const oppCol = C.GetOppCol(color);
    const adjacentSteps = this.pieces()['k'].moves[0].steps;
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], this.getY(y + step[1])];
      if (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        this.getColor(i, j) == oppCol
      ) {
        const oppPiece = this.getPiece(i, j);
        if (oppPiece == 'i') {
          // Moving is possible only if this immobilizer is neutralized
          for (let step2 of adjacentSteps) {
            const [i2, j2] = [i + step2[0], this.getY(j + step2[1])];
            if (i2 == x && j2 == y)
              continue; //skip initial piece!
            if (
              this.onBoard(i2, j2) &&
              this.board[i2][j2] != "" &&
              this.getColor(i2, j2) == color
            ) {
              if (['b', 'i'].includes(this.getPiece(i2, j2)))
                return false;
            }
          }
          return true; //immobilizer isn't neutralized
        }
        // Chameleons can't be immobilized twice,
        // because there is only one immobilizer
        if (oppPiece == 'b' && piece == 'i')
          return true;
      }
    }
    return false;
  }

  canTake([x1, y1], [x2, y2]) {
    // Deactivate standard captures, except for king:
    return (
      this.getPiece(x1, y1) == 'k' &&
      this.getColor(x1, y1) != this.getColor(x2, y2)
    );
  }

  postProcessPotentialMoves(moves) {
    if (moves.length == 0)
      return [];
    switch (moves[0].vanish[0].p) {
      case 'p':
        this.addPawnCaptures(moves);
        break;
      case 'r':
        this.addRookCaptures(moves);
        break;
      case 'n':
        const [x, y] = [moves[0].start.x, moves[0].start.y];
        moves = moves.concat(this.getKnightCaptures([x, y]));
        break;
      case 'b':
        moves = this.getBishopCaptures(moves);
        break;
      case 'q':
        this.addPawnCaptures(moves);
        break;
    }
    return moves;
  }

  // Modify capturing moves among listed pawn moves
  addPawnCaptures(moves, byChameleon) {
    const steps = this.pieces()['p'].moves[0].steps;
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
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

  addRookCaptures(moves, byChameleon) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
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

  getKnightCaptures(startSquare, byChameleon) {
    // Look in every direction for captures
    const steps = this.pieces()['r'].moves[0].steps;
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    let moves = [];
    const [x, y] = [startSquare[0], startSquare[1]];
    const piece = this.getPiece(x, y); //might be a chameleon!
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], this.getY(y + step[1])];
      while (this.onBoard(i, j) && this.board[i][j] == "")
        [i, j] = [i + step[0], this.getY(j + step[1])];
      if (
        !this.onBoard(i, j) ||
        this.getColor(i, j) == color ||
        (byChameleon && this.getPiece(i, j) != 'n')
      ) {
        continue;
      }
      // last(thing), cur(thing) : stop if "cur" is our color,
      // or beyond board limits, or if "last" isn't empty and cur neither.
      // Otherwise, if cur is empty then add move until cur square;
      // if cur is occupied then stop if !!byChameleon and the square not
      // occupied by a leaper.
      let last = [i, j];
      let cur = [i + step[0], this.getY(j + step[1])];
      let vanished = [new PiPo({x: x, y: y, c: color, p: piece})];
      while (this.onBoard(cur[0], cur[1])) {
        if (this.board[last[0]][last[1]] != "") {
          const oppPiece = this.getPiece(last[0], last[1]);
          if (!!byChameleon && oppPiece != 'n')
            continue outerLoop;
          // Something to eat:
          vanished.push(
            new PiPo({x: last[0], y: last[1], c: oppCol, p: oppPiece})
          );
        }
        if (this.board[cur[0]][cur[1]] != "") {
          if (
            this.getColor(cur[0], cur[1]) == color ||
            this.board[last[0]][last[1]] != ""
          ) {
            //TODO: redundant test
            continue outerLoop;
          }
        }
        else {
          moves.push(
            new Move({
              appear: [new PiPo({x: cur[0], y: cur[1], c: color, p: piece})],
              vanish: JSON.parse(JSON.stringify(vanished)), //TODO: required?
              start: {x: x, y: y},
              end: {x: cur[0], y: cur[1]}
            })
          );
        }
        last = [last[0] + step[0], this.getY(last[1] + step[1])];
        cur = [cur[0] + step[0], this.getY(cur[1] + step[1])];
      }
    }
    return moves;
  }

  // Chameleon
  getBishopCaptures(moves) {
    const [x, y] = [moves[0].start.x, moves[0].start.y];
    moves = moves.concat(this.getKnightCaptures([x, y], "asChameleon"));
    // No "king capture" because king cannot remain under check
    this.addPawnCaptures(moves, "asChameleon");
    this.addRookCaptures(moves, "asChameleon");
    this.addQueenCaptures(moves, "asChameleon");
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

  addQueenCaptures(moves, byChameleon) {
    if (moves.length == 0) return;
    const [x, y] = [moves[0].start.x, moves[0].start.y];
    const adjacentSteps = this.pieces()['r'].moves[0].steps;
    let capturingDirections = [];
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    adjacentSteps.forEach(step => {
      const [i, j] = [x + step[0], this.getY(y + step[1])];
      if (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        this.getColor(i, j) == oppCol &&
        (!byChameleon || this.getPiece(i, j) == 'q')
      ) {
        capturingDirections.push(step);
      }
    });
    moves.forEach(m => {
      const step = [
        m.end.x != x ? (m.end.x - x) / Math.abs(m.end.x - x) : 0,
        m.end.y != y ? (m.end.y - y) / Math.abs(m.end.y - y) : 0
      ];
      // NOTE: includes() and even _.isEqual() functions fail...
      // TODO: this test should be done only once per direction
      if (
        capturingDirections.some(dir => {
          return dir[0] == -step[0] && dir[1] == -step[1];
        })
      ) {
        const [i, j] = [x - step[0], this.getY(y - step[1])];
        m.vanish.push(
          new PiPo({
            x: i,
            y: j,
            p: this.getPiece(i, j),
            c: oppCol
          })
        );
      }
    });
  }

  underAttack([x, y], oppCol) {
    // Generate all potential opponent moves, check if king captured.
    // TODO: do it more efficiently.
    const color = this.getColor(x, y);
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (
          this.board[i][j] != "" && this.getColor(i, j) == oppCol &&
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
