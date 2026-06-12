import ChessRules from "/js/base_rules.js";

export default class EmpireRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["atomic", "balance", "capture", "cylinder",
               "doublemove", "progressive", "zen"]
    };
  }

  genRandInitBaseFen() {
    // Mapping kingdom --> empire:
    const piecesMap = {
      'R': 'T',
      'N': 'E',
      'B': 'C',
      'Q': 'D',
      'K': 'K'
    };

    const bf = super.genRandInitBaseFen();
    return {
      fen: bf.fen.substr(0, 24) + "PPPSSPPP/8/" +
           bf.fen.substr(35, 8).split('').map(p => piecesMap[p]).join('') +
           bf.fen.substr(43),
      o: bf.o
    };
  }

  pawnPromotions() {
    return ['q'];
  }

  pieceDef(piece, color, x, y) {
    switch (piece) {
    case 's': {
      const forward = (color == 'w' ? -1 : 1);
      return {
        "class": "soldier",
        both: [{
          steps: [[0, 1], [0, -1], [forward, 0]],
          range: 1
        }]
      };
    }
    case 't': return {
      "class": "tower",
      both: [{
        steps: [[-1, 0], [1, 0], [0, -1], [0, 1]]
      }],
      moves: [{
        steps: [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      }],
    };
    case 'c': return {
      "class": "cardinal",
      both: [{
        steps: [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      }],
      moves: [{
        steps: [[-1, 0], [1, 0], [0, -1], [0, 1]]
      }],
    };
    case 'e': return {
      "class": "eagle",
      moves: super.pieceDef('q').both,
      attack: super.pieceDef('n').both
    };
    case 'd': return {
      "class": "duke",
      moves: super.pieceDef('q').both,
      attack: super.pieceDef('k').both
    };
    }
    return super.pieceDef(piece, color, x, y);
  }

  filterValid(moves) {
    const kp = {
      'w': super.searchKingPos('w')[0],
      'b': super.searchKingPos('b')[0]
    };
    // Potentially facing each other ?
    const pf = (kp['w'][0] == kp['b'][0] || kp['w'][1] == kp['b'][1]);
    return super.filterValid(moves).filter(m => {
      // Filter out moves letting kings facing each other
      if (
        !pf &&
        [m.start, m.end].every(xy => {
          return ['w','b'].every(c => xy.x != kp[c][0] || xy.y != kp[c][1]);
        })
      ) {
        // King don't face each other and don't move
        return true;
      }
      if (pf) {
        // Check that current move doesn't clear the path between kings
        // TODO: apply vanish / appear on the path (horizontal or vertical)
        return true;
      }
      // Situation: a king moves. Does it lead to a forbidden configuration ?
      // TODO: check alignment, then check path (same as above).
      return true;
    });
  }

  getCurrentScore(move_s) {
    // Turn has changed:
    const color = C.GetOppTurn(this.turn);
    const lastRank = (color == 'w' ? 0 : 7);
    const kp = super.searchKingPos(color)[0];
    if (kp[0] == lastRank)
      // The opposing edge is reached!
      return (color == "w" ? "1-0" : "0-1");
    return super.getCurrentScore(move_s);
  }

};
