import ChessRules from "/base_rules.js";
import {Random} from "/utils/alea.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class AvalamRules extends ChessRules {

  static get Options() {
    return {
      select: [{
        label: "Randomness",
        variable: "randomness",
        defaut: 1,
        options: [
          {label: "Deterministic", value: 0},
          {label: "Random", value: 1},
        ]
      }],
      input: [
        {
          label: "Free placement",
          variable: "freefill",
          type: "checkbox",
          defaut: false
        }
      ]
    };
  }

  get hasFlags() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  pieces(color, x, y) {
    const steps = [
      [1, 0], [0, 1], [-1, 0], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    return {
      'b': {
        "class": "stack",
        both: [{steps: steps, range: 1}]
      },
      'c': {
        "class": "stack2",
        moveas: 'b'
      },
      'd': {
        "class": "stack3",
        moveas: 'b'
      },
      'e': {
        "class": "stack4",
        moveas: 'b'
      },
      'f': {
        "class": "stack5",
        moveas: 'b'
      }
    };
  }

  genRandInitBaseFen() {
    let fen = "";
    if (this.freefill)
      fen = "9/".repeat(8) + "9";
    else if (this.options["randomness"] == 0) {
      fen = "2Bb5/1BbBb4/1bBbBbB2/1BbBbBbBb/BbBb1bBbB/" +
            "bBbBbBbB1/2BbBbBb1/4bBbB1/5bB2";
    }
    else {
      const pieces = ('B'.repeat(24) + 'b'.repeat(24)).split("");
      const a = Random.shuffle(pieces, 48).join("");
      fen = (
        "2" + a.substr(0, 2) + "5/1" + a.substr(2, 4) +
        "4/1" + a.substr(6, 6) + "2/1" + a.substr(12, 8) +
        "/" + a.substr(20, 4) + "1" + a.substr(24, 4) +
        "/" + a.substr(28, 8) + "1/2" + a.substr(36, 6) +
        "1/4" + a.substr(42, 4) + "1/5" + a.substr(46, 2) + "2"
      );
    }
    return { fen: fen, o: {} };
  }

  getSquareColorClass(x, y) {
    return "board-sq";
  }

  get size() {
    return {x: 9, y: 9};
  }

  onBoard(x, y) {
    if (!super.onBoard(x, y))
      return false;
    switch (x) {
      case 0:
        return [2, 3].includes(y);
      case 1:
        return [1, 2, 3, 4].includes(y);
      case 2:
        return [1, 2, 3, 4, 5, 6].includes(y);
      case 3:
        return y >= 1;
      case 4:
        return y != 4;
      case 5:
        return y <= 7;
      case 6:
        return [2, 3, 4, 5, 6, 7].includes(y);
      case 7:
        return [4, 5, 6, 7].includes(y);
      case 8:
        return [5, 6].includes(y);
    }
    return false; //never reached
  }

  canIplay() {
    return this.playerColor == this.turn;
  }

  doClick(coords) {
    if (!this.freefill || this.board[coords.x][coords.y] != "")
      return null;
    return new Move({
      start: {x: coords.x, y: coords.y},
      vanish: [],
      appear: [new PiPo({x: coords.x, y: coords.y, c: this.turn, p: 'b'})]
    });
  }

  getBasicMove([x1, y1], [x2, y2]) {
    const cp1 = this.board[x1][y1],
          cp2 = this.board[x2][y2];
    const newPiece =
      String.fromCharCode(cp1.charCodeAt(1) + cp2.charCodeAt(1) - 97);
    return (
      new Move({
        vanish: [
          new PiPo({ x: x1, y: y1, c: cp1.charAt(0), p: cp1.charAt(1) }),
          new PiPo({ x: x2, y: y2, c: cp2.charAt(0), p: cp2.charAt(1) })
        ],
        appear: [
          new PiPo({ x: x2, y: y2, c: cp1.charAt(0), p: newPiece })
        ]
      })
    );
  }

  getPotentialMovesFrom([x, y]) {
    const height = this.board[x][y].charCodeAt(1) - 97;
    if (height == 5)
      return [];
    let moves = [];
    for (let s of this.pieces(this.turn, x, y)['b'].both[0].steps) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        (height + this.board[i][j].charCodeAt(1) - 97 <= 5)
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    let towersCount = {w: 0, b: 0};
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.board[i][j] != "") {
          if (this.getPotentialMovesFrom([i, j]).length > 0)
            return '*';
          towersCount[ this.board[i][j][0] ]++;
        }
      }
    }
    if (towersCount['w'] > towersCount['b'])
      return "1-0";
    if (towersCount['b'] > towersCount['w'])
      return "0-1";
    return "1/2";
  }

};
