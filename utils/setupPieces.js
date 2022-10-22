import {Random} from "/utils/alea.js";

export const FenUtil = {

  // arg o (constraints): "between" with p1 and p2.
  //                      "flags", "diffCol": array of pieceType
  setupRow: function(arr, o) {
    let res = JSON.parse(JSON.stringify(arr));
    if (o.randomness >= 1)
      res = Random.shuffle(arr);
    let flags = "";
    if (o.flags) {
      res.forEach((p, i) => {
        if (o.flags.includes(p))
          flags += i;
      });
    }
    if (o.diffCol) {
      o.diffCol.forEach(p => {
        // Pieces of type p on different colors:
        const firstP = res.indexOf(p),
              lastP = res.lastIndexOf(p);
        if ((firstP - lastP) % 2 != 0) {
          const choice1 = Random.randBool() ? firstP : lastP;
          let choice2;
          do {
            choice2 = Random.randInt(arr.length);
          }
          while (
            choice2 == choice1 ||
            o.diffCol.includes(choice2) ||
            (choice2 - choice1) % 2 != 0
          );
          res[choice1] = res[choice2];
          res[choice2] = p;
        }
      });
    }
    if (o.between) {
      // Locate p1. If appearing first, exchange with first p2.
      // If appearing last, exchange with last p2.
      const p1 = res.indexOf(o.between["p1"]);
      const firstP2 = res.indexOf(o.between["p2"]),
            lastP2 = res.lastIndexOf(o.between["p2"]);
      if (p1 < firstP2 || p1 > lastP2) {
        res[p1] = o.between["p2"];
        if (p1 < firstP2)
          res[firstP2] = o.between["p1"];
        else //p1 > lastP2
          res[lastP2] = o.between["p1"];
      }
    }
    return {fen: res, flags: flags};
  },

  setupPieces: function(arr, o) {
    const row1 = FenUtil.setupRow(arr, o);
    const row2 = o.randomness == 2 ? FenUtil.setupRow(arr, o) : row1;
    return {
      w: row1.fen,
      b: row2.fen,
      flags: row1.flags + row2.flags
    };
  }

};
