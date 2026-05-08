import {FenUtil} from "/utils/setupPieces.js";
import ChessRules from "/js/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class EightpiecesRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["crazyhouse", "cylinder", "recycle", "teleport"]
    };
  }

  static get LANCERS() {
    return ['c', 'd', 'e', 'f', 'g', 'h', 'm', 'o'];
  }

  getLancerOptions(x, y) {
    let options = [];
    if (y > 0)
      options.push('m');
    if (y < this.size.y)
      options.push('e');
    if (x < this.size.x - 1) {
      options.push('g');
      if (y > 0)
        options.push('h');
      if (y < this.size.y - 1)
        options.push('f');
    }
    if (x > 0) {
      options.push('c');
      if (y > 0)
        options.push('o');
      if (y < this.size.y - 1)
        options.push('d');
    }
    return options;
  }

  pawnPromotions(x, y) {
    const base_pieces = ['q', 'r', 'n', 'b', 'j', 's'];
    let lancer_orients = this.getLancerOptions(x, y);
    return base_pieces.concat(lancer_orients);
  }

  genRandInitBaseFen() {
    let s = FenUtil.setupPieces(
      ['j', 'l', 's', 'q', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: ['r', 'j']}],
        diffCol: ['bs'],
        range: {'s': [2, 3, 4, 5]},
        flags: ['r', 'j']
      }
    );
    const random = (this.options["randomness"] > 0);
    const fen = s.b.join("").replace('l', random ? 'g' : 'f') +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      s.w.join("").replace('l', random > 0 ? 'c' : 'd').toUpperCase();
    return {
      fen,
      o: {flags: s.flags}
    };
  }

  // obj == "-", {-1,-1} or ["]{x,y}["]
  static convertPush(obj) {
    if (typeof obj === "string")
      // Reading from FEN
      return obj == "-" ? {x: -1, y: -1} : JSON.parse(obj);
    // Sending to FEN
    return obj.x < 0 ? "-" : JSON.stringify(obj);
  }

  getPartFen(o) {
    return Object.assign(
      {
        pushFrom: o.init ? "-" : V.convertPush(this.pushFrom),
        pushedTo: o.init ? "-" : V.convertPush(this.pushedTo)
      },
      super.getPartFen(o)
    );
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.pushFrom = V.convertPush(fenParsed.pushFrom);
    this.pushedTo = V.convertPush(fenParsed.pushedTo);
  }

  pieces(color, x, y) {
    const mirror = (this.playerColor == 'b');
    return {
      'j': {
        "class": "jailer",
        moves: [
          {steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]}
        ]
      },
      's': {
        "class": "sentry",
        indirectAttack: true,
        both: [
          {steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]]}
        ]
      },
      'c': {
        "class": mirror ? "lancer_S" : "lancer_N",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'd': {
        "class": mirror ? "lancer_SO" : "lancer_NE",
        both: [
          {steps: [[-1, 1]]}
        ]
      },
      'e': {
        "class": mirror ? "lancer_O" : "lancer_E",
        both: [
          {steps: [[0, 1]]}
        ]
      },
      'f': {
        "class": mirror ? "lancer_NO" : "lancer_SE",
        both: [
          {steps: [[1, 1]]}
        ]
      },
      'g': {
        "class": mirror ? "lancer_N" : "lancer_S",
        both: [
          {steps: [[1, 0]]}
        ]
      },
      'h': {
        "class": mirror ? "lancer_NE" : "lancer_SO",
        both: [
          {steps: [[1, -1]]}
        ]
      },
      'm': {
        "class": mirror ? "lancer_E" : "lancer_O",
        both: [
          {steps: [[0, -1]]}
        ]
      },
      'o': {
        "class": mirror ? "lancer_SE" : "lancer_NO",
        both: [
          {steps: [[-1, -1]]}
        ]
      },
      ...super.pieces(color, x, y)
    };
  }

  canIplay(x, y) {
    if (
      this.pushFrom.x == x && this.pushFrom.y == y &&
      this.getColor(x, y) != this.playerColor
    ) {
      return true;
    }
    return super.canIplay(x, y);
  }

  canStepOver(i, j, p, c) {
    const colIJ = this.getColor(i, j);
    return this.board[i][j] == "" || (V.LANCERS.includes(p) && c == colIJ);
  }

  isImmobilized([x, y]) {
    const color = this.getColor(x, y);
    const oppCol = C.GetOppTurn(color);
    const stepSpec = this.getStepSpec(color, x, y, 'j');
    for (let step of stepSpec.moves[0].steps) {
      let [i, j] = this.increment([x, y], step);
      if (
        this.onBoard(i, j) &&
        this.getPiece(i, j) == 'j' &&
        this.getColor(i, j) == oppCol
      ) {
        return true;
      }
    }
    return false;
  }

  getPassMoves(x, y) {
    const col = this.getColor(x, y);
    let res = [];
    if (this.getPiece(x, y) == 'k') {
      for (let i of [-1, 1]) {
        for (let j of [-1, 1]) {
          if (
            this.onBoard(x + i, y + j) &&
            this.getPiece(x + i, y + j) == 'j' &&
            this.getColor(x + i, y + j) != col
          ) {
            res.push( new Move({
              appear: [],
              vanish: [],
              start: {x: x, y: y},
              end: {x: x + i, y: y + j}
            }) );
          }
        }
      }
    }
    return res;
  }

  // Reorient immobilized or stuck lancer
  doClick(coords) {
    if (typeof coords.x != "number")
      return null; //click on reserves
    if (this.board[coords.x][coords.y] != "") {
      const p = this.getPiece(coords.x, coords.y),
            c = this.getColor(coords.x, coords.y);
      const lopts = this.getLancerOptions(coords.x, coords.y);
      if (
        V.LANCERS.includes(p) &&
        (
          this.pushedTo.x < 0 && //not just pushed
          !lopts.includes(p) //can't move
        )
        ||
        (
          this.pieces()['j'].moves[0].steps.some(s => {
            const [i, j] = [coords.x + s[0], coords.y + s[1]];
            return (
              this.onBoard(i, j) &&
              this.getPiece(i, j) == 'j' &&
              this.getColor(i, j) != c
            );
          })
        )
      ) {
        return lopts.filter(o => o != p).map(o => {
          return new Move({
            appear: [ new PiPo({x: coords.x, y: coords.y, p: o, c: c}) ],
            vanish: [ new PiPo({x: coords.x, y: coords.y, p: p, c: c}) ]
          });
        });
      }
    }
    return null;
  }

  getPotentialMovesFrom([x, y]) {
    const p = this.getPiece(x, y);
    let color = this.getColor(x, y);
    let oppCol = C.GetOppTurn(color)
    if (this.pushFrom.x < 0 || this.pushedTo.x >= 0) {
      let smoves = super.getPotentialMovesFrom([x, y]);
      // Forbid direction x,y --> pushFrom if x,y == pushedTo
      if (x == this.pushedTo.x && y == this.pushedTo.y) {
        smoves = smoves.filter(m => {
          let sx = this.pushFrom.x - x,
              sy = this.pushFrom.y - y;
          let divideBy = sx != 0 && sy != 0 && Math.abs(sx) != Math.abs(sy)
            ? 1
            : Math.max(sx, sy);
          return ( !super.compatibleStep(
            [x, y], [m.end.x, m.end.y],
            [sx / divideBy, sy / divideBy]
          ) );
        });
        if (V.LANCERS.includes(p)) {
          // Allow all other directions without reorient
          const ls = this.pieces()[p].both[0].steps[0];
          for (const lCode of V.LANCERS) {
            const s = this.pieces()[lCode].both[0].steps[0];
            if (s[0] != ls[0] || s[1] != ls[1]) {
              this.board[x][y] = color + lCode;
              super.findDestSquares([x, y], {}).forEach(r => {
                let mv = new Move({
                  appear: [
                    new PiPo({x: r.sq[0], y: r.sq[1], p: lCode, c: color})],
                  vanish: [
                    new PiPo({x: x, y: y, p: p, c: color})],
                  noReorient: true
                });
                if (this.board[r.sq[0]][r.sq[1]] != "") {
                  mv.vanish.push(
                    new PiPo({
                      x: r.sq[0],
                      y: r.sq[1],
                      p: this.getPiece(r.sq[0], r.sq[1]),
                      c: oppCol
                    })
                  );
                }
                smoves.push(mv);
              });
            }
          }
          this.board[x][y] = color + p;
          // Add reorient-only moves, if stuck:
          const lopts = this.getLancerOptions(x, y);
          if (!lopts.includes(p)) {
            const kp = this.searchKingPos(color)[0];
            Array.prototype.push.apply(smoves, lopts.map(o => {
              return new Move({
                appear: [ new PiPo({x: x, y: y, p: o, c: color}) ],
                vanish: [ new PiPo({x: x, y: y, p: p, c: color}) ],
                end: {x: kp[0], y: kp[1]}
              });
            }) );
          }
        }
      }
      return smoves.concat(this.getPassMoves(x, y));
    }
    // pushFrom.x >= 0 && pushedTo.x < 0
    if (x != this.pushFrom.x || y != this.pushFrom.y)
      return [];
    // After sentry "attack": move enemy as if it was ours
    [color, oppCol] = [oppCol, color];
    this.board[x][y] = color + p;
    let pmoves = super.getPotentialMovesFrom([x, y], color, true)
      .filter(m => m.appear.length > 0); //exclude sentry "captures"
    if (V.LANCERS.includes(p)) {
      pmoves.forEach(m => m.noReorient = true);
      // Allow all other steps by 1 square (nudge)
      const ls = this.pieces()[p].both[0].steps[0];
      let nextP = p;
      for (const lCode of V.LANCERS) {
        const s = this.pieces()[lCode].both[0].steps[0];
        if (
          (s[0] != ls[0] || s[1] != ls[1]) &&
          this.onBoard(x + s[0], y + s[1]) &&
          this.board[x + s[0]][y + s[1]] == ""
        ) {
          let mv = new Move({
            appear: [new PiPo({x: x + s[0], y: y + s[1], p: lCode, c: color})],
            vanish: [new PiPo({x: x, y: y, p: p, c: color})]
          });
          mv.noReorient = true;
          pmoves.push(mv);
        }
      }
    }
    this.board[x][y] = oppCol + p;
    pmoves.forEach(m => {
      m.appear[0].c = m.vanish[0].c = oppCol;
      m.appear.push( new PiPo({x:x, y:y, p:'s', c:this.turn}) );
    });
    return this.postProcessPotentialMoves(pmoves);
  }

  postProcessPotentialMoves(moves) {
    moves = super.postProcessPotentialMoves(moves);
    let finalMoves = [];
    for (const m of moves) {
      // Drop lancers "self captures" (not from sentry push):
      if (
        !m.noReorient &&
        m.vanish.length == 2 &&
        m.vanish[0].c == m.vanish[1].c
      ) {
        continue;
      }
      // Reorient a lancer after drop or regular move
      if (
        !m.noReorient &&
        (
          (m.vanish.length == 0 && ['c', 'g'].includes(m.appear[0].p)) ||
          (
            (m.vanish.length > 0 && V.LANCERS.includes(m.vanish[0].p)) &&
            // Next line test checks that the lancer wasn't just pushed away
            (m.start.x != this.pushedTo.x || m.start.y != this.pushedTo.y)
          )
        )
      ) {
        this.getLancerOptions(m.end.x, m.end.y).forEach(o => {
          finalMoves.push( new Move({
            appear: [new PiPo({x:m.end.x,y:m.end.y,c:m.appear[0].c,p:o})],
            vanish: m.vanish
          }) );
        });
      }
      else if (m.vanish.length == 2 && m.vanish[0].p == 's') {
        // Sentry "capture" --> remove sentry from final square (TODO: blink?)
        finalMoves.push( new Move({
          appear: [],
          vanish: [ m.vanish[0] ],
          end: m.end
        }) );
      }
      else
        finalMoves.push(m);
    }
    return finalMoves;
  }

  postPlay(move) {
    if (
      move.appear.length == 0 &&
      move.vanish.length > 0 &&
      move.vanish[0].p == 's'
    ) {
      // Sentry push ("capturing" part)
      this.pushFrom = {x: move.end.x, y: move.end.y};
      this.pushedTo = {x: -1, y: -1};
    }
    else if (move.vanish.length > 0 && move.vanish[0].c != this.turn)
      this.pushedTo = {x: move.end.x, y: move.end.y};
    else {
      // All other cases: just reset both push variables
      this.pushFrom = {x: -1, y: -1};
      this.pushedTo = {x: -1, y: -1};
    }
    super.postPlay(move);
  }

  isLastMove(move) {
    if (move.appear.length == 0) //move.vanish[0].p == 's'
      return false;
    return super.isLastMove(move);
  }

  underAttack([x, y], oppCols) {
    if (super.underAttack([x, y], oppCols))
      return true;
    const oppCol = oppCols[0];
    const color = C.GetOppTurn(oppCol);
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getPiece(i, j) == 's' &&
          this.getColor(i, j) == oppCol
        ) {
          this.board[i][j] = oppCol + 'b';
          // Find enemy sentries "attacks":
          const rs = super.findDestSquares([i, j], {attackOnly: true});
          this.board[i][j] = oppCol + 's';
          // Can any of these pieces capture our king?
          for (const r of rs) {
            const p = this.getPiece(r.sq[0], r.sq[1]);
            if (['j', 's'].includes(p))
              continue;
            const specs = this.pieces(oppCol, r.sq[0], r.sq[1])[p];
            const steps = (specs.both || specs.attack)[0].steps;
            let res = false;
            for (const s of steps) {
              let [ii, jj] = [r.sq[0] + s[0], r.sq[1] + s[1]];
              while (this.onBoard(ii, jj) && this.board[ii][jj] == "")
                [ii, jj] = [ii + s[0], jj + s[1]];
              if (ii == x && jj == y)
                return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Lazy sentry attacks check: after push move
  filterValid(moves, color) {
    let sentryAttack = [];
    moves = moves.filter(m => {
      if (m.appear.length == 0) {
        sentryAttack.push(m);
        return false;
      }
      return true;
    });
    return super.filterValid(moves, color).concat(sentryAttack);
  }

  updateReserve(color, piece, count) {
    if (V.LANCERS.includes(piece))
      // Show only one lancer orientation, and reorient when drop:
      piece = (color == 'w' ? 'c' : 'g');
    super.updateReserve(color, piece, count);
  }

};
