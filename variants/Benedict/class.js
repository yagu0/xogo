import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";

export default class BenedictRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [
        {
          label: "Cleopatra",
          variable: "cleopatra",
          type: "checkbox",
          defaut: false
        }
      ],
      styles: [
        "balance",
        "cylinder",
        "dark",
        "doublemove",
        "progressive",
        "zen"
      ]
    };
  }

  get hasEnpassant() {
    return false;
  }

  canTake() {
    return false;
  }

  pieces(color, x, y) {
    if (!this.options["cleopatra"])
      return super.pieces(color, x, y);
    const allSpecs = super.pieces(color, x, y);
    return Object.assign({},
      allSpecs,
      {'q': Object.assign({}, allSpecs['q'], {"class": "cleopatra"})}
    );
  }

  postProcessPotentialMoves(moves) {
    moves.forEach(m => {
      m.flips = [];
      if (!this.options["cleopatra"] || m.vanish[0].p == 'q') {
        super.playOnBoard(m);
        let attacks = super.findDestSquares(
          [m.end.x, m.end.y],
          {attackOnly: true, segments: false},
          ([x, y] => this.canTake([m.end.x, m.end.y], [x, y]))
        );
        if (this.options["zen"]) {
          const zenAttacks = super.findCapturesOn(
            [m.end.x, m.end.y],
            {segments: false},
            ([x, y] => this.canTake([m.end.x, m.end.y], [x, y]))
          );
          Array.prototype.push.apply(attacks, zenAttacks);
        }
        super.undoOnBoard(m);
        attacks.forEach(a => m.flips.push({x: a.sq[0], y: a.sq[1]}));
      }
    });
    return moves;
  }

  playOnBoard(move) {
    super.playOnBoard(move);
    this.flipColorOf(move.flips);
  }
  undoOnBoard(move) {
    super.undoOnBoard(move);
    this.flipColorOf(move.flips);
  }

  flipColorOf(flips) {
    for (let xy of flips) {
      const newColor = C.GetOppCol(this.getColor(xy.x, xy.y));
      this.board[xy.x][xy.y] = newColor + this.board[xy.x][xy.y][1];
    }
  }

  // Moves cannot flip our king's color, so all are valid
  filterValid(moves) {
    return moves;
  }

  // A king under (regular) check flips color, and the game is over.
  underCheck() {
    return false;
  }

  playVisual(move, r) {
    super.playVisual(move, r);
    move.flips.forEach(f => {
      this.g_pieces[f.x][f.y].classList.toggle("white");
      this.g_pieces[f.x][f.y].classList.toggle("black");
    });
  }

};
