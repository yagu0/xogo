import {Random} from "/utils/alea.js";

export const FenUtil = {

  // arg o (constraints): "between" with p1 and p2.
  //                      "flags", "diffCol": array of pieceType
  //                      "range": restrict piece position to some interval
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
    if (o.randomness >= 1) {
      // NOTE: pieces involved in constraints are different...
      if (o.range) {
        Object.keys(o.range).forEach(function(p) {
          // NOTE: assume only one piece of its kind
          const pos = res.indexOf(p);
          if (!o.range[p].includes(pos)) {
            let new_pos;
            do {
              new_pos = o.range[p] [ Random.randInt(p.range.length) ]
            }
            // See https://stackoverflow.com/a/1098955
            while (res[new_pos] in o.range);
            [ res[new_pos], res[pos] ] = [ res[pos], res[new_pos] ];
          }
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
        o.between.forEach(b => {
          // p2 could be an array (EightPieces --> j, r)
          if (!Array.isArray(b["p2"]))
            b["p2"] = [ b["p2"], b["p2"] ];
          // Locate p1. If appearing first, exchange with first p2.
          // If appearing last, exchange with last p2.
          const p1 = res.indexOf(b["p1"]);
          const firstP2 = res.indexOf(b["p2"][0]),
                lastP2 = res.lastIndexOf(b["p2"][1]);
          if (p1 < firstP2) {
            res[p1] = b["p2"][0];
            res[firstP2] = b["p1"];
          }
          else if (p1 > lastP2) {
            res[p1] = b["p2"][1];
            res[lastP2] = b["p1"];
          }
        });
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
