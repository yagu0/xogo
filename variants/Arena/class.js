import ChessRules from "/base_rules.js";

export default class ArenaRules extends ChessRules {

  static get Options() {
    return {}; //TODO
  }

  get hasFlags() {
    return false;
  }

  getSvgChessboard() {
    let board = super.getSvgChessboard().slice(0, -6);
    // Add lines to delimitate the central area
    board += `
      <line x1="0" y1="20" x2="80" y2="20" stroke="black" stroke-width="0.15"/>
      <line x1="0" y1="60" x2="80" y2="60" stroke="black" stroke-width="0.15"/>
      </svg>`;
    return board;
  }

  pieces(color, x, y) {
    let allSpecs = super.pieces(color, x, y);
    let pawnSpec = allSpecs['p'],
        queenSpec = allSpecs['q'],
        kingSpec = allSpecs['k'];
    const pawnShift = (color == "w" ? -1 : 1);
    Array.prototype.push.apply(pawnSpec.attack[0].steps,
                               [[-pawnShift, 1], [-pawnShift, -1]]);
    queenSpec.moves[0].range = 3;
    kingSpec.moves[0].range = 3;
    return Object.assign({},
      allSpecs,
      {
        'p': pawnSpec,
        'q': queenSpec,
        'k': kingSpec
      }
    );
  }

  static InArena(x) {
    return Math.abs(3.5 - x) <= 1.5;
  }

  getPotentialMovesFrom([x, y]) {
    const moves = super.getPotentialMovesFrom([x, y]);
    // Eliminate moves which neither enter the arena or capture something
    return moves.filter(m => {
      const startInArena = V.InArena(m.start.x);
      const endInArena = V.InArena(m.end.x);
      return (
        (startInArena && endInArena && m.vanish.length == 2) ||
        (!startInArena && endInArena)
      );
    });
  }

  filterValid(moves) {
    // No check conditions
    return moves;
  }

  getCurrentScore() {
    const color = this.turn;
    if (!this.atLeastOneMove(color))
      // I cannot move anymore
      return color == 'w' ? "0-1" : "1-0";
    // Win if the opponent has no more pieces left (in the Arena),
    // (and/)or if he lost both his dukes.
    let someUnitRemain = false,
        atLeastOneDuke = false,
        somethingInArena = false;
    outerLoop: for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.getColor(i,j) == color) {
          someUnitRemain = true;
          if (this.movesCount >= 2 && V.InArena(i)) {
            somethingInArena = true;
            if (atLeastOneDuke)
              break outerLoop;
          }
          if (['q', 'k'].includes(this.getPiece(i, j))) {
            atLeastOneDuke = true;
            if (this.movesCount < 2 || somethingInArena)
              break outerLoop;
          }
        }
      }
    }
    if (
      !someUnitRemain ||
      !atLeastOneDuke ||
      (this.movesCount >= 2 && !somethingInArena)
    ) {
      return color == 'w' ? "0-1" : "1-0";
    }
    return "*";
  }

};
