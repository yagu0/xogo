import ChessRules from "/js/base_rules.js";

export default class AbstractOnGridRules extends ChessRules {

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
      const y = i * 10 + 5,
            maxX = this.size.y * 10 - 5;
      board += `
        <line x1="5" y1="${y}" x2="${maxX}" y2="${y}"
              stroke="black" stroke-width="0.2"/>`;
    }
    for (let i = 0; i < this.size.y; i++) {
      const x = i * 10 + 5,
            maxY = this.size.x * 10 - 5;
      board += `
        <line x1="${x}" y1="5" x2="${x}" y2="${maxY}"
              stroke="black" stroke-width="0.2"/>`;
    }
    board += "</svg>";
    return board;
  }

};
