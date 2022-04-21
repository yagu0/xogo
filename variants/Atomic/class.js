import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class AtomicRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: [
        {
          label: "Balanced",
          defaut: false,
          variable: "rempawn"
        },
        {
          label: "Falling pawn",
          defaut: false,
          variable: "pawnfall"
        }
      ],
      styles: C.Options.styles.filter(s => s != "atomic")
    };
  }

  constructor(o) {
    super(o);
    this.options["atomic"] = true;
  }

  canIplay(x, y) {
    if (this.options["rempawn"] && this.movesCount == 0)
      return (this.turn == side && this.getPiece(x, y) == "p");
    return super.canIplay(x, y);
  }

  getPotentialMovesFrom([x, y], color) {
    if (this.options["rempawn"] && this.movesCount == 0) {
      if ([1, 6].includes(x)) {
        const c = this.getColor(x, y);
        return [
          new Move({
            appear: [],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                p: "p",
                c: c
              })
            ],
            start: { x: x, y: y },
            end: { x: x, y: y }
          })
        ];
      }
      return [];
    }
    return super.getPotentialMovesFrom([x, y], color);
  }

  doClick(square) {
    if (!this.options["rempawn"] || this.movesCount >= 1)
      return super.doClick(square);
    const [x, y] = [square[0], square[1]];
    const moves = this.getPotentialMovesFrom([x, y]);
    return (moves.length >= 1 ? moves[0] : null);
  }

};
