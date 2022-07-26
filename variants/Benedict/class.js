import AbstractFlipRules from "/variants/_Flip/class.js";

export default class BenedictRules extends AbstractFlipRules {

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
    const oppCol = C.GetOppCol(this.turn);
    let bMoves = super.postProcessPotentialMoves(moves);
    bMoves.forEach(m => {
      m.flips = [];
      if (!this.options["cleopatra"] || m.vanish[0].p == 'q') {
        super.playOnBoard(m);
        let attacks = super.findDestSquares(
          [m.end.x, m.end.y],
          {
            attackOnly: true,
            segments: this.options["cylinder"]
          },
          ([i1, j1], [i2, j2]) => {
            return (
              super.canTake([i1, j1], [i2, j2]) &&
              (!this.options["zen"] || this.getPiece(i2, j2) == 'k')
            );
          }
        );
        if (this.options["zen"]) {
          const zenAttacks = super.findCapturesOn(
            [m.end.x, m.end.y],
            {
              byCol: [oppCol],
              segments: this.options["cylinder"]
            },
            ([i1, j1], [i2, j2]) =>
              this.getPiece(i1, j1) != 'k' && super.canTake([i2, j2], [i1, j1])
          );
          Array.prototype.push.apply(attacks, zenAttacks);
        }
        super.undoOnBoard(m);
        attacks.forEach(a => m.flips.push({x: a.sq[0], y: a.sq[1]}));
      }
    });
    return bMoves;
  }

};
