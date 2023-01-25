import ChessRules from "/base_rules.js";
import Move from "/utils/Move.js";
import PiPo from "/utils/PiPo.js";
import {ArrayFun} from "/utils/array.js";

export default class WeiqiRules extends ChessRules {

  static get Options() {
    return {
      input: [
        {
          label: "Board size",
          variable: "bsize",
          type: "number",
          defaut: 9
        },
        {
          label: "One color",
          variable: "onecolor",
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
  get clickOnly() {
    return true;
  }

  getSvgChessboard() {
    const flipped = (this.playerColor == 'b');
    let board = `
      <svg
        viewBox="0 0 ${10*(this.size.y)} ${10*(this.size.x)}"
        class="chessboard_SVG">`;
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        const ii = (flipped ? this.size.x - 1 - i : i);
        const jj = (flipped ? this.size.y - 1 - j : j);
        board += `
          <rect
            id="${this.coordsToId({x: ii, y: jj})}"
            width="10"
            height="10"
            x="${10*j}"
            y="${10*i}"
            fill="transparent"
          />`;
      }
    }
    // Add lines to delimitate "squares"
    for (let i = 0; i < this.size.x; i++) {
      const y = i * 10 + 5, maxX = this.size.y * 10 - 5;
      board += `
        <line x1="5" y1="${y}" x2="${maxX}" y2="${y}"
              stroke="black" stroke-width="0.2"/>`;
    }
    for (let i = 0; i < this.size.x; i++) {
      const x = i * 10 + 5, maxY = this.size.x * 10 - 5;
      board += `
        <line x1="${x}" y1="5" x2="${x}" y2="${maxY}"
              stroke="black" stroke-width="0.2"/>`;
    }
    board += "</svg>";
    return board;
  }

  get size() {
    return {
      x: this.options["bsize"],
      y: this.options["bsize"],
    };
  }

  genRandInitBaseFen() {
    const fenLine = C.FenEmptySquares(this.size.y);
    return {
      fen: (fenLine + '/').repeat(this.size.x - 1) + fenLine,
      o: {}
    };
  }

  constructor(o) {
    super(o);
    if (!o.diagram) {
      this.passListener = () => {
        if (this.turn == this.playerColor) {
          let mv = {
            // Need artificial start/end for animate (TODO?)
            start: {x: -1, y: -1},
            end: {x: -1, y: -1},
            appear: [],
            vanish: [],
            pass: true
          };
          this.buildMoveStack(mv);
        }
      };
      // Show pass btn
      let passBtn = document.createElement("button");
      C.AddClass_es(passBtn, "pass-btn");
      passBtn.innerHTML = "pass";
      passBtn.addEventListener("click", this.passListener);
      let container = document.getElementById(this.containerId);
      container.appendChild(passBtn);
    }
  }

  removeListeners() {
    super.removeListeners();
    let passBtn_arr = document.getElementsByClassName("pass-btn");
    if (passBtn_arr.length >= 1)
      passBtn_arr[0].removeEventListener("click", this.passListener);
  }

  pieces(color, x, y) {
    let classe_s = ["stone"];
    if (this.options["onecolor"] && color == 'w')
      classe_s.push("one-color");
    return {
      's': {
        "class": classe_s,
        moves: []
      }
    };
  }

  doClick(coords) {
    const [x, y] = [coords.x, coords.y];
    if (this.board[x][y] != "" || this.turn != this.playerColor)
      return null;
    const color = this.turn;
    const oppCol = C.GetOppTurn(color);
    let move = new Move({
      appear: [new PiPo({x: x, y: y, c: color, p: 's'})],
      vanish: [],
      start: {x: x, y: y}
    });
    this.playOnBoard(move); //put the stone
    let captures = [];
    let inCaptures = {};
    let explored = ArrayFun.init(this.size.x, this.size.y, false);
    const suicide = !this.searchForEmptySpace([x, y], color, explored);
    for (let s of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (this.onBoard(i, j) && !inCaptures[i + "." + j]) {
        if (this.getColor(i, j) == oppCol) {
          // Free space for opponent => not a capture
          let oppExplored = ArrayFun.init(this.size.x, this.size.y, false);
          const captureSomething =
            !this.searchForEmptySpace([i, j], oppCol, oppExplored);
          if (captureSomething) {
            for (let ii = 0; ii < this.size.x; ii++) {
              for (let jj = 0; jj < this.size.y; jj++) {
                if (oppExplored[ii][jj]) {
                  captures.push(new PiPo({x: ii, y: jj, c: oppCol, p: 's'}));
                  inCaptures[ii + "." + jj] = true;
                }
              }
            }
          }
        }
      }
    }
    this.undoOnBoard(move); //remove the stone
    if (suicide && captures.length == 0)
      return null;
    Array.prototype.push.apply(move.vanish, captures);
    return move;
  }

  searchForEmptySpace([x, y], color, explored) {
    explored[x][y] = true;
    for (let s of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        this.onBoard(i, j) &&
        !explored[i][j] &&
        (
          this.board[i][j] == "" ||
          (
            this.getColor(i, j) == color &&
            this.searchForEmptySpace([i, j], color, explored)
          )
        )
      ) {
        return true;
      }
    }
    return false;
  }

  play(move) {
    if (move.pass) {
      if (this.turn != this.playerColor)
        super.displayMessage(null, "pass", "pass-text", 2000);
      this.turn = C.GetOppTurn(this.turn);
    }
    else
      super.play(move);
  }

  filterValid(moves) {
    // Suicide check not here, because side-computation of captures
    return moves;
  }

  getCurrentScore() {
    return "*"; //Go game is a little special...
  }

};
