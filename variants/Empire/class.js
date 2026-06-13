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
    // Sub-function to check a path (between kings)
    const scanPath = (start, end, justOne) => {
      let s = [end[0] - start[0], end[1] - start[1]];
      for (const i in [0, 1]) {
        if (s[i] != 0)
          s[i] = s[i] / Math.abs(s[i]);
      }
      let onPath = {};
      let [i, j] = [start[0] + s[0], start[1] + s[1]];
      while (i != end[0] || j != end[1]) {
        if (this.board[i][j] != "") {
          onPath[i + "." + j] = true;
          if (justOne)
            return true;
        }
        [i, j] = [i + s[0], j + s[1]];
      }
      return (justOne ? false : onPath);
    };
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
        ['w','b'].every(c => m.start.x != kp[c][0] || m.start.y != kp[c][1])
      ) {
        // Kings don't face each other and don't move
        return true;
      }
      if (pf) {
        // Check that current move doesn't clear the path between kings
        const onPath = scanPath(kp['b'], kp['w']);
        m.vanish.forEach(v => {
          const key = v.x + "." + v.y;
          if (onPath[key])
            onPath[key] = false;
        });
        if (Object.values(onPath).some(z => z))
          return true;
        for (const a of m.appear) {
          const key = a.x + "." + a.y;
          if (Object.keys(onPath).includes(key))
            return true;
        }
        return false;
      }
      // A king moves. Does it lead to a forbidden configuration ?
      const kc =
        ['w','b'].filter(c => m.start.x == kp[c][0] && m.start.y == kp[c][1]);
      const oppCol = C.GetOppTurn(kc);
      if (kp[oppCol][0] != m.end.x && kp[oppCol][1] != m.end.y)
        return true;
      // Potentially yes:
      this.playOnBoard(m);
      const valid = scanPath(kp[oppCol], [m.end.x, m.end.y], true);
      this.undoOnBoard(m);
      return valid;
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
