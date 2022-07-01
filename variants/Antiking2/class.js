import ChessRules from "/base_rules.js";
import AbstractAntikingRules from "/variants/_Antiking/class.js";
import {Random} from "/utils/alea.js";

export default class Antiking2Rules extends AbstractAntikingRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: A.Options.styles.concat("cylinder")
    };
  }

  genRandInitBaseFen() {
    const baseFen = super.genRandInitBaseFen();
    // Just add an antiking on 3rd ranks
    let akPos = [3, 3];
    if (this.options.randomness >= 1) {
      akPos[0] = Random.randInt(this.size.y);
      if (this.options.randomness == 2)
        akPos[1] = Random.randInt(this.size.y);
      else
        akPos[1] = akPos[0];
    }
    const antikingLine = (color) => {
      const [idx, symbol] = (color == 'w' ? [0, 'a'] : [1, 'A']);
      return (
        (akPos[idx] > 0 ? akPos[idx] : "") + symbol +
        (akPos[idx] < this.size.y - 1
          ? C.FenEmptySquares(this.size.y - 1 - akPos[idx])
          : "")
      );
    };
    return {
      fen: baseFen.fen.replace("p/8", "p/" + antikingLine('b'))
                      .replace("8/P", antikingLine('w') + "/P"),
      o: baseFen.o
    };
  }

  getCastleMoves([x, y]) {
    if (this.getPiece(x, y) == 'a')
      return [];
    return super.getCastleMoves([x, y]);
  }

  updateCastleFlags(move) {
    if (move.vanish.length > 0 && move.vanish[0].p == 'a')
      return;
    super.updateCastleFlags(move);
  }

};
