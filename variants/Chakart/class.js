import ChessRules from "/base_rules";
import GiveawayRules from "/variants/Giveaway";
import { ArrayFun } from "/utils/array.js";
import { Random } from "/utils/alea.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export class ChakartRules extends ChessRules {

  static get Options() {
    return {
      select: [
        {
          label: "Randomness",
          variable: "randomness",
          defaut: 2,
          options: [
            { label: "Deterministic", value: 0 },
            { label: "Symmetric random", value: 1 },
            { label: "Asymmetric random", value: 2 }
          ]
        }
      ]
    };
  }

  get pawnPromotions() {
    return ['q', 'r', 'n', 'b', 'k'];
  }

  get hasCastle() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  static get IMMOBILIZE_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'q': 't',
      'k': 'l'
    };
  }

  static get IMMOBILIZE_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      't': 'q',
      'l': 'k'
    };
  }

  static get INVISIBLE_QUEEN() {
    return 'i';
  }

  // Fictive color 'a', bomb banana mushroom egg
  static get BOMB() {
    return 'w'; //"Wario"
  }
  static get BANANA() {
    return 'd'; //"Donkey"
  }
  static get EGG() {
    return 'e';
  }
  static get MUSHROOM() {
    return 'm';
  }

  genRandInitFen(seed) {
    const gr = new GiveawayRules({mode: "suicide"}, true);
    return (
      gr.genRandInitFen(seed).slice(0, -1) +
      // Add Peach + Mario flags + capture counts
      '{"flags": "1111", "ccount": "000000000000"}'
    );
  }

  fen2board(f) {
    return (
      f.charCodeAt() <= 90
        ? "w" + f.toLowerCase()
        : (['w', 'd', 'e', 'm'].includes(f) ? "a" : "b") + f
    );
  }

  setFlags(fenflags) {
    // King can send shell? Queen can be invisible?
    this.powerFlags = {
      w: {k: false, q: false},
      b: {k: false, q: false}
    };
    for (let c of ['w', 'b']) {
      for (let p of ['k', 'q']) {
        this.powerFlags[c][p] =
          fenflags.charAt((c == "w" ? 0 : 2) + (p == 'k' ? 0 : 1)) == "1";
      }
    }
  }

  aggregateFlags() {
    return this.powerFlags;
  }

  disaggregateFlags(flags) {
    this.powerFlags = flags;
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getFlagsFen() {
    return ['w', 'b'].map(c => {
      return ['k', 'q'].map(p => this.powerFlags[c][p] ? "1" : "0").join("");
    }).join("");
  }

  getCapturedFen() {
    const res = ['w', 'b'].map(c => {
      Object.values(this.captured[c])
    });
    return res[0].concat(res[1]).join("");
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Initialize captured pieces' counts from FEN
    const allCapts = fenParsed.captured.split("").map(x => parseInt(x, 10));
    const pieces = ['p', 'r', 'n', 'b', 'q', 'k'];
    this.captured = {
      w: Array.toObject(pieces, allCapts.slice(0, 6)),
      b: Array.toObject(pieces, allCapts.slice(6, 12))
    };
    this.reserve = { w: {}, b: {} }; //to be replaced by this.captured
    this.moveStack = [];
  }

  // For Toadette bonus
  getDropMovesFrom([c, p]) {
    if (typeof c != "string" || this.reserve[c][p] == 0)
      return [];
    let moves = [];
    const start = (c == 'w' && p == 'p' ? 1 : 0);
    const end = (color == 'b' && p == 'p' ? 7 : 8);
    for (let i = start; i < end; i++) {
      for (let j = 0; j < this.size.y; j++) {
        const pieceIJ = this.getPiece(i, j);
        if (
          this.board[i][j] == "" ||
          this.getColor(i, j) == 'a' ||
          pieceIJ == V.INVISIBLE_QUEEN
        ) {
          let m = new Move({
            start: {x: c, y: p},
            end: {x: i, y: j},
            appear: [new PiPo({x: i, y: j, c: c, p: p})],
            vanish: []
          });
          // A drop move may remove a bonus (or hidden queen!)
          if (this.board[i][j] != "")
            m.vanish.push(new PiPo({x: i, y: j, c: 'a', p: pieceIJ}));
          moves.push(m);
        }
      }
    }
    return moves;
  }

// TODO: rethink from here:

// allow pawns 
  // queen invisible move, king shell: special functions

// prevent pawns from capturing invisible queen (post)
// post-process: 

//events : playPlusVisual after mouse up, playReceived (include animation) on opp move
// ==> if move.cont (banana...) self re-call playPlusVisual (rec ?)

  // Moving something. Potential effects resolved after playing
  getPotentialMovesFrom([x, y], bonus) {
    let moves = [];
    if (bonus == "toadette")
      return this.getDropMovesFrom([x, y]);
    else if (bonus == "kingboo") {
      // Only allow to swap pieces
      // TODO (end of move, as for toadette)
      return moves;
    }
    // Normal case (including bonus daisy)
    switch (this.getPiece(x, y)) {
      case 'p':
        moves = this.getPawnMovesFrom([x, y]); //apply promotions
        break;
      case 'q':
        moves = this.getQueenMovesFrom([x, y]);
        break;
      case 'k',
          moves = this.getKingMoves([x, y]);
          break;
      default:
        moves = super.getPotentialMovesFrom([x, y]);
    }
    return moves;
  }

  // idée : on joue le coup, puis son effet est déterminé, puis la suite (si suite)
  // est jouée automatiquement ou demande action utilisateur, etc jusqu'à coup terminal.

  tryMoveFollowup(move) {
    if (this.getColor(move.end.x, move.end.y) == 'a') {
      // effect, or bonus/malus
      const endType = this.getPiece(m.end.x, m.end.y);
      if (endType == V.EGG)
        this.applyRandomBonus(m);
      else {
        this.moveStack.push(m);
        switch (endType) {
          case V.BANANA:
            this.randomRedirect(
        case V.BOMB:
        case V.MUSHROOM:
          // aller dans direction, saut par dessus pièce adverse
              // ou amie (tjours), new step si roi caval pion
      }
    }
  }


      const finalPieces = V.PawnSpecs.promotions;
      const color = this.turn;
      const lastRank = (color == "w" ? 0 : 7);
      let pMoves = [];
      moves.forEach(m => {
        if (
          m.appear.length > 0 &&
          ['p', 's'].includes(m.appear[0].p) &&
          m.appear[0].x == lastRank
        ) {
          for (let i = 1; i < finalPieces.length; i++) {
            const piece = finalPieces[i];
            let otherM = JSON.parse(JSON.stringify(m));
            otherM.appear[0].p =
              m.appear[0].p == V.PAWN
                ? finalPieces[i]
                : V.IMMOBILIZE_CODE[finalPieces[i]];
            pMoves.push(otherM);
          }
          // Finally alter m itself:
          m.appear[0].p =
            m.appear[0].p == V.PAWN
              ? finalPieces[0]
              : V.IMMOBILIZE_CODE[finalPieces[0]];
        }
      });
      Array.prototype.push.apply(moves, pMoves);
    }
    else {
      // Subturn == 2
      const L = this.effects.length;
      switch (this.effects[L-1]) {
        case "kingboo":
          // Exchange position with any visible piece,
          // except pawns if arriving on last rank.
          const lastRank = { 'w': 0, 'b': 7 };
          const color = this.turn;
          const allowLastRank = (this.getPiece(x, y) != V.PAWN);
          for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
              const colIJ = this.getColor(i, j);
              const pieceIJ = this.getPiece(i, j);
              if (
                (i != x || j != y) &&
                this.board[i][j] != V.EMPTY &&
                pieceIJ != V.INVISIBLE_QUEEN &&
                colIJ != 'a'
              ) {
                if (
                  (pieceIJ != V.PAWN || x != lastRank[colIJ]) &&
                  (allowLastRank || i != lastRank[color])
                ) {
                  const movedUnit = new PiPo({
                    x: x,
                    y: y,
                    c: colIJ,
                    p: this.getPiece(i, j)
                  });
                  let mMove = this.getBasicMove({ x: x, y: y }, [i, j]);
                  mMove.appear.push(movedUnit);
                  moves.push(mMove);
                }
              }
            }
          }
          break;
        case "toadette":
          // Resurrect a captured piece
          if (x >= V.size.x) moves = this.getReserveMoves([x, y]);
          break;
        case "daisy":
          // Play again with any piece
          moves = super.getPotentialMovesFrom([x, y]);
          break;
      }
    }
    return moves;
  }

  // Helper for getBasicMove(): banana/bomb effect
  getRandomSquare([x, y], steps) {
    const validSteps = steps.filter(s => this.onBoard(x + s[0], y + s[1]));
    const step = validSteps[Random.randInt(validSteps.length)];
    return [x + step[0], y + step[1]];
  }

  // Apply mushroom, bomb or banana effect (hidden to the player).
  // Determine egg effect, too, and apply its first part if possible.
  getBasicMove_aux(psq1, sq2, tr, initMove) {
    const [x1, y1] = [psq1.x, psq1.y];
    const color1 = this.turn;
    const piece1 = (!!tr ? tr.p : (psq1.p || this.getPiece(x1, y1)));
    const oppCol = V.GetOppCol(color1);
    if (!sq2) {
      let move = {
        appear: [],
        vanish: []
      };
      // banana or bomb defines next square, or the move ends there
      move.appear = [
        new PiPo({
          x: x1,
          y: y1,
          c: color1,
          p: piece1
        })
      ];
      if (this.board[x1][y1] != V.EMPTY) {
        const initP1 = this.getPiece(x1, y1);
        move.vanish = [
          new PiPo({
            x: x1,
            y: y1,
            c: this.getColor(x1, y1),
            p: initP1
          })
        ];
        if ([V.BANANA, V.BOMB].includes(initP1)) {
          const steps = V.steps[initP1 == V.BANANA ? V.ROOK : V.BISHOP];
          move.next = this.getRandomSquare([x1, y1], steps);
        }
      }
      move.end = { x: x1, y: y1 };
      return move;
    }
    const [x2, y2] = [sq2[0], sq2[1]];
    // The move starts normally, on board:
    let move = super.getBasicMove([x1, y1], [x2, y2], tr);
    if (!!tr) move.promoteInto = tr.c + tr.p; //in case of (chomped...)
    const L = this.effects.length;
    if (
      [V.PAWN, V.KNIGHT].includes(piece1) &&
      !!initMove &&
      (this.subTurn == 1 || this.effects[L-1] == "daisy")
    ) {
      switch (piece1) {
        case V.PAWN: {
          const twoSquaresMove = (Math.abs(x2 - x1) == 2);
          const mushroomX = x1 + (twoSquaresMove ? (x2 - x1) / 2 : 0);
          move.appear.push(
            new PiPo({
              x: mushroomX,
              y: y1,
              c: 'a',
              p: V.MUSHROOM
            })
          );
          if (this.getColor(mushroomX, y1) == 'a') {
            move.vanish.push(
              new PiPo({
                x: mushroomX,
                y: y1,
                c: 'a',
                p: this.getPiece(mushroomX, y1)
              })
            );
          }
          break;
        }
        case V.KNIGHT: {
          const deltaX = Math.abs(x2 - x1);
          const deltaY = Math.abs(y2 - y1);
          let eggSquare = [
            x1 + (deltaX == 2 ? (x2 - x1) / 2 : 0),
            y1 + (deltaY == 2 ? (y2 - y1) / 2 : 0)
          ];
          if (
            this.board[eggSquare[0]][eggSquare[1]] != V.EMPTY &&
            this.getColor(eggSquare[0], eggSquare[1]) != 'a'
          ) {
            eggSquare[0] = x1;
            eggSquare[1] = y1;
          }
          move.appear.push(
            new PiPo({
              x: eggSquare[0],
              y: eggSquare[1],
              c: 'a',
              p: V.EGG
            })
          );
          if (this.getColor(eggSquare[0], eggSquare[1]) == 'a') {
            move.vanish.push(
              new PiPo({
                x: eggSquare[0],
                y: eggSquare[1],
                c: 'a',
                p: this.getPiece(eggSquare[0], eggSquare[1])
              })
            );
          }
          break;
        }
      }
    }
    // For (wa)luigi effect:
    const changePieceColor = (color) => {
      let pieces = [];
      const oppLastRank = (color == 'w' ? 7 : 0);
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          const piece = this.getPiece(i, j);
          if (
            (i != move.vanish[0].x || j != move.vanish[0].y) &&
            this.board[i][j] != V.EMPTY &&
            piece != V.INVISIBLE_QUEEN &&
            this.getColor(i, j) == color
          ) {
            if (piece != V.KING && (piece != V.PAWN || i != oppLastRank))
              pieces.push({ x: i, y: j, p: piece });
          }
        }
      }
      // Special case of the current piece (still at its initial position)
      if (color == color1)
        pieces.push({ x: move.appear[0].x, y: move.appear[0].y, p: piece1 });
      const cp = pieces[randInt(pieces.length)];
      if (move.appear[0].x != cp.x || move.appear[0].y != cp.y) {
        move.vanish.push(
          new PiPo({
            x: cp.x,
            y: cp.y,
            c: color,
            p: cp.p
          })
        );
      }
      else move.appear.shift();
      move.appear.push(
        new PiPo({
          x: cp.x,
          y: cp.y,
          c: V.GetOppCol(color),
          p: cp.p
        })
      );
    };
    const applyEggEffect = () => {
      if (this.subTurn == 2)
        // No egg effects at subTurn 2
        return;
      // 1) Determine the effect (some may be impossible)
      let effects = ["kingboo", "koopa", "chomp", "bowser", "daisy"];
      if (Object.values(this.captured[color1]).some(c => c >= 1))
        effects.push("toadette");
      const lastRank = { 'w': 0, 'b': 7 };
      if (
        this.board.some((b,i) =>
          b.some(cell => {
            return (
              cell[0] == oppCol &&
              cell[1] != V.KING &&
              (cell[1] != V.PAWN || i != lastRank[color1])
            );
          })
        )
      ) {
        effects.push("luigi");
      }
      if (
        (
          piece1 != V.KING &&
          (piece1 != V.PAWN || move.appear[0].x != lastRank[oppCol])
        ) ||
        this.board.some((b,i) =>
          b.some(cell => {
            return (
              cell[0] == color1 &&
              cell[1] != V.KING &&
              (cell[1] != V.PAWN || i != lastRank[oppCol])
            );
          })
        )
      ) {
        effects.push("waluigi");
      }
      const effect = effects[randInt(effects.length)];
      move.end.effect = effect;
      // 2) Apply it if possible
      if (!(["kingboo", "toadette", "daisy"].includes(effect))) {
        switch (effect) {
          case "koopa":
            move.appear = [];
            // Maybe egg effect was applied after others,
            // so just shift vanish array:
            move.vanish.shift();
            break;
          case "chomp":
            move.appear = [];
            break;
          case "bowser":
            move.appear[0].p = V.IMMOBILIZE_CODE[piece1];
            break;
          case "luigi":
            changePieceColor(oppCol);
            break;
          case "waluigi":
            changePieceColor(color1);
            break;
        }
      }
    };
    const applyMushroomEffect = () => {
      if ([V.PAWN, V.KING, V.KNIGHT].includes(piece1)) {
        // Just make another similar step, if possible (non-capturing)
        const [i, j] = [
          move.appear[0].x + (x2 - x1),
          move.appear[0].y + (y2 - y1)
        ];
        if (
          V.OnBoard(i, j) &&
          (
            this.board[i][j] == V.EMPTY ||
            this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
            this.getColor(i, j) == 'a'
          )
        ) {
          move.appear[0].x = i;
          move.appear[0].y = j;
          if (this.board[i][j] != V.EMPTY) {
            const object = this.getPiece(i, j);
            const color = this.getColor(i, j);
            move.vanish.push(
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: object
              })
            );
            switch (object) {
              case V.BANANA:
              case V.BOMB:
                const steps = V.steps[object == V.BANANA ? V.ROOK : V.BISHOP];
                move.next = this.getRandomSquare([i, j], steps);
                break;
              case V.EGG:
                applyEggEffect();
                break;
              case V.MUSHROOM:
                applyMushroomEffect();
                break;
            }
          }
        }
      }
      else {
        // Queen, bishop or rook:
        const step = [
          (x2 - x1) / Math.abs(x2 - x1) || 0,
          (y2 - y1) / Math.abs(y2 - y1) || 0
        ];
        const next = [move.appear[0].x + step[0], move.appear[0].y + step[1]];
        if (
          V.OnBoard(next[0], next[1]) &&
          this.board[next[0]][next[1]] != V.EMPTY &&
          this.getPiece(next[0], next[1]) != V.INVISIBLE_QUEEN &&
          this.getColor(next[0], next[1]) != 'a'
        ) {
          const afterNext = [next[0] + step[0], next[1] + step[1]];
          if (V.OnBoard(afterNext[0], afterNext[1])) {
            const afterColor = this.getColor(afterNext[0], afterNext[1]);
            if (
              this.board[afterNext[0]][afterNext[1]] == V.EMPTY ||
              afterColor == 'a'
            ) {
              move.appear[0].x = afterNext[0];
              move.appear[0].y = afterNext[1];
              if (this.board[afterNext[0]][afterNext[1]] != V.EMPTY) {
                // object = banana, bomb, mushroom or egg
                const object = this.getPiece(afterNext[0], afterNext[1]);
                move.vanish.push(
                  new PiPo({
                    x: afterNext[0],
                    y: afterNext[1],
                    c: afterColor,
                    p: object
                  })
                );
                switch (object) {
                  case V.BANANA:
                  case V.BOMB:
                    const steps =
                      V.steps[object == V.BANANA ? V.ROOK : V.BISHOP];
                    move.next = this.getRandomSquare(
                      [afterNext[0], afterNext[1]], steps);
                    break;
                  case V.EGG:
                    applyEggEffect();
                    break;
                  case V.MUSHROOM:
                    applyMushroomEffect();
                    break;
                }
              }
            }
          }
        }
      }
    };
    const color2 = this.getColor(x2, y2);
    const piece2 = this.getPiece(x2, y2);
    if (color2 == 'a') {
      switch (piece2) {
        case V.BANANA:
        case V.BOMB:
          const steps = V.steps[piece2 == V.BANANA ? V.ROOK : V.BISHOP];
          move.next = this.getRandomSquare([x2, y2], steps);
          break;
        case V.MUSHROOM:
          applyMushroomEffect();
          break;
        case V.EGG:
          if (this.subTurn == 1)
            // No egg effect at subTurn 2
            applyEggEffect();
          break;
      }
    }
    if (
      this.subTurn == 1 &&
      !move.next &&
      move.appear.length > 0 &&
      [V.ROOK, V.BISHOP].includes(piece1)
    ) {
      const finalSquare = [move.appear[0].x, move.appear[0].y];
      if (
        color2 != 'a' ||
        this.getColor(finalSquare[0], finalSquare[1]) != 'a' ||
        this.getPiece(finalSquare[0], finalSquare[1]) != V.EGG
      ) {
        const validSteps =
          V.steps[piece1 == V.ROOK ? V.BISHOP : V.ROOK].filter(s => {
            const [i, j] = [finalSquare[0] + s[0], finalSquare[1] + s[1]];
            return (
              V.OnBoard(i, j) &&
              // NOTE: do not place a bomb or banana on the invisible queen!
              (this.board[i][j] == V.EMPTY || this.getColor(i, j) == 'a')
            );
          });
        if (validSteps.length >= 1) {
          const randIdx = randInt(validSteps.length);
          const [x, y] = [
            finalSquare[0] + validSteps[randIdx][0],
            finalSquare[1] + validSteps[randIdx][1]
          ];
          move.appear.push(
            new PiPo({
              x: x,
              y: y,
              c: 'a',
              p: (piece1 == V.ROOK ? V.BANANA : V.BOMB)
            })
          );
          if (this.board[x][y] != V.EMPTY) {
            move.vanish.push(
              new PiPo({ x: x, y: y, c: 'a', p: this.getPiece(x, y) }));
          }
        }
      }
    }
    return move;
  }

  getBasicMove(psq1, sq2, tr) {
    let moves = [];
    if (Array.isArray(psq1)) psq1 = { x: psq1[0], y: psq1[1] };
    let m = this.getBasicMove_aux(psq1, sq2, tr, "initMove");
    while (!!m.next) {
      // Last move ended on bomb or banana, direction change
      V.PlayOnBoard(this.board, m);
      moves.push(m);
      m = this.getBasicMove_aux(
        { x: m.appear[0].x, y: m.appear[0].y }, m.next);
    }
    for (let i=moves.length-1; i>=0; i--) V.UndoOnBoard(this.board, moves[i]);
    moves.push(m);
    // Now merge moves into one
    let move = {};
    // start is wrong for Toadette moves --> it's fixed later
    move.start = { x: psq1.x, y: psq1.y };
    move.end = !!sq2 ? { x: sq2[0], y: sq2[1] } : { x: psq1.x, y: psq1.y };
    if (!!tr) move.promoteInto = moves[0].promoteInto;
    let lm = moves[moves.length-1];
    if (this.subTurn == 1 && !!lm.end.effect)
      move.end.effect = lm.end.effect;
    if (moves.length == 1) {
      move.appear = moves[0].appear;
      move.vanish = moves[0].vanish;
    }
    else {
      // Keep first vanish and last appear (if any)
      move.appear = lm.appear;
      move.vanish = moves[0].vanish;
      if (
        move.vanish.length >= 1 &&
        move.appear.length >= 1 &&
        move.vanish[0].x == move.appear[0].x &&
        move.vanish[0].y == move.appear[0].y
      ) {
        // Loopback on initial square:
        move.vanish.shift();
        move.appear.shift();
      }
      for (let i=1; i < moves.length - 1; i++) {
        for (let v of moves[i].vanish) {
          // Only vanishing objects, not appearing at init move
          if (
            v.c == 'a' &&
            (
              moves[0].appear.length == 1 ||
              moves[0].appear[1].x != v.x ||
              moves[0].appear[1].y != v.y
            )
          ) {
            move.vanish.push(v);
          }
        }
      }
      // Final vanish is our piece, but others might be relevant
      // (for some egg bonuses at least).
      for (let i=1; i < lm.vanish.length; i++) {
        if (
          lm.vanish[i].c != 'a' ||
          moves[0].appear.length == 1 ||
          moves[0].appear[1].x != lm.vanish[i].x ||
          moves[0].appear[1].y != lm.vanish[i].y
        ) {
          move.vanish.push(lm.vanish[i]);
        }
      }
    }
    return move;
  }





  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    const shiftX = (color == 'w' ? -1 : 1);
    const firstRank = (color == "w" ? this.size.x - 1 : 0);
    let moves = [];
    if (
      this.board[x + shiftX][y] == "" ||
      this.getColor(x + shiftX, y) == 'a' ||
      this.getPiece(x + shiftX, y) == V.INVISIBLE_QUEEN
    ) {

      // TODO:
      this.addPawnMoves([x, y], [x + shiftX, y], moves);
      if (
        [firstRank, firstRank + shiftX].includes(x) &&
        (
          this.board[x + 2 * shiftX][y] == V.EMPTY ||
          this.getColor(x + 2 * shiftX, y) == 'a' ||
          this.getPiece(x + 2 * shiftX, y) == V.INVISIBLE_QUEEN
        )
      ) {
        moves.push(this.getBasicMove({ x: x, y: y }, [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        // Pawns cannot capture invisible queen this way!
        this.getPiece(x + shiftX, y + shiftY) != V.INVISIBLE_QUEEN &&
        ['a', oppCol].includes(this.getColor(x + shiftX, y + shiftY))
      ) {
        this.addPawnMoves([x, y], [x + shiftX, y + shiftY], moves);
      }
    }
    return moves;
  }

  getPotentialQueenMoves(sq) {
    const normalMoves = super.getPotentialQueenMoves(sq);
    // If flag allows it, add 'invisible movements'
    let invisibleMoves = [];
    if (this.powerFlags[this.turn][V.QUEEN]) {
      normalMoves.forEach(m => {
        if (
          m.appear.length == 1 &&
          m.vanish.length == 1 &&
          // Only simple non-capturing moves:
          m.vanish[0].c != 'a'
        ) {
          let im = JSON.parse(JSON.stringify(m));
          im.appear[0].p = V.INVISIBLE_QUEEN;
          im.end.noHighlight = true;
          invisibleMoves.push(im);
        }
      });
    }
    return normalMoves.concat(invisibleMoves);
  }

  getPotentialKingMoves([x, y]) {
    let moves = super.getPotentialKingMoves([x, y]);
    const color = this.turn;
    // If flag allows it, add 'remote shell captures'
    if (this.powerFlags[this.turn][V.KING]) {
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(step => {
        let [i, j] = [x + step[0], y + step[1]];
        while (
          V.OnBoard(i, j) &&
          (
            this.board[i][j] == V.EMPTY ||
            this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
            (
              this.getColor(i, j) == 'a' &&
              [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
            )
          )
        ) {
          i += step[0];
          j += step[1];
        }
        if (V.OnBoard(i, j)) {
          const colIJ = this.getColor(i, j);
          if (colIJ != color) {
            // May just destroy a bomb or banana:
            moves.push(
              new Move({
                start: { x: x, y: y},
                end: { x: i, y: j },
                appear: [],
                vanish: [
                  new PiPo({
                    x: i, y: j, c: colIJ, p: this.getPiece(i, j)
                  })
                ]
              })
            );
          }
        }
      });
    }
    return moves;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (
        V.OnBoard(i, j) &&
        (
          this.board[i][j] == V.EMPTY ||
          this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
          (
            this.getColor(i, j) == 'a' &&
            [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
          )
        )
      ) {
        moves.push(this.getBasicMove({ x: x, y: y }, [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove({ x: x, y: y }, [i, j]));
    }
    return moves;
  }

  getAllPotentialMoves() {
    if (this.subTurn == 1) return super.getAllPotentialMoves();
    let moves = [];
    const color = this.turn;
    const L = this.effects.length;
    switch (this.effects[L-1]) {
      case "kingboo": {
        let allPieces = [];
        for (let i=0; i<8; i++) {
          for (let j=0; j<8; j++) {
            const colIJ = this.getColor(i, j);
            const pieceIJ = this.getPiece(i, j);
            if (
              i != x && j != y &&
              this.board[i][j] != V.EMPTY &&
              colIJ != 'a' &&
              pieceIJ != V.INVISIBLE_QUEEN
            ) {
              allPieces.push({ x: i, y: j, c: colIJ, p: pieceIJ });
            }
          }
        }
        for (let x=0; x<8; x++) {
          for (let y=0; y<8; y++) {
            if (this.getColor(i, j) == color) {
              // Add exchange with something
              allPieces.forEach(pp => {
                if (pp.x != i || pp.y != j) {
                  const movedUnit = new PiPo({
                    x: x,
                    y: y,
                    c: pp.c,
                    p: pp.p
                  });
                  let mMove = this.getBasicMove({ x: x, y: y }, [pp.x, pp.y]);
                  mMove.appear.push(movedUnit);
                  moves.push(mMove);
                }
              });
            }
          }
        }
        break;
      }
      case "toadette": {
        const x = V.size.x + (this.turn == 'w' ? 0 : 1);
        for (let y = 0; y < 8; y++)
          Array.prototype.push.apply(moves, this.getReserveMoves([x, y]));
        break;
      }
      case "daisy":
        moves = super.getAllPotentialMoves();
        break;
    }
    return moves;
  }










/// if any of my pieces was immobilized, it's not anymore.
  //if play set a piece immobilized, then mark it
  prePlay(move) {
    if (move.effect == "toadette")
      this.reserve = this.captured;
    else
      this.reserve = { w: {}, b: {} };;
    const color = this.turn;
    if (
      move.vanish.length == 2 &&
      move.vanish[1].c != 'a' &&
      move.appear.length == 1 //avoid king Boo!
    ) {
      // Capture: update this.captured
      let capturedPiece = move.vanish[1].p;
      if (capturedPiece == V.INVISIBLE_QUEEN)
        capturedPiece = V.QUEEN;
      else if (Object.keys(V.IMMOBILIZE_DECODE).includes(capturedPiece))
        capturedPiece = V.IMMOBILIZE_DECODE[capturedPiece];
      this.captured[move.vanish[1].c][capturedPiece]++;
    }
    else if (move.vanish.length == 0) {
      if (move.appear.length == 0 || move.appear[0].c == 'a') return;
      // A piece is back on board
      this.captured[move.appear[0].c][move.appear[0].p]--;
    }
    if (move.appear.length == 0) {
      // Three cases: king "shell capture", Chomp or Koopa
      if (this.getPiece(move.start.x, move.start.y) == V.KING)
        // King remote capture:
        this.powerFlags[color][V.KING] = false;
      else if (move.end.effect == "chomp")
        this.captured[color][move.vanish[0].p]++;
    }
    else if (move.appear[0].p == V.INVISIBLE_QUEEN)
      this.powerFlags[move.appear[0].c][V.QUEEN] = false;
    if (this.subTurn == 2) return;
    if (
      move.turn[1] == 1 &&
      move.appear.length == 0 ||
      !(Object.keys(V.IMMOBILIZE_DECODE).includes(move.appear[0].p))
    ) {
      // Look for an immobilized piece of my color: it can now move
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] != V.EMPTY) {
            const piece = this.getPiece(i, j);
            if (
              this.getColor(i, j) == color &&
              Object.keys(V.IMMOBILIZE_DECODE).includes(piece)
            ) {
              this.board[i][j] = color + V.IMMOBILIZE_DECODE[piece];
              move.wasImmobilized = [i, j];
            }
          }
        }
      }
    }
    // Also make opponent invisible queen visible again, if any
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.INVISIBLE_QUEEN
        ) {
          this.board[i][j] = oppCol + V.QUEEN;
          move.wasInvisible = [i, j];
        }
      }
    }
  }

  play(move) {
    this.prePlay(move);
    this.playOnBoard(move);
    if (["kingboo", "toadette", "daisy"].includes(move.effect)) {
      this.effect = move.effect;
      this.subTurn = 2;
    }
    else {
      this.turn = C.GetOppCol(this.turn);
      this.movesCount++;
      this.subTurn = 1;
    }
  }

  filterValid(moves) {
    return moves;
  }

  playPlusVisual(move, r) {
    this.play(move);
    this.playVisual(move, r);
    

  // TODO: display bonus messages
// TODO: si continuation, continuer, et sinon :
    this.afterPlay(this.moveStack); //user method
  }

};
