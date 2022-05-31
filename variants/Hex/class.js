// https://www.boardspace.net/hex/english/Rules%20-%20HexWiki.htm
export default class HexRules extends ChessRules {

  static get Options() {
    return {
      input: [
        {
          label: "Board size",
          type: "number",
          defaut: 11,
          variable: "bsize"
        }
      ],
      check: [
        {
          label: "Swap",
          defaut: true,
          variable: "swap"
        }
      ]
    };
  }

  get hasReserve() {
    return false;
  }

  get noAnimate() {
    return true;
  }

  doClick(coords) {
    if (
      this.board[coords.x][coords.y] != "" &&
      (!this.swap || this.movesCount >= 2)
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

  genRandInitFen() {
    // NOTE: size.x == size.y (square boards)
    const emptyCount = C.FenEmptySquares(this.size.x.repeat);
    return (emptyCount + "/").repeat(this.size.x).slice(0, -1);
  }

  getPieceWidth(rwidth) {
    return (rwidth / this.size.y); //TODO
  }

  // TODO
  getSvgChessboard() {
    let board = `
      <svg
        width="2771.2px" height="1700px"
        class="chessboard_SVG">
      <defs>
        <g id="hexa">
          <polygon
            style="fill:none;stroke:#000000;stroke-width:1px"
            points="0,-100.0 86.6,-50.0 86.6,50.0 0,100.0 -86.6,50.0 -86.6,-50.0"
          />
        </g>
      </defs>`;
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        let classes = this.getSquareColorClass(i, j);
        board += `<rect
          class="neutral-square"
          id="${this.coordsToId([i, j])}"
          width="10"
          height="10"
          x="${10*j}" ///////////// + resize ! ratio
          y="${10*i}" />`;
      }
    }
    board += "</g></svg>";
    return board;
  }

  setupPieces() {
    // TODO: just scan board and get IDs, and addClass "bg-white" or "bg-black"
  }

  // TODO (NOTE: no flip here, always same view)
  getPixelPosition(i, j, r) {
    if (i < 0 || j < 0)
      return [0, 0]; //piece vanishes
    let x, y;
    const sqSize = r.width / this.size.y;
    const flipped = (this.playerColor == 'b');
    const x = (flipped ? this.size.y - 1 - j : j) * sqSize,
          y = (flipped ? this.size.x - 1 - i : i) * sqSize;
    return [r.x + x, r.y + y];
  }

  initMouseEvents() {
    const mousedown = (e) => {
      if (e.touches && e.touches.length > 1)
        e.preventDefault();
      const cd = this.idToCoords(e.target.id);
      if (cd) {
        const move = this.doClick(cd);
        if (move)
          this.playPlusVisual(move);
      }
    };

    if ('onmousedown' in window)
      document.addEventListener("mousedown", mousedown);
    if ('ontouchstart' in window)
      document.addEventListener("touchstart", mousedown, {passive: false});
  }

  get size() {
    return {
      x: this.bsize,
      y: this.bsize,
      ratio: 1.630118
    };
  }

  pieces() {
    return {
      'p': {
        "class": "pawn",
      }
    };
  }

  play(move) {
    super.playOnBoard(move);
  }

  // TODO:
  getCurrentScore(move) {
    const oppCol = C.GetOppCol(this.turn);
    // Search for connecting path of opp color: TODO
    // ...
    if (path found)
      return (oppCol == "w" ? "1-0" : "0-1");
    return "*";
  }

  playVisual(move) {
    move.vanish.forEach(v => {
// TODO: just get ID, and remClass "bg-white" or "bg-black" (in CSS: TODO)
    });
    move.appear.forEach(a => {
// TODO: just get ID, and addClass "bg-white" or "bg-black" (in CSS: TODO)
//      this.g_pieces[a.x][a.y] = document.createElement("piece");
//      this.g_pieces[a.x][a.y].classList.add(this.pieces()[a.p]["class"]);
//      this.g_pieces[a.x][a.y].classList.add(a.c == "w" ? "white" : "black");
//      this.g_pieces[a.x][a.y].style.width = pieceWidth + "px";
//      this.g_pieces[a.x][a.y].style.height = pieceWidth + "px";
    });
  }

};
