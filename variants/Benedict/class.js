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

  // Find potential captures from a square
  // follow steps from x,y until something is met.
  findAttacks([x, y]) {
    const [color, piece] = [this.getColor(x, y), this.getPiece(x, y)];
    const oppCol = C.GetOppCol(color);
    let squares = {};
    const specs = this.pieces(color, x, y)[piece];
    const attacks = specs.attack || specs.moves;
    for (let a of attacks) {
      outerLoop: for (let step of a.steps) {
        let [i, j] = [x + step[0], this.getY(y + step[1])];
        let nbSteps = 1;
        while (this.onBoard(i, j) && this.board[i][j] == "") {
          if (a.range <= nbSteps++)
            continue outerLoop;
          i += step[0];
          j = this.getY(j + step[1]);
        }
        if (
          this.onBoard(i, j) && this.getColor(i, j) == oppCol &&
          (!this.options["zen"] || this.getPieceType(i, j) == "k")
        ) {
          squares[C.CoordsToSquare({x: i, y: j})] = true;
        }
      }
    }
    return Object.keys(squares);
  }

  postProcessPotentialMoves(moves) {
    moves.forEach(m => {
      m.flips = [];
      if (!this.options["cleopatra"] || m.vanish[0].p == 'q') {
        super.playOnBoard(m);
        let attacks = this.findAttacks([m.end.x, m.end.y])
        if (this.options["zen"]) {
          let endSquares = {};
          super.findCapturesOn([m.end.x, m.end.y], {zen: true}).forEach(c => {
            endSquares[C.CoordsToSquare(c.end)] = true;
          });
          Array.prototype.push.apply(attacks, Object.keys(endSquares));
        }
        super.undoOnBoard(m);
        attacks.map(C.SquareToCoords).forEach(a => {
          m.flips.push({x: a.x, y: a.y});
        });
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

  postPlay(move) {
    if (this.options["balance"] && [1, 3].includes(this.movesCount)) {
      // If enemy king is flipped: game over
      const oppCol = C.GetOppCol(move.vanish[0].c);
      const oppKingPos = this.searchKingPos(oppCol);
      if (oppKingPos[0] < 0) {
        this.turn = oppCol;
        this.movesCount++;
        return;
      }
    }
    super.postPlay(move);
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
