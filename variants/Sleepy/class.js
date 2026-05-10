import ChessRules from "/js/base_rules.js";
import PiPo from "/utils/PiPo.js";

export default class SleepyRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input.concat([
        {
          label: "Reset friends",
          variable: "refresh",
          type: "checkbox",
          defaut: false
        }
      ]),
      styles: ["balance", "capture", "cylinder", "dark", "zen"]
    };
  }

  setOtherVariables(fenParsed) {
    this.states = fenParsed.states.split('').map(x => parseInt(x, 10));
    super.setOtherVariables(fenParsed);
  }

  getPartFen(o) {
    return {
      "states": (o.init ? '0'.repeat(64) : this.states.join('')),
      ...super.getPartFen(o)
    };
  }

  pieces(color, x, y) {
    return {
      's': {"class": "sleepy-pawn"},
      'u': {"class": "sleepy-rook"},
      'o': {"class": "sleepy-knight"},
      'c': {"class": "sleepy-bishop"},
      't': {"class": "sleepy-queen"},
      ...super.pieces(color, x, y)
    };
  }

  static get M_PIECES() {
    return ['p', 'r', 'n', 'b', 'q'];
  }
  static get S_PIECES() {
    return ['s', 'u', 'o', 'c', 't'];
  }

  getPotentialMovesOf(piece, [x, y]) {
    if (V.S_PIECES.includes(piece))
      return [];
    return super.getPotentialMovesOf(piece, [x, y]);
  }

  // TODO: should post-process only the chosen move ?
  postProcessPotentialMoves(moves) {
    moves = super.postProcessPotentialMoves(moves);
    moves.forEach(mv => {
      mv.statePatch = {};
      // 1) Wake up observed pieces
      const color = mv.vanish[0].c;
      this.board[mv.start.x][mv.start.y] = "";
      const rs = super.findDestSquares(
        [mv.end.x, mv.end.y],
        {
          attackOnly: true,
          // NOTE: wake up others just before falling asleep
          stepSpec: super.getStepSpec(mv.vanish[0].c, 0, 0, mv.vanish[0].p)
        },
        (sq1, [x2, y2]) => this.getColor(x2, y2) == color
      );
      this.board[mv.start.x][mv.start.y] = color + mv.vanish[0].p;
      rs.forEach(r => {
        const r_idx = this.getStateIndex({x: r.sq[0], y: r.sq[1]});
        if (!this.states) debugger;
        if (this.states[r_idx] == 3) {
          const sleepyPiece = this.getPiece(r.sq[0], r.sq[1]);
          const awokenPiece = V.M_PIECES[V.S_PIECES.indexOf(sleepyPiece)]
          mv.vanish.push(
            new PiPo({x: r.sq[0], y: r.sq[1], c: color, p: sleepyPiece}) );
          mv.appear.push(
            new PiPo({x: r.sq[0], y: r.sq[1], c: color, p: awokenPiece}) );
          mv.statePatch[r_idx] = 0;
        }
        else if (this.options["refresh"] && this.states[r_idx] >= 1)
          mv.statePatch[r_idx] = 0;
      });
      // 2) Update sleepy status
      const m_idx = this.getStateIndex(mv.start);
      if (this.states[m_idx] == 2)
        mv.appear[0].p = V.S_PIECES[V.M_PIECES.indexOf(mv.appear[0].p)];
      mv.statePatch[m_idx] = 0;
      mv.statePatch[this.getStateIndex(mv.end)] = this.states[m_idx] + 1;
    });
    return moves;
  }

  getStateIndex(coords) {
    return this.size.y * coords.x + coords.y;
  }

  postPlay(move) {
    // Apply state diff:
    for (const [k, v] of Object.entries(move.statePatch))
      this.states[k] = v;
    super.postPlay(move);
  }

};
