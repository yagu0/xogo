import ChessRules from "/base_rules.js";
import {Random} from "/utils/alea.js";

export default class DiceRules extends ChessRules {

  static get Options() {
    let res = C.Options;
    res.select["defaut"] = 2;
    return {
      select: res.select,
      input: [
        {
          label: "Biased alea",
          variable: "biased",
          type: "checkbox",
          defaut: true
        },
        {
          label: "Falling pawn",
          variable: "pawnfall",
          type: "checkbox",
          defaut: false
        }
      ],
      styles: [
        "atomic",
        "capture",
        "crazyhouse",
        "cylinder",
        "madrasi",
        "recycle",
        "rifle",
        "zen"
      ]
    };
  }

  getPartFen(o) {
    let toplay = '';
    if (o.init) {
      let canMove = (this.options["biased"]
        ? Array(8).fill('p').concat(Array(2).fill('n'))
        : ['p', 'n']);
      toplay = canMove[Random.randInt(canMove.length)];
    }
    return Object.assign(
      { toplay: (o.init ? toplay : this.getRandomPiece(this.turn)) },
      super.getPartFen(o)
    );
  }

  constructor(o) {
    super(o);
    this.afterPlay = (move_s, newTurn, ops) => {
      // Movestack contains only one move:
      move_s[0].toplay = this.getRandomPiece(this.turn);
      this.toplay = move_s[0].toplay;
      this.displayMessage(move_s[0].toplay,
                          C.GetOppTurn(move_s[0].appear[0].c));
      o.afterPlay(move_s, newTurn, ops);
    };
  }

  displayMessage(piece, color) {
    if (color == 'b') {
      const blackPieceToCode = {
        'k': 'l',
        'p': 'o',
        'n': 'm',
        'b': 'v',
        'q': 'w',
        'r': 't'
      };
      piece = blackPieceToCode[piece];
    }
    super.displayMessage(this.message,
      '<span>to play:</span> ' +
      '<span class="symb">' + piece + '</span>'
    );
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.toplay = fenParsed.toplay;
    this.message = document.createElement("div");
    C.AddClass_es(this.message, "piece-text");
    let container = document.getElementById(this.containerId);
    container.appendChild(this.message);
    this.displayMessage(this.toplay, fenParsed.turn);
  }

  getRandomPiece(color) {
    // Find pieces which can move and roll a (biased) dice
    let canMove = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != "" && this.getColor(i, j) == color) {
          const piece = this.getPiece(i, j);
          if (this.findDestSquares([i, j], {one: true}))
            canMove.push(piece);
        }
      }
    }
    if (!this.options["biased"])
      canMove = [...new Set(canMove)];
    return canMove[Random.randInt(canMove.length)];
  }

  postProcessPotentialMoves(moves) {
    return super.postProcessPotentialMoves(moves).filter(m => {
      return (
        (m.appear.length >= 1 && m.appear[0].p == this.toplay) ||
        (m.vanish.length >= 1 && m.vanish[0].p == this.toplay)
      );
    });
  }

  filterValid(moves) {
    return moves;
  }

  playReceivedMove(moves, callback) {
    this.toplay = moves[0].toplay; //only one move
    this.displayMessage(this.toplay, C.GetOppTurn(moves[0].appear[0].c));
    super.playReceivedMove(moves, callback);
  }

};
