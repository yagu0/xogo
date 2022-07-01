import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class HexRules extends ChessRules {

  static get Options() {
    return {
      input: [
        {
          label: "Board size",
          variable: "bsize",
          type: "number",
          defaut: 11
        },
        {
          label: "Swap",
          variable: "swap",
          type: "checkbox",
          defaut: true
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
  get hasReserve() {
    return false;
  }
  get noAnimate() {
    return true;
  }
  get clickOnly() {
    return true;
  }

  doClick(coords) {
    if (
      this.playerColor != this.turn ||
      (
        this.board[coords.x][coords.y] != "" &&
        (!this.options["swap"] || this.movesCount >= 2)
      )
    ) {
      return null;
    }
    let res = new Move({
      start: {x: coords.x, y: coords.y},
      appear: [
        new PiPo({
          x: coords.x,
          y: coords.y,
          c: this.turn,
          p: 'p'
        })
      ],
      vanish: []
    });
    if (this.board[coords.x][coords.y] != "") {
      res.vanish.push(
        new PiPo({
          x: coords.x,
          y: coords.y,
          c: C.GetOppCol(this.turn),
          p: 'p'
        })
      );
    }
    return res;
  }

  genRandInitBaseFen() {
    // NOTE: size.x == size.y (square boards)
    const emptyCount = C.FenEmptySquares(this.size.x);
    return {
      fen: (emptyCount + "/").repeat(this.size.x).slice(0, -1) + " w 0",
      o: {}
    };
  }

  getSvgChessboard() {
    // NOTE: with small margin seems nicer
    let width = 173.2 * this.size.y + 173.2 * (this.size.y-1) / 2 + 30,
        height = 50 + Math.floor(150 * this.size.x) + 30,
        min_x = -86.6 - 15,
        min_y = -100 - 15;
    if (this.size.ratio < 1) {
      // Rotate by 30 degrees to display vertically
      [width, height] = [height, width];
      [min_x, min_y] = [min_y, min_x];
    }
    let board = `
      <svg
        viewBox="${min_x} ${min_y} ${width} ${height}"
        class="chessboard_SVG">
      <defs>
        <g id="hexa">
          <polygon
            style="stroke:#000000;stroke-width:1"
            points="0,-100.0 86.6,-50.0 86.6,50.0 0,100.0 -86.6,50.0 -86.6,-50.0"
          />
        </g>
      </defs>`;
    board += "<g";
    if (this.size.ratio < 1)
      board += ` transform="rotate(30)"`
    board += ">";
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        board += `
          <use
            href="#hexa"
            class="neutral-square"
            id="${this.coordsToId({x: i, y: j})}"
            x="${173.2*j + 86.6*i}"
            y="${150*i}"
          />`;
      }
    }
    board += `</g><g style="fill:none;stroke-width:10"`;
    if (this.size.ratio < 1)
      board += ` transform="rotate(30)"`
    // Goals: up/down/left/right
    board += `><polyline style="stroke:red" points="`
    for (let i=0; i<=2*this.size.y; i++)
      board += ((i-1)*86.6) + ',' + (i % 2 == 0 ? -50 : -100) + ' ';
    board += `"/><polyline style="stroke:red" points="`;
    for (let i=1; i<=2*this.size.y; i++) {
      const jShift = 200 * Math.floor((this.size.y+1)/2) +
                     100 * (Math.floor(this.size.y/2) - 1) +
                     (i % 2 == 0 ? -50 : 0) +
                     (this.size.y % 2 == 0 ? 50 : 0);
      board += ((i+this.size.y-2)*86.6) + ',' + jShift + ' ';
    }
    board += `"/><polyline style="stroke:blue" points="`;
    let sumY = -100;
    for (let i=0; i<=2*this.size.x; i++) {
      board += ((Math.floor(i/2)-1) * 86.6) + ',' +
               (sumY += (i % 2 == 0 ? 50 : 100)) + ' ';
    }
    board += `"/><polyline style="stroke:blue" points="`;
    sumY = -100;
    for (let i=0; i<2*this.size.x; i++) {
      board += (173.2*this.size.x + (Math.floor(i/2)-1) * 86.6) + ',' +
               (sumY += (i % 2 == 0 ? 50 : 100)) + ' ';
    }
    board += `"/></g></svg>`;
    return board;
  }

  setupPieces() {
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.board[i][j] != "") {
          const sqColor = (this.getColor(i, j) == 'w' ? "white" : "black");
          const elt = document.getElementById(this.coordsToId({x: i, y: j}));
          elt.classList.remove("neutral-square");
          elt.classList.add("bg-" + sqColor);
        }
      }
    }
  }

  get size() {
    const baseRatio = 1.6191907514450865; //2801.2 / 1730, "widescreen"
    const rc =
      document.getElementById(this.containerId).getBoundingClientRect();
    const rotate = rc.width < rc.height; //"vertical screen"
    return {
      x: this.options["bsize"],
      y: this.options["bsize"],
      ratio: (rotate ? 1 / baseRatio : baseRatio)
    };
  }

  play(move) {
    this.playOnBoard(move);
    this.movesCount++;
    this.turn = C.GetOppCol(this.turn);
  }

  getCurrentScore(move) {
    const oppCol = C.GetOppCol(this.turn);
    // Search for connecting path of opp color:
    let explored = {}, component;
    let min, max;
    const getIndex = (x, y) => x + "." + y;
    // Explore one connected component:
    const neighborsSearch = ([x, y], index) => {
      // Let's say "white" connects on x and "black" on y
      const z = (oppCol == 'w' ? x : y);
      if (z < min)
        min = z;
      if (z > max)
        max = z;
      explored[index] = true;
      component[index] = true;
      for (let [dx, dy] of super.pieces()['k'].moves[0].steps) {
        const [nx, ny] = [x + dx, y + dy];
        const nidx = getIndex(nx, ny);
        if (
          this.onBoard(nx, ny) &&
          this.getColor(nx, ny) == oppCol &&
          !component[nidx]
        ) {
          neighborsSearch([nx, ny], nidx);
        }
      }
    };
    // Explore all components:
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        const index = getIndex(i, j);
        if (this.getColor(i, j) == oppCol && !explored[index]) {
          component = {};
          [min, max] = [this.size.x, 0];
          neighborsSearch([i, j], index);
          if (max - min == this.size.x - 1)
            return (oppCol == "w" ? "1-0" : "0-1");
        }
      }
    }
    return "*";
  }

  playVisual(move) {
    move.vanish.forEach(v => {
      let elt = document.getElementById(this.coordsToId({x: v.x, y: v.y}));
      elt.classList.remove("bg-" + (v.c == 'w' ? "white" : "black"));
    });
    move.appear.forEach(a => {
      let elt = document.getElementById(this.coordsToId({x: a.x, y: a.y}));
      elt.classList.add("bg-" + (a.c == 'w' ? "white" : "black"));
    });
  }

};
