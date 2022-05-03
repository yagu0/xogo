  getSvgChessboard() {
    const flipped = (this.playerColor == 'b');
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
          class="${classes}"
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

// neutral-light neutral-dark --> specify per variant in CSS file
  getSquareColorClass(i, j) {
    return ((i+j) % 2 == 0 ? "light-square": "dark-square");
  }

// TODO: generalize base_rules.js to not assume size.x == width and size.y == height (not true here).
