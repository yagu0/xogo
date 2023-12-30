import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";
import {Random} from "/utils/alea.js";

export default class DiamondRules extends ChessRules {

  get hasFlags() {
    return false;
  }

  get hasEnpassant() {
    return false;
  }

  getSvgChessboard() {
    const diagonal = 10 * this.size.y * Math.sqrt(2);
    const halfDiag = 0.5 * diagonal;
    const deltaTrans = 10 * this.size.y * (Math.sqrt(2) - 1) / 2;
    let board = `
      <svg
        viewBox="0 0 ${diagonal} ${diagonal}"
        class="chessboard_SVG">`;
    board += `<g transform="rotate(45 ${halfDiag} ${halfDiag})
                 translate(${deltaTrans} ${deltaTrans})">`;
    board += this.getBaseSvgChessboard();
    board += "</g></svg>";
    return board;
  }

  getPieceWidth(rwidth) {
    return (0.95 * rwidth / (Math.sqrt(2) * this.size.y));
  }

  getPixelPosition(i, j, r) {
    if (i < 0 || j < 0 || typeof i == "string")
      return super.getPixelPosition(i, j, r);
    const sqSize = this.getPieceWidth(r.width) / 0.95;
    const flipped = this.flippedBoard;
    i = (flipped ? this.size.x - 1 - i : i);
    j = (flipped ? this.size.y - 1 - j : j);
    const sq2 = Math.sqrt(2);
    const shift = [- sqSize / 2, sqSize * (sq2 - 1) / 2];
    const x = (j - i) * sqSize / sq2 + shift[0] + r.width / 2;
    const y = (i + j) * sqSize / sq2 + shift[1];
    return [r.x + x, r.y + y];
  }

  genRandInitBaseFen() {
    if (this.options["randomness"] == 0) {
      return {
        fen: "krbp4/rqnp4/nbpp4/pppp4/4PPPP/4PPBN/4PNQR/4PBRK",
        o: {}
      };
    }
    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }
      // Get random squares for every piece, totally freely
      let positions = Random.shuffle(ArrayFun.range(8));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      const rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=2; i<8; i++) {
          if (positions[i] % 2 != rem2) {
            [positions[1], positions[i]] = [positions[i], positions[1]];
            break;
          }
        }
      }
      for (let i = 0; i < 8; i++)
        pieces[c][positions[i]] = composition[i];
    }
    const fen = (
      pieces["b"].slice(0, 3).join("") + "p4/" +
      pieces["b"].slice(3, 6).join("") + "p4/" +
      pieces["b"].slice(6, 8).join("") + "pp4/" +
      "pppp4/4PPPP/" +
      "4PP" + pieces["w"].slice(6, 8).reverse().join("").toUpperCase() + "/" +
      "4P" + pieces["w"].slice(3, 6).reverse().join("").toUpperCase() + "/" +
      "4P" + pieces["w"].slice(0, 3).reverse().join("").toUpperCase());
    return { fen: fen, o: {} };
  }

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    const pawnShift = this.getPawnShift(color || 'w');
    res['p'].moves = [{steps: [[pawnShift, pawnShift]], range: 1}];
    res['p'].attack = [{steps: [[0, pawnShift], [pawnShift, 0]], range: 1}];
    return res;
  }

};
