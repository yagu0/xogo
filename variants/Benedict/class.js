import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";

export default class BenedictRules extends ChessRules {

  static get Options() {
    return {
      select: ChessRules.Options.select,
      check: [],
      styles: (
        ChessRules.Options.styles.filter(s => {
          return (
            ["balance", "cylinder", "dark", "doublemove", "progressive", "zen"]
            .includes(s)
          );
        })
      )
    };
  }

  get hasEnpassant() {
    return false;
  }

  get pawnSpecs() {
    return Object.assign(
      {},
      super.pawnSpecs,
      { canCapture: false }
    );
  }

  canTake() {
    return false;
  }

  // Find potential captures from a square
  // follow steps from x,y until something is met.
  findAttacks([x, y]) {
    const [color, piece] = [this.getColor(x, y), this.getPiece(x, y)];
    const oppCol = ChessRules.GetOppCol(color);
    let squares = {};
    const specs = this.pieces(color)[piece];
    const steps = specs.attack || specs.steps;
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], this.computeY(y + step[1])];
      let nbSteps = 1;
      while (this.onBoard(i, j) && this.board[i][j] == "") {
        if (specs.range <= nbSteps++) continue outerLoop;
        i += step[0];
        j = this.computeY(j + step[1]);
      }
      if (this.onBoard(i, j) && this.getColor(i, j) == oppCol)
        squares[ChessRules.CoordsToSquare({x: i, y: j})] = true;
    }
    return Object.keys(squares);
  }

  postProcessPotentialMoves(moves) {
    if (moves.length == 0) return moves;
    const [x, y] = [moves[0].end.x, moves[0].end.y];
    const color = this.getColor(moves[0].start.x, moves[0].start.y);
    const oppCol = ChessRules.GetOppCol(color);
    moves = super.postProcessPotentialMoves(moves);
    moves.forEach(m => {
      this.playOnBoard(m);
      let attacks;
      if (this.options["zen"]) {
        let endSquares = {};
        super.getZenCaptures(x, y).forEach(c => {
          endSquares[ChessRules.CoordsToSquare(c.end)] = true;
        });
        attacks = Object.keys(endSquares);
      }
      else attacks = this.findAttacks([m.end.x, m.end.y])
      this.undoOnBoard(m);
      attacks.map(ChessRules.SquareToCoords).forEach(a => {
        const p = this.getPiece(a.x, a.y);
        m.appear.push(new PiPo({x: a.x, y: a.y, c: color, p: p}));
        m.vanish.push(new PiPo({x: a.x, y: a.y, c: oppCol, p: p}));
      });
    });
    return moves;
  }

  // Moves cannot flip our king's color, so (almost) all are valid
  filterValid(moves) {
    if (this.options["balance"] && [1, 3].includes(this.movesCount))
      return moves.filter(m => m.vanish.every(v => v.p != ChessRules.KING));
    return moves;
  }

  // Since it's used just for the king, and there are no captures:
  underCheck(square, color) {
    return false;
  }

};
