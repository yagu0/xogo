import {Random} from "/utils/alea.js";

export class Fenutil = {

  // arg o (constraints): "between" with p1 and p2.
  //                      "flags", "diffCol": array of pieceType
  setupRow(arr, o) {
    let res = arr;
    if (o.randomness >= 1)
      res = Random.shuffle(arr);
    let flags = "";
    if (o.flags) {
      res.forEach((p, i) => {
        if (o.flags.includes(p))
          flags += i;
      });
    }
    if (o.between) {
      // Locate p1. If appearing first, exchange with first p2.
      // If appearing last, exchange with last p2.
      res.findIndex(p => p == o.between["p1"])
    }

    return {fen: res, flags: flags};
  }

  setupPieces(arr, o) {
    if (o.randomness == 0)


    return {
      row1: 



  }
};

let fen, flags = "0707";
    if (!this.options.randomness)
      // Deterministic:
      fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

    else {
      // Randomize
      let pieces = {w: new Array(8), b: new Array(8)};
      flags = "";
      // Shuffle pieces on first (and last rank if randomness == 2)
      for (let c of ["w", "b"]) {
        if (c == 'b' && this.options.randomness == 1) {
          pieces['b'] = pieces['w'];
          flags += flags;
          break;
        }
        let positions = ArrayFun.range(8);
        // Get random squares for bishops
        let randIndex = 2 * Random.randInt(4);
        const bishop1Pos = positions[randIndex];
        // The second bishop must be on a square of different color
        let randIndex_tmp = 2 * Random.randInt(4) + 1;
        const bishop2Pos = positions[randIndex_tmp];
        // Remove chosen squares
        positions.splice(Math.max(randIndex, randIndex_tmp), 1);
        positions.splice(Math.min(randIndex, randIndex_tmp), 1);
        // Get random squares for knights
        randIndex = Random.randInt(6);
        const knight1Pos = positions[randIndex];
        positions.splice(randIndex, 1);
        randIndex = Random.randInt(5);
        const knight2Pos = positions[randIndex];
        positions.splice(randIndex, 1);
        // Get random square for queen
        randIndex = Random.randInt(4);
        const queenPos = positions[randIndex];
        positions.splice(randIndex, 1);
        // Rooks and king positions are now fixed,
        // because of the ordering rook-king-rook
        const rook1Pos = positions[0];
        const kingPos = positions[1];
        const rook2Pos = positions[2];
        // Finally put the shuffled pieces in the board array
        pieces[c][rook1Pos] = "r";
        pieces[c][knight1Pos] = "n";
        pieces[c][bishop1Pos] = "b";
        pieces[c][queenPos] = "q";
        pieces[c][kingPos] = "k";
        pieces[c][bishop2Pos] = "b";
        pieces[c][knight2Pos] = "n";
        pieces[c][rook2Pos] = "r";
        flags += rook1Pos.toString() + rook2Pos.toString();
      }
      fen = (
        pieces["b"].join("") +
        "/pppppppp/8/8/8/8/PPPPPPPP/" +
        pieces["w"].join("").toUpperCase()
      );
    }
    return { fen: fen, o: {flags: flags} };
