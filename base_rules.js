import { Random } from "/utils/alea.js";
import { ArrayFun } from "/utils/array.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

// Helper class for move animation
class TargetObj {

  constructor(callOnComplete) {
    this.value = 0;
    this.target = 0;
    this.callOnComplete = callOnComplete;
  }
  increment() {
    if (++this.value == this.target)
      this.callOnComplete();
  }

};

// NOTE: x coords: top to bottom (white perspective); y: left to right
// NOTE: ChessRules is aliased as window.C, and variants as window.V
export default class ChessRules {

  static get Aliases() {
    return {'C': ChessRules};
  }

  /////////////////////////
  // VARIANT SPECIFICATIONS

  // Some variants have specific options, like the number of pawns in Monster,
  // or the board size for Pandemonium.
  // Users can generally select a randomness level from 0 to 2.
  static get Options() {
    return {
      select: [{
        label: "Randomness",
        variable: "randomness",
        defaut: 0,
        options: [
          {label: "Deterministic", value: 0},
          {label: "Symmetric random", value: 1},
          {label: "Asymmetric random", value: 2}
        ]
      }],
      input: [
        {
          label: "Capture king",
          variable: "taking",
          type: "checkbox",
          defaut: false
        },
        {
          label: "Falling pawn",
          variable: "pawnfall",
          type: "checkbox",
          defaut: false
        }
      ],
      // Game modifiers (using "elementary variants"). Default: false
      styles: [
        "atomic",
        "balance", //takes precedence over doublemove & progressive
        "cannibal",
        "capture",
        "crazyhouse",
        "cylinder", //ok with all
        "dark",
        "doublemove",
        "madrasi",
        "progressive", //(natural) priority over doublemove
        "recycle",
        "rifle",
        "teleport",
        "zen"
      ]
    };
  }

  get pawnPromotions() {
    return ['q', 'r', 'n', 'b'];
  }

  // Some variants don't have flags:
  get hasFlags() {
    return true;
  }
  // Or castle
  get hasCastle() {
    return this.hasFlags;
  }

  // En-passant captures allowed?
  get hasEnpassant() {
    return true;
  }

  get hasReserve() {
    return (
      !!this.options["crazyhouse"] ||
      (!!this.options["recycle"] && !this.options["teleport"])
    );
  }
  // Some variants do not store reserve state (Align4, Chakart...)
  get hasReserveFen() {
    return this.hasReserve;
  }

  get noAnimate() {
    return !!this.options["dark"];
  }

  // Some variants use only click information
  get clickOnly() {
    return false;
  }

  // Some variants use click infos:
  doClick(coords) {
    if (typeof coords.x != "number")
      return null; //click on reserves
    if (
      this.options["teleport"] && this.subTurnTeleport == 2 &&
      this.board[coords.x][coords.y] == ""
    ) {
      let res = new Move({
        start: {x: this.captured.x, y: this.captured.y},
        appear: [
          new PiPo({
            x: coords.x,
            y: coords.y,
            c: this.captured.c,
            p: this.captured.p
          })
        ],
        vanish: []
      });
      res.drag = {c: this.captured.c, p: this.captured.p};
      return res;
    }
    return null;
  }

  ////////////////////
  // COORDINATES UTILS

  // 3a --> {x:3, y:10}
  static SquareToCoords(sq) {
    return ArrayFun.toObject(["x", "y"],
                             [0, 1].map(i => parseInt(sq[i], 36)));
  }

  // {x:11, y:12} --> bc
  static CoordsToSquare(cd) {
    return Object.values(cd).map(c => c.toString(36)).join("");
  }

  coordsToId(cd) {
    if (typeof cd.x == "number") {
      return (
        `${this.containerId}|sq-${cd.x.toString(36)}-${cd.y.toString(36)}`
      );
    }
    // Reserve :
    return `${this.containerId}|rsq-${cd.x}-${cd.y}`;
  }

  idToCoords(targetId) {
    if (!targetId)
      return null; //outside page, maybe...
    const idParts = targetId.split('|'); //prefix|sq-2-3 (start at 0 => 3,4)
    if (
      idParts.length < 2 ||
      idParts[0] != this.containerId ||
      !idParts[1].match(/sq-[0-9a-zA-Z]-[0-9a-zA-Z]/)
    ) {
      return null;
    }
    const squares = idParts[1].split('-');
    if (squares[0] == "sq")
      return {x: parseInt(squares[1], 36), y: parseInt(squares[2], 36)};
    // squares[0] == "rsq" : reserve, 'c' + 'p' (letters color & piece)
    return {x: squares[1], y: squares[2]};
  }

  /////////////
  // FEN UTILS

  // Turn "wb" into "B" (for FEN)
  board2fen(b) {
    return (b[0] == "w" ? b[1].toUpperCase() : b[1]);
  }

  // Turn "p" into "bp" (for board)
  fen2board(f) {
    return (f.charCodeAt(0) <= 90 ? "w" + f.toLowerCase() : "b" + f);
  }

  // Setup the initial random-or-not (asymmetric-or-not) position
  genRandInitFen(seed) {
    let fen, flags = "0707";
    if (!this.options.randomness)
      // Deterministic:
      fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0";

    else {
      // Randomize
      Random.setSeed(seed);
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
        pieces["w"].join("").toUpperCase() +
        " w 0"
      );
    }
    // Add turn + flags + enpassant (+ reserve)
    let parts = [];
    if (this.hasFlags)
      parts.push(`"flags":"${flags}"`);
    if (this.hasEnpassant)
      parts.push('"enpassant":"-"');
    if (this.hasReserveFen)
      parts.push('"reserve":"000000000000"');
    if (this.options["crazyhouse"])
      parts.push('"ispawn":"-"');
    if (parts.length >= 1)
      fen += " {" + parts.join(",") + "}";
    return fen;
  }

  // "Parse" FEN: just return untransformed string data
  parseFen(fen) {
    const fenParts = fen.split(" ");
    let res = {
      position: fenParts[0],
      turn: fenParts[1],
      movesCount: fenParts[2]
    };
    if (fenParts.length > 3)
      res = Object.assign(res, JSON.parse(fenParts[3]));
    return res;
  }

  // Return current fen (game state)
  getFen() {
    let fen = (
      this.getPosition() + " " +
      this.getTurnFen() + " " +
      this.movesCount
    );
    let parts = [];
    if (this.hasFlags)
      parts.push(`"flags":"${this.getFlagsFen()}"`);
    if (this.hasEnpassant)
      parts.push(`"enpassant":"${this.getEnpassantFen()}"`);
    if (this.hasReserveFen)
      parts.push(`"reserve":"${this.getReserveFen()}"`);
    if (this.options["crazyhouse"])
      parts.push(`"ispawn":"${this.getIspawnFen()}"`);
    if (parts.length >= 1)
      fen += " {" + parts.join(",") + "}";
    return fen;
  }

  static FenEmptySquares(count) {
    // if more than 9 consecutive free spaces, break the integer,
    // otherwise FEN parsing will fail.
    if (count <= 9)
      return count;
    // Most boards of size < 18:
    if (count <= 18)
      return "9" + (count - 9);
    // Except Gomoku:
    return "99" + (count - 18);
  }

  // Position part of the FEN string
  getPosition() {
    let position = "";
    for (let i = 0; i < this.size.y; i++) {
      let emptyCount = 0;
      for (let j = 0; j < this.size.x; j++) {
        if (this.board[i][j] == "")
          emptyCount++;
        else {
          if (emptyCount > 0) {
            // Add empty squares in-between
            position += C.FenEmptySquares(emptyCount);
            emptyCount = 0;
          }
          position += this.board2fen(this.board[i][j]);
        }
      }
      if (emptyCount > 0)
        // "Flush remainder"
        position += C.FenEmptySquares(emptyCount);
      if (i < this.size.y - 1)
        position += "/"; //separate rows
    }
    return position;
  }

  getTurnFen() {
    return this.turn;
  }

  // Flags part of the FEN string
  getFlagsFen() {
    return ["w", "b"].map(c => {
      return this.castleFlags[c].map(x => x.toString(36)).join("");
    }).join("");
  }

  // Enpassant part of the FEN string
  getEnpassantFen() {
    if (!this.epSquare)
      return "-"; //no en-passant
    return C.CoordsToSquare(this.epSquare);
  }

  getReserveFen() {
    return (
      ["w","b"].map(c => Object.values(this.reserve[c]).join("")).join("")
    );
  }

  getIspawnFen() {
    const squares = Object.keys(this.ispawn);
    if (squares.length == 0)
      return "-";
    return squares.join(",");
  }

  // Set flags from fen (castle: white a,h then black a,h)
  setFlags(fenflags) {
    this.castleFlags = {
      w: [0, 1].map(i => parseInt(fenflags.charAt(i), 36)),
      b: [2, 3].map(i => parseInt(fenflags.charAt(i), 36))
    };
  }

  //////////////////
  // INITIALIZATION

  constructor(o) {
    this.options = o.options;
    // Fill missing options (always the case if random challenge)
    (V.Options.select || []).concat(V.Options.input || []).forEach(opt => {
      if (this.options[opt.variable] === undefined)
        this.options[opt.variable] = opt.defaut;
    });
    if (o.genFenOnly)
      // This object will be used only for initial FEN generation
      return;
    this.playerColor = o.color;
    this.afterPlay = o.afterPlay; //trigger some actions after playing a move

    // Fen string fully describes the game state
    if (!o.fen)
      o.fen = this.genRandInitFen(o.seed);
    this.re_initFromFen(o.fen);

    // Graphical (can use variables defined above)
    this.containerId = o.element;
    this.isDiagram = o.diagram;
    this.graphicalInit();
  }

  re_initFromFen(fen, oldBoard) {
    const fenParsed = this.parseFen(fen);
    this.board = oldBoard || this.getBoard(fenParsed.position);
    this.turn = fenParsed.turn;
    this.movesCount = parseInt(fenParsed.movesCount, 10);
    this.setOtherVariables(fenParsed);
  }

  // Turn position fen into double array ["wb","wp","bk",...]
  getBoard(position) {
    const rows = position.split("/");
    let board = ArrayFun.init(this.size.x, this.size.y, "");
    for (let i = 0; i < rows.length; i++) {
      let j = 0;
      for (let indexInRow = 0; indexInRow < rows[i].length; indexInRow++) {
        const character = rows[i][indexInRow];
        const num = parseInt(character, 10);
        // If num is a number, just shift j:
        if (!isNaN(num))
          j += num;
        // Else: something at position i,j
        else
          board[i][j++] = this.fen2board(character);
      }
    }
    return board;
  }

  // Some additional variables from FEN (variant dependant)
  setOtherVariables(fenParsed) {
    // Set flags and enpassant:
    if (this.hasFlags)
      this.setFlags(fenParsed.flags);
    if (this.hasEnpassant)
      this.epSquare = this.getEpSquare(fenParsed.enpassant);
    if (this.hasReserve && !this.isDiagram)
      this.initReserves(fenParsed.reserve);
    if (this.options["crazyhouse"])
      this.initIspawn(fenParsed.ispawn);
    if (this.options["teleport"]) {
      this.subTurnTeleport = 1;
      this.captured = null;
    }
    if (this.options["dark"]) {
      // Setup enlightened: squares reachable by player side
      this.enlightened = ArrayFun.init(this.size.x, this.size.y, false);
      this.updateEnlightened();
    }
    this.subTurn = 1; //may be unused
    if (!this.moveStack) //avoid resetting (unwanted)
      this.moveStack = [];
  }

  // ordering as in pieces() p,r,n,b,q,k
  initReserves(reserveStr) {
    const counts = reserveStr.split("").map(c => parseInt(c, 36));
    this.reserve = { w: {}, b: {} };
    const pieceName = ['p', 'r', 'n', 'b', 'q', 'k'];
    const L = pieceName.length;
    for (let i of ArrayFun.range(2 * L)) {
      if (i < L)
        this.reserve['w'][pieceName[i]] = counts[i];
      else
        this.reserve['b'][pieceName[i-L]] = counts[i];
    }
  }

  initIspawn(ispawnStr) {
    if (ispawnStr != "-")
      this.ispawn = ArrayFun.toObject(ispawnStr.split(","), true);
    else
      this.ispawn = {};
  }

  ////////////////
  // VISUAL UTILS

  getPieceWidth(rwidth) {
    return (rwidth / this.size.y);
  }

  getReserveSquareSize(rwidth, nbR) {
    const sqSize = this.getPieceWidth(rwidth);
    return Math.min(sqSize, rwidth / nbR);
  }

  getReserveNumId(color, piece) {
    return `${this.containerId}|rnum-${color}${piece}`;
  }

  getNbReservePieces(color) {
    return (
      Object.values(this.reserve[color]).reduce(
        (oldV,newV) => oldV + (newV > 0 ? 1 : 0), 0)
    );
  }

  getRankInReserve(c, p) {
    const pieces = Object.keys(this.pieces());
    const lastIndex = pieces.findIndex(pp => pp == p)
    let toTest = pieces.slice(0, lastIndex);
    return toTest.reduce(
      (oldV,newV) => oldV + (this.reserve[c][newV] > 0 ? 1 : 0), 0);
  }

  static AddClass_es(piece, class_es) {
    if (!Array.isArray(class_es))
      class_es = [class_es];
    class_es.forEach(cl => {
      piece.classList.add(cl);
    });
  }

  static RemoveClass_es(piece, class_es) {
    if (!Array.isArray(class_es))
      class_es = [class_es];
    class_es.forEach(cl => {
      piece.classList.remove(cl);
    });
  }

  // Generally light square bottom-right
  getSquareColorClass(x, y) {
    return ((x+y) % 2 == 0 ? "light-square": "dark-square");
  }

  getMaxDistance(r) {
    // Works for all rectangular boards:
    return Math.sqrt(r.width ** 2 + r.height ** 2);
  }

  getDomPiece(x, y) {
    return (typeof x == "string" ? this.r_pieces : this.g_pieces)[x][y];
  }

  //////////////////
  // VISUAL METHODS

  graphicalInit() {
    const g_init = () => {
      this.re_drawBoardElements();
      if (!this.isDiagram && !this.mouseListeners && !this.touchListeners)
        this.initMouseEvents();
    };
    let container = document.getElementById(this.containerId);
    this.windowResizeObs = new ResizeObserver(g_init);
    this.windowResizeObs.observe(container);
  }

  re_drawBoardElements() {
    const board = this.getSvgChessboard();
    const oppCol = C.GetOppCol(this.playerColor);
    const container = document.getElementById(this.containerId);
    const rc = container.getBoundingClientRect();
    let chessboard = container.querySelector(".chessboard");
    chessboard.innerHTML = "";
    chessboard.insertAdjacentHTML('beforeend', board);
    // Compare window ratio width / height to aspectRatio:
    const windowRatio = rc.width / rc.height;
    let cbWidth, cbHeight;
    const vRatio = this.size.ratio || 1;
    if (windowRatio <= vRatio) {
      // Limiting dimension is width:
      cbWidth = Math.min(rc.width, 767);
      cbHeight = cbWidth / vRatio;
    }
    else {
      // Limiting dimension is height:
      cbHeight = Math.min(rc.height, 767);
      cbWidth = cbHeight * vRatio;
    }
    if (this.hasReserve && !this.isDiagram) {
      const sqSize = cbWidth / this.size.y;
      // NOTE: allocate space for reserves (up/down) even if they are empty
      // Cannot use getReserveSquareSize() here, but sqSize is an upper bound.
      if ((rc.height - cbHeight) / 2 < sqSize + 5) {
        cbHeight = rc.height - 2 * (sqSize + 5);
        cbWidth = cbHeight * vRatio;
      }
    }
    chessboard.style.width = cbWidth + "px";
    chessboard.style.height = cbHeight + "px";
    // Center chessboard:
    const spaceLeft = (rc.width - cbWidth) / 2,
          spaceTop = (rc.height - cbHeight) / 2;
    chessboard.style.left = spaceLeft + "px";
    chessboard.style.top = spaceTop + "px";
    // Give sizes instead of recomputing them,
    // because chessboard might not be drawn yet.
    this.setupPieces({
      width: cbWidth,
      height: cbHeight,
      x: spaceLeft,
      y: spaceTop
    });
  }

  // Get SVG board (background, no pieces)
  getSvgChessboard() {
    const flipped = (this.playerColor == 'b');
    let board = `
      <svg
        viewBox="0 0 ${10*this.size.y} ${10*this.size.x}"
        class="chessboard_SVG">`;
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        const ii = (flipped ? this.size.x - 1 - i : i);
        const jj = (flipped ? this.size.y - 1 - j : j);
        let classes = this.getSquareColorClass(ii, jj);
        if (this.enlightened && !this.enlightened[ii][jj])
          classes += " in-shadow";
        // NOTE: x / y reversed because coordinates system is reversed.
        board += `
          <rect
            class="${classes}"
            id="${this.coordsToId({x: ii, y: jj})}"
            width="10"
            height="10"
            x="${10*j}"
            y="${10*i}"
          />`;
      }
    }
    board += "</svg>";
    return board;
  }

  setupPieces(r) {
    // TODO: d_pieces : only markers (for diagrams) / also in rescale()
    if (this.g_pieces) {
      // Refreshing: delete old pieces first
      for (let i=0; i<this.size.x; i++) {
        for (let j=0; j<this.size.y; j++) {
          if (this.g_pieces[i][j]) {
            this.g_pieces[i][j].remove();
            this.g_pieces[i][j] = null;
          }
        }
      }
    }
    else
      this.g_pieces = ArrayFun.init(this.size.x, this.size.y, null);
    let chessboard =
      document.getElementById(this.containerId).querySelector(".chessboard");
    if (!r)
      r = chessboard.getBoundingClientRect();
    const pieceWidth = this.getPieceWidth(r.width);
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        if (this.board[i][j] != "") {
          const color = this.getColor(i, j);
          const piece = this.getPiece(i, j);
          this.g_pieces[i][j] = document.createElement("piece");
          C.AddClass_es(this.g_pieces[i][j],
                        this.pieces(color, i, j)[piece]["class"]);
          this.g_pieces[i][j].classList.add(C.GetColorClass(color));
          this.g_pieces[i][j].style.width = pieceWidth + "px";
          this.g_pieces[i][j].style.height = pieceWidth + "px";
          let [ip, jp] = this.getPixelPosition(i, j, r);
          // Translate coordinates to use chessboard as reference:
          this.g_pieces[i][j].style.transform =
            `translate(${ip - r.x}px,${jp - r.y}px)`;
          if (this.enlightened && !this.enlightened[i][j])
            this.g_pieces[i][j].classList.add("hidden");
          chessboard.appendChild(this.g_pieces[i][j]);
        }
      }
    }
    if (this.hasReserve && !this.isDiagram)
      this.re_drawReserve(['w', 'b'], r);
  }

  // NOTE: assume this.reserve != null
  re_drawReserve(colors, r) {
    if (this.r_pieces) {
      // Remove (old) reserve pieces
      for (let c of colors) {
        Object.keys(this.r_pieces[c]).forEach(p => {
          this.r_pieces[c][p].remove();
          delete this.r_pieces[c][p];
          const numId = this.getReserveNumId(c, p);
          document.getElementById(numId).remove();
        });
      }
    }
    else
      this.r_pieces = { w: {}, b: {} };
    let container = document.getElementById(this.containerId);
    if (!r)
      r = container.querySelector(".chessboard").getBoundingClientRect();
    for (let c of colors) {
      let reservesDiv = document.getElementById("reserves_" + c);
      if (reservesDiv)
        reservesDiv.remove();
      if (!this.reserve[c])
        continue;
      const nbR = this.getNbReservePieces(c);
      if (nbR == 0)
        continue;
      const sqResSize = this.getReserveSquareSize(r.width, nbR);
      let ridx = 0;
      const vShift = (c == this.playerColor ? r.height + 5 : -sqResSize - 5);
      const [i0, j0] = [r.x, r.y + vShift];
      let rcontainer = document.createElement("div");
      rcontainer.id = "reserves_" + c;
      rcontainer.classList.add("reserves");
      rcontainer.style.left = i0 + "px";
      rcontainer.style.top = j0 + "px";
      // NOTE: +1 fix display bug on Firefox at least
      rcontainer.style.width = (nbR * sqResSize + 1) + "px";
      rcontainer.style.height = sqResSize + "px";
      container.appendChild(rcontainer);
      for (let p of Object.keys(this.reserve[c])) {
        if (this.reserve[c][p] == 0)
          continue;
        let r_cell = document.createElement("div");
        r_cell.id = this.coordsToId({x: c, y: p});
        r_cell.classList.add("reserve-cell");
        r_cell.style.width = sqResSize + "px";
        r_cell.style.height = sqResSize + "px";
        rcontainer.appendChild(r_cell);
        let piece = document.createElement("piece");
        C.AddClass_es(piece, this.pieces(c, c, p)[p]["class"]);
        piece.classList.add(C.GetColorClass(c));
        piece.style.width = "100%";
        piece.style.height = "100%";
        this.r_pieces[c][p] = piece;
        r_cell.appendChild(piece);
        let number = document.createElement("div");
        number.textContent = this.reserve[c][p];
        number.classList.add("reserve-num");
        number.id = this.getReserveNumId(c, p);
        const fontSize = "1.3em";
        number.style.fontSize = fontSize;
        number.style.fontSize = fontSize;
        r_cell.appendChild(number);
        ridx++;
      }
    }
  }

  updateReserve(color, piece, count) {
    if (this.options["cannibal"] && C.CannibalKings[piece])
      piece = "k"; //capturing cannibal king: back to king form
    const oldCount = this.reserve[color][piece];
    this.reserve[color][piece] = count;
    // Redrawing is much easier if count==0
    if ([oldCount, count].includes(0))
      this.re_drawReserve([color]);
    else {
      const numId = this.getReserveNumId(color, piece);
      document.getElementById(numId).textContent = count;
    }
  }

  // Resize board: no need to destroy/recreate pieces
  rescale(mode) {
    const container = document.getElementById(this.containerId);
    let chessboard = container.querySelector(".chessboard");
    const rc = container.getBoundingClientRect(),
          r = chessboard.getBoundingClientRect();
    const multFact = (mode == "up" ? 1.05 : 0.95);
    let [newWidth, newHeight] = [multFact * r.width, multFact * r.height];
    // Stay in window:
    const vRatio = this.size.ratio || 1;
    if (newWidth > rc.width) {
      newWidth = rc.width;
      newHeight = newWidth / vRatio;
    }
    if (newHeight > rc.height) {
      newHeight = rc.height;
      newWidth = newHeight * vRatio;
    }
    chessboard.style.width = newWidth + "px";
    chessboard.style.height = newHeight + "px";
    const newX = (rc.width - newWidth) / 2;
    chessboard.style.left = newX + "px";
    const newY = (rc.height - newHeight) / 2;
    chessboard.style.top = newY + "px";
    const newR = {x: newX, y: newY, width: newWidth, height: newHeight};
    const pieceWidth = this.getPieceWidth(newWidth);
    // NOTE: next "if" for variants which use squares filling
    // instead of "physical", moving pieces
    if (this.g_pieces) {
      for (let i=0; i < this.size.x; i++) {
        for (let j=0; j < this.size.y; j++) {
          if (this.g_pieces[i][j]) {
            // NOTE: could also use CSS transform "scale"
            this.g_pieces[i][j].style.width = pieceWidth + "px";
            this.g_pieces[i][j].style.height = pieceWidth + "px";
            const [ip, jp] = this.getPixelPosition(i, j, newR);
            // Translate coordinates to use chessboard as reference:
            this.g_pieces[i][j].style.transform =
              `translate(${ip - newX}px,${jp - newY}px)`;
          }
        }
      }
    }
    if (this.hasReserve && !this.isDiagram)
      this.rescaleReserve(newR);
  }

  rescaleReserve(r) {
    for (let c of ['w','b']) {
      if (!this.reserve[c])
        continue;
      const nbR = this.getNbReservePieces(c);
      if (nbR == 0)
        continue;
      // Resize container first
      const sqResSize = this.getReserveSquareSize(r.width, nbR);
      const vShift = (c == this.playerColor ? r.height + 5 : -sqResSize - 5);
      const [i0, j0] = [r.x, r.y + vShift];
      let rcontainer = document.getElementById("reserves_" + c);
      rcontainer.style.left = i0 + "px";
      rcontainer.style.top = j0 + "px";
      rcontainer.style.width = (nbR * sqResSize + 1) + "px";
      rcontainer.style.height = sqResSize + "px";
      // And then reserve cells:
      const rpieceWidth = this.getReserveSquareSize(r.width, nbR);
      Object.keys(this.reserve[c]).forEach(p => {
        if (this.reserve[c][p] == 0)
          return;
        let r_cell = document.getElementById(this.coordsToId({x: c, y: p}));
        r_cell.style.width = sqResSize + "px";
        r_cell.style.height = sqResSize + "px";
      });
    }
  }

  // Return the absolute pixel coordinates given current position.
  // Our coordinate system differs from CSS one (x <--> y).
  // We return here the CSS coordinates (more useful).
  getPixelPosition(i, j, r) {
    if (i < 0 || j < 0)
      return [0, 0]; //piece vanishes
    let x, y;
    if (typeof i == "string") {
      // Reserves: need to know the rank of piece
      const nbR = this.getNbReservePieces(i);
      const rsqSize = this.getReserveSquareSize(r.width, nbR);
      x = this.getRankInReserve(i, j) * rsqSize;
      y = (this.playerColor == i ? y = r.height + 5 : - 5 - rsqSize);
    }
    else {
      const sqSize = r.width / this.size.y;
      const flipped = (this.playerColor == 'b');
      x = (flipped ? this.size.y - 1 - j : j) * sqSize;
      y = (flipped ? this.size.x - 1 - i : i) * sqSize;
    }
    return [r.x + x, r.y + y];
  }

  initMouseEvents() {
    let container = document.getElementById(this.containerId);
    let chessboard = container.querySelector(".chessboard");

    const getOffset = e => {
      if (e.clientX)
        // Mouse
        return {x: e.clientX, y: e.clientY};
      let touchLocation = null;
      if (e.targetTouches && e.targetTouches.length >= 1)
        // Touch screen, dragstart
        touchLocation = e.targetTouches[0];
      else if (e.changedTouches && e.changedTouches.length >= 1)
        // Touch screen, dragend
        touchLocation = e.changedTouches[0];
      if (touchLocation)
        return {x: touchLocation.clientX, y: touchLocation.clientY};
      return {x: 0, y: 0}; //shouldn't reach here =)
    }

    const centerOnCursor = (piece, e) => {
      const centerShift = this.getPieceWidth(r.width) / 2;
      const offset = getOffset(e);
      piece.style.left = (offset.x - centerShift) + "px";
      piece.style.top = (offset.y - centerShift) + "px";
    }

    let start = null,
        r = null,
        startPiece, curPiece = null,
        pieceWidth;
    const mousedown = (e) => {
      // Disable zoom on smartphones:
      if (e.touches && e.touches.length > 1)
        e.preventDefault();
      r = chessboard.getBoundingClientRect();
      pieceWidth = this.getPieceWidth(r.width);
      const cd = this.idToCoords(e.target.id);
      if (cd) {
        const move = this.doClick(cd);
        if (move)
          this.buildMoveStack(move, r);
        else if (!this.clickOnly) {
          const [x, y] = Object.values(cd);
          if (typeof x != "number")
            startPiece = this.r_pieces[x][y];
          else
            startPiece = this.g_pieces[x][y];
          if (startPiece && this.canIplay(x, y)) {
            e.preventDefault();
            start = cd;
            curPiece = startPiece.cloneNode();
            curPiece.style.transform = "none";
            curPiece.style.zIndex = 5;
            curPiece.style.width = pieceWidth + "px";
            curPiece.style.height = pieceWidth + "px";
            centerOnCursor(curPiece, e);
            container.appendChild(curPiece);
            startPiece.style.opacity = "0.4";
            chessboard.style.cursor = "none";
          }
        }
      }
    };

    const mousemove = (e) => {
      if (start) {
        e.preventDefault();
        centerOnCursor(curPiece, e);
      }
      else if (e.changedTouches && e.changedTouches.length >= 1)
        // Attempt to prevent horizontal swipe...
        e.preventDefault();
    };

    const mouseup = (e) => {
      if (!start)
        return;
      const [x, y] = [start.x, start.y];
      start = null;
      e.preventDefault();
      chessboard.style.cursor = "pointer";
      startPiece.style.opacity = "1";
      const offset = getOffset(e);
      const landingElt = document.elementFromPoint(offset.x, offset.y);
      const cd =
        (landingElt ? this.idToCoords(landingElt.id) : undefined);
      if (cd) {
        // NOTE: clearly suboptimal, but much easier, and not a big deal.
        const potentialMoves = this.getPotentialMovesFrom([x, y])
          .filter(m => m.end.x == cd.x && m.end.y == cd.y);
        const moves = this.filterValid(potentialMoves);
        if (moves.length >= 2)
          this.showChoices(moves, r);
        else if (moves.length == 1)
          this.buildMoveStack(moves[0], r);
      }
      curPiece.remove();
    };

    const resize = (e) => this.rescale(e.deltaY < 0 ? "up" : "down");

    if ('onmousedown' in window) {
      this.mouseListeners = [
        {type: "mousedown", listener: mousedown},
        {type: "mousemove", listener: mousemove},
        {type: "mouseup", listener: mouseup},
        {type: "wheel", listener: resize}
      ];
      this.mouseListeners.forEach(ml => {
        document.addEventListener(ml.type, ml.listener);
      });
    }
    if ('ontouchstart' in window) {
      this.touchListeners = [
        {type: "touchstart", listener: mousedown},
        {type: "touchmove", listener: mousemove},
        {type: "touchend", listener: mouseup}
      ];
      this.touchListeners.forEach(tl => {
        // https://stackoverflow.com/a/42509310/12660887
        document.addEventListener(tl.type, tl.listener, {passive: false});
      });
    }
    // TODO: onpointerdown/move/up ? See reveal.js /controllers/touch.js
  }

  removeListeners() {
    let container = document.getElementById(this.containerId);
    this.windowResizeObs.unobserve(container);
    if (this.isDiagram)
      return; //no listeners in this case
    if ('onmousedown' in window) {
      this.mouseListeners.forEach(ml => {
        document.removeEventListener(ml.type, ml.listener);
      });
    }
    if ('ontouchstart' in window) {
      this.touchListeners.forEach(tl => {
        // https://stackoverflow.com/a/42509310/12660887
        document.removeEventListener(tl.type, tl.listener);
      });
    }
  }

  showChoices(moves, r) {
    let container = document.getElementById(this.containerId);
    let chessboard = container.querySelector(".chessboard");
    let choices = document.createElement("div");
    choices.id = "choices";
    if (!r)
      r = chessboard.getBoundingClientRect();
    choices.style.width = r.width + "px";
    choices.style.height = r.height + "px";
    choices.style.left = r.x + "px";
    choices.style.top = r.y + "px";
    chessboard.style.opacity = "0.5";
    container.appendChild(choices);
    const squareWidth = r.width / this.size.y;
    const firstUpLeft = (r.width - (moves.length * squareWidth)) / 2;
    const firstUpTop = (r.height - squareWidth) / 2;
    const color = moves[0].appear[0].c;
    const callback = (m) => {
      chessboard.style.opacity = "1";
      container.removeChild(choices);
      this.buildMoveStack(m, r);
    }
    for (let i=0; i < moves.length; i++) {
      let choice = document.createElement("div");
      choice.classList.add("choice");
      choice.style.width = squareWidth + "px";
      choice.style.height = squareWidth + "px";
      choice.style.left = (firstUpLeft + i * squareWidth) + "px";
      choice.style.top = firstUpTop + "px";
      choice.style.backgroundColor = "lightyellow";
      choice.onclick = () => callback(moves[i]);
      const piece = document.createElement("piece");
      const cdisp = moves[i].choice || moves[i].appear[0].p;
      C.AddClass_es(piece,
        this.pieces(color, moves[i].end.x, moves[i].end.y)[cdisp]["class"]);
      piece.classList.add(C.GetColorClass(color));
      piece.style.width = "100%";
      piece.style.height = "100%";
      choice.appendChild(piece);
      choices.appendChild(choice);
    }
  }

  ////////////////
  // DARK METHODS

  updateEnlightened() {
    this.oldEnlightened = this.enlightened;
    this.enlightened = ArrayFun.init(this.size.x, this.size.y, false);
    // Add pieces positions + all squares reachable by moves (includes Zen):
    for (let x=0; x<this.size.x; x++) {
      for (let y=0; y<this.size.y; y++) {
        if (this.board[x][y] != "" && this.getColor(x, y) == this.playerColor)
        {
          this.enlightened[x][y] = true;
          this.getPotentialMovesFrom([x, y]).forEach(m => {
            this.enlightened[m.end.x][m.end.y] = true;
          });
        }
      }
    }
    if (this.epSquare)
      this.enlightEnpassant();
  }

  // Include square of the en-passant capturing square:
  enlightEnpassant() {
    // NOTE: shortcut, pawn has only one attack type, doesn't depend on square
    const steps = this.pieces(this.playerColor)["p"].attack[0].steps;
    for (let step of steps) {
      const x = this.epSquare.x - step[0],
            y = this.getY(this.epSquare.y - step[1]);
      if (
        this.onBoard(x, y) &&
        this.getColor(x, y) == this.playerColor &&
        this.getPieceType(x, y) == "p"
      ) {
        this.enlightened[x][this.epSquare.y] = true;
        break;
      }
    }
  }

  // Apply diff this.enlightened --> oldEnlightened on board
  graphUpdateEnlightened() {
    let chessboard =
      document.getElementById(this.containerId).querySelector(".chessboard");
    const r = chessboard.getBoundingClientRect();
    const pieceWidth = this.getPieceWidth(r.width);
    for (let x=0; x<this.size.x; x++) {
      for (let y=0; y<this.size.y; y++) {
        if (!this.enlightened[x][y] && this.oldEnlightened[x][y]) {
          let elt = document.getElementById(this.coordsToId({x: x, y: y}));
          elt.classList.add("in-shadow");
          if (this.g_pieces[x][y])
            this.g_pieces[x][y].classList.add("hidden");
        }
        else if (this.enlightened[x][y] && !this.oldEnlightened[x][y]) {
          let elt = document.getElementById(this.coordsToId({x: x, y: y}));
          elt.classList.remove("in-shadow");
          if (this.g_pieces[x][y])
            this.g_pieces[x][y].classList.remove("hidden");
        }
      }
    }
  }

  //////////////
  // BASIC UTILS

  get size() {
    return {
      x: 8,
      y: 8,
      ratio: 1 //for rectangular board = y / x (optional, 1 = default)
    };
  }

  // Color of thing on square (i,j). '' if square is empty
  getColor(i, j) {
    if (typeof i == "string")
      return i; //reserves
    return this.board[i][j].charAt(0);
  }

  static GetColorClass(c) {
    if (c == 'w')
      return "white";
    if (c == 'b')
      return "black";
    return "other-color"; //unidentified color
  }

  // Piece on i,j. '' if square is empty
  getPiece(i, j) {
    if (typeof j == "string")
      return j; //reserves
    return this.board[i][j].charAt(1);
  }

  // Piece type on square (i,j)
  getPieceType(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return this.pieces()[p].moveas || p;
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    if (!this.options["cannibal"])
      return p == 'k';
    return !!C.CannibalKings[p];
  }

  // Get opponent color
  static GetOppCol(color) {
    return (color == "w" ? "b" : "w");
  }

  // Is (x,y) on the chessboard?
  onBoard(x, y) {
    return (x >= 0 && x < this.size.x &&
            y >= 0 && y < this.size.y);
  }

  // Am I allowed to move thing at square x,y ?
  canIplay(x, y) {
    return (this.playerColor == this.turn && this.getColor(x, y) == this.turn);
  }

  ////////////////////////
  // PIECES SPECIFICATIONS

  pieces(color, x, y) {
    const pawnShift = (color == "w" ? -1 : 1);
    // NOTE: jump 2 squares from first rank (pawns can be here sometimes)
    const initRank = ((color == 'w' && x >= 6) || (color == 'b' && x <= 1));
    return {
      'p': {
        "class": "pawn",
        moves: [
          {
            steps: [[pawnShift, 0]],
            range: (initRank ? 2 : 1)
          }
        ],
        attack: [
          {
            steps: [[pawnShift, 1], [pawnShift, -1]],
            range: 1
          }
        ]
      },
      'r': {
        "class": "rook",
        moves: [
          {steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]}
        ]
      },
      'n': {
        "class": "knight",
        moves: [
          {
            steps: [
              [1, 2], [1, -2], [-1, 2], [-1, -2],
              [2, 1], [-2, 1], [2, -1], [-2, -1]
            ],
            range: 1
          }
        ]
      },
      'b': {
        "class": "bishop",
        moves: [
          {steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]]}
        ]
      },
      'q': {
        "class": "queen",
        moves: [
          {
            steps: [
              [0, 1], [0, -1], [1, 0], [-1, 0],
              [1, 1], [1, -1], [-1, 1], [-1, -1]
            ]
          }
        ]
      },
      'k': {
        "class": "king",
        moves: [
          {
            steps: [
              [0, 1], [0, -1], [1, 0], [-1, 0],
              [1, 1], [1, -1], [-1, 1], [-1, -1]
            ],
            range: 1
          }
        ]
      },
      // Cannibal kings:
      '!': {"class": "king-pawn", moveas: "p"},
      '#': {"class": "king-rook", moveas: "r"},
      '$': {"class": "king-knight", moveas: "n"},
      '%': {"class": "king-bishop", moveas: "b"},
      '*': {"class": "king-queen", moveas: "q"}
    };
  }

  // NOTE: using special symbols to not interfere with variants' pieces codes
  static get CannibalKings() {
    return {
      "!": "p",
      "#": "r",
      "$": "n",
      "%": "b",
      "*": "q",
      "k": "k"
    };
  }

  static get CannibalKingCode() {
    return {
      "p": "!",
      "r": "#",
      "n": "$",
      "b": "%",
      "q": "*",
      "k": "k"
    };
  }

  //////////////////////////
  // MOVES GENERATION UTILS

  // For Cylinder: get Y coordinate
  getY(y) {
    if (!this.options["cylinder"])
      return y;
    let res = y % this.size.y;
    if (res < 0)
      res += this.size.y;
    return res;
  }

  getSegments(curSeg, segStart, segEnd) {
    if (curSeg.length == 0)
      return undefined;
    let segments = JSON.parse(JSON.stringify(curSeg)); //not altering
    segments.push([[segStart[0], segStart[1]], [segEnd[0], segEnd[1]]]);
    return segments;
  }

  getStepSpec(color, x, y, piece) {
    return this.pieces(color, x, y)[piece || this.getPieceType(x, y)];
  }

  // Can thing on square1 capture thing on square2?
  canTake([x1, y1], [x2, y2]) {
    return this.getColor(x1, y1) !== this.getColor(x2, y2);
  }

  canStepOver(i, j, p) {
    // In some variants, objects on boards don't stop movement (Chakart)
    return this.board[i][j] == "";
  }

  canDrop([c, p], [i, j]) {
    return (
      this.board[i][j] == "" &&
      (!this.enlightened || this.enlightened[i][j]) &&
      (
        p != "p" ||
        (c == 'w' && i < this.size.x - 1) ||
        (c == 'b' && i > 0)
      )
    );
  }

  // For Madrasi:
  // (redefined in Baroque etc, where Madrasi condition doesn't make sense)
  isImmobilized([x, y]) {
    if (!this.options["madrasi"])
      return false;
    const color = this.getColor(x, y);
    const oppCol = C.GetOppCol(color);
    const piece = this.getPieceType(x, y);
    const stepSpec = this.getStepSpec(color, x, y, piece);
    const attacks = stepSpec.attack || stepSpec.moves;
    for (let a of attacks) {
      outerLoop: for (let step of a.steps) {
        let [i, j] = [x + step[0], y + step[1]];
        let stepCounter = 1;
        while (this.onBoard(i, j) && this.board[i][j] == "") {
          if (a.range <= stepCounter++)
            continue outerLoop;
          i += step[0];
          j = this.getY(j + step[1]);
        }
        if (
          this.onBoard(i, j) &&
          this.getColor(i, j) == oppCol &&
          this.getPieceType(i, j) == piece
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // Stop at the first capture found
  atLeastOneCapture(color) {
    const oppCol = C.GetOppCol(color);
    const allowed = (sq1, sq2) => {
      return (
        // NOTE: canTake is reversed for Zen.
        // Generally ok because of the symmetry. TODO?
        this.canTake(sq1, sq2) &&
        this.filterValid(
          [this.getBasicMove(sq1, sq2)]).length >= 1
      );
    };
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.getColor(i, j) == color) {
          if (
            (
              !this.options["zen"] &&
              this.findDestSquares(
                [i, j],
                {
                  attackOnly: true,
                  one: true,
                  segments: this.options["cylinder"]
                },
                allowed
              )
            )
            ||
            (
              (
                this.options["zen"] &&
                this.findCapturesOn(
                  [i, j],
                  {
                    one: true,
                    segments: this.options["cylinder"]
                  },
                  allowed
                )
              )
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  compatibleStep([x1, y1], [x2, y2], step, range) {
    const epsilon = 1e-7; //arbitrary small value
    let shifts = [0];
    if (this.options["cylinder"])
      Array.prototype.push.apply(shifts, [-this.size.y, this.size.y]);
    for (let sh of shifts) {
      const rx = (x2 - x1) / step[0],
            ry = (y2 + sh - y1) / step[1];
      if (
        // Zero step but non-zero interval => impossible
        (!Number.isFinite(rx) && !Number.isNaN(rx)) ||
        (!Number.isFinite(ry) && !Number.isNaN(ry)) ||
        // Negative number of step (impossible)
        (rx < 0 || ry < 0) ||
        // Not the same number of steps in both directions:
        (!Number.isNaN(rx) && !Number.isNaN(ry) && Math.abs(rx - ry) > epsilon)
      ) {
        continue;
      }
      let distance = (Number.isNaN(rx) ? ry : rx);
      if (Math.abs(distance - Math.round(distance)) > epsilon)
        continue;
      distance = Math.round(distance); //in case of (numerical...)
      if (!range || range >= distance)
        return true;
    }
    return false;
  }

  ////////////////////
  // MOVES GENERATION

  getDropMovesFrom([c, p]) {
    // NOTE: by design, this.reserve[c][p] >= 1 on user click
    // (but not necessarily otherwise: atLeastOneMove() etc)
    if (this.reserve[c][p] == 0)
      return [];
    let moves = [];
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.canDrop([c, p], [i, j])) {
          let mv = new Move({
            start: {x: c, y: p},
            end: {x: i, y: j},
            appear: [new PiPo({x: i, y: j, c: c, p: p})],
            vanish: []
          });
          if (this.board[i][j] != "") {
            mv.vanish.push(new PiPo({
              x: i,
              y: j,
              c: this.getColor(i, j),
              p: this.getPiece(i, j)
            }));
          }
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  // All possible moves from selected square
  getPotentialMovesFrom([x, y], color) {
    if (this.subTurnTeleport == 2)
      return [];
    if (typeof x == "string")
      return this.getDropMovesFrom([x, y]);
    if (this.isImmobilized([x, y]))
      return [];
    const piece = this.getPieceType(x, y);
    let moves = this.getPotentialMovesOf(piece, [x, y]);
    if (piece == "p" && this.hasEnpassant && this.epSquare)
      Array.prototype.push.apply(moves, this.getEnpassantCaptures([x, y]));
    if (
      piece == "k" && this.hasCastle &&
      this.castleFlags[color || this.turn].some(v => v < this.size.y)
    ) {
      Array.prototype.push.apply(moves, this.getCastleMoves([x, y]));
    }
    return this.postProcessPotentialMoves(moves);
  }

  postProcessPotentialMoves(moves) {
    if (moves.length == 0)
      return [];
    const color = this.getColor(moves[0].start.x, moves[0].start.y);
    const oppCol = C.GetOppCol(color);

    if (this.options["capture"] && this.atLeastOneCapture(color))
      moves = this.capturePostProcess(moves, oppCol);

    if (this.options["atomic"])
      this.atomicPostProcess(moves, color, oppCol);

    if (
      moves.length > 0 &&
      this.getPieceType(moves[0].start.x, moves[0].start.y) == "p"
    ) {
      this.pawnPostProcess(moves, color, oppCol);
    }

    if (this.options["cannibal"] && this.options["rifle"])
      // In this case a rifle-capture from last rank may promote a pawn
      this.riflePromotePostProcess(moves, color);

    return moves;
  }

  capturePostProcess(moves, oppCol) {
    // Filter out non-capturing moves (not using m.vanish because of
    // self captures of Recycle and Teleport).
    return moves.filter(m => {
      return (
        this.board[m.end.x][m.end.y] != "" &&
        this.getColor(m.end.x, m.end.y) == oppCol
      );
    });
  }

  atomicPostProcess(moves, color, oppCol) {
    moves.forEach(m => {
      if (
        this.board[m.end.x][m.end.y] != "" &&
        this.getColor(m.end.x, m.end.y) == oppCol
      ) {
        // Explosion!
        let steps = [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1]
        ];
        let mNext = new Move({
          start: m.end,
          end: m.end,
          appear: [],
          vanish: []
        });
        for (let step of steps) {
          let x = m.end.x + step[0];
          let y = this.getY(m.end.y + step[1]);
          if (
            this.onBoard(x, y) &&
            this.board[x][y] != "" &&
            (x != m.start.x || y != m.start.y) &&
            this.getPieceType(x, y) != "p"
          ) {
            mNext.vanish.push(
              new PiPo({
                p: this.getPiece(x, y),
                c: this.getColor(x, y),
                x: x,
                y: y
              })
            );
          }
        }
        if (!this.options["rifle"]) {
          // The moving piece also vanish
          mNext.vanish.unshift(
            new PiPo({
              x: m.end.x,
              y: m.end.y,
              c: color,
              p: this.getPiece(m.start.x, m.start.y)
            })
          );
        }
        m.next = mNext;
      }
    });
  }

  pawnPostProcess(moves, color, oppCol) {
    let moreMoves = [];
    const lastRank = (color == "w" ? 0 : this.size.x - 1);
    const initPiece = this.getPiece(moves[0].start.x, moves[0].start.y);
    moves.forEach(m => {
      const [x1, y1] = [m.start.x, m.start.y];
      const [x2, y2] = [m.end.x, m.end.y];
      const promotionOk = (
        x2 == lastRank &&
        (!this.options["rifle"] || this.board[x2][y2] == "")
      );
      if (!promotionOk)
        return; //nothing to do
      if (this.options["pawnfall"]) {
        m.appear.shift();
        return;
      }
      let finalPieces = ["p"];
      if (
        this.options["cannibal"] &&
        this.board[x2][y2] != "" &&
        this.getColor(x2, y2) == oppCol
      ) {
        finalPieces = [this.getPieceType(x2, y2)];
      }
      else
        finalPieces = this.pawnPromotions;
      m.appear[0].p = finalPieces[0];
      if (initPiece == "!") //cannibal king-pawn
        m.appear[0].p = C.CannibalKingCode[finalPieces[0]];
      for (let i=1; i<finalPieces.length; i++) {
        const piece = finalPieces[i];
        const tr = {
          c: color,
          p: (initPiece != "!" ? piece : C.CannibalKingCode[piece])
        };
        let newMove = this.getBasicMove([x1, y1], [x2, y2], tr);
        moreMoves.push(newMove);
      }
    });
    Array.prototype.push.apply(moves, moreMoves);
  }

  riflePromotePostProcess(moves, color) {
    const lastRank = (color == "w" ? 0 : this.size.x - 1);
    let newMoves = [];
    moves.forEach(m => {
      if (
        m.start.x == lastRank &&
        m.appear.length >= 1 &&
        m.appear[0].p == "p" &&
        m.appear[0].x == m.start.x &&
        m.appear[0].y == m.start.y
      ) {
        m.appear[0].p = this.pawnPromotions[0];
        for (let i=1; i<this.pawnPromotions.length; i++) {
          let newMv = JSON.parse(JSON.stringify(m));
          newMv.appear[0].p = this.pawnSpecs.promotions[i];
          newMoves.push(newMv);
        }
      }
    });
    Array.prototype.push.apply(moves, newMoves);
  }

  // Generic method to find possible moves of "sliding or jumping" pieces
  getPotentialMovesOf(piece, [x, y]) {
    const color = this.getColor(x, y);
    const stepSpec = this.getStepSpec(color, x, y, piece);
    let squares = [];
    if (stepSpec.attack) {
      squares = this.findDestSquares(
        [x, y],
        {
          attackOnly: true,
          segments: this.options["cylinder"],
          stepSpec: stepSpec
        },
        ([i1, j1], [i2, j2]) => {
          return (
            (!this.options["zen"] || this.isKing(i2, j2)) &&
            this.canTake([i1, j1], [i2, j2])
          );
        }
      );
    }
    const noSpecials = this.findDestSquares(
      [x, y],
      {
        moveOnly: !!stepSpec.attack || this.options["zen"],
        segments: this.options["cylinder"],
        stepSpec: stepSpec
      }
    );
    Array.prototype.push.apply(squares, noSpecials);
    if (this.options["zen"]) {
      let zenCaptures = this.findCapturesOn(
        [x, y],
        {}, //byCol: default is ok
        ([i1, j1], [i2, j2]) =>
          !this.isKing(i1, j1) && this.canTake([i2, j2], [i1, j1])
      );
      // Technical step: segments (if any) are reversed
      if (this.options["cylinder"]) {
        zenCaptures.forEach(z => {
          z.segments = z.segments.reverse().map(s => s.reverse())
        });
      }
      Array.prototype.push.apply(squares, zenCaptures);
    }
    if (
      this.options["recycle"] ||
      (this.options["teleport"] && this.subTurnTeleport == 1)
    ) {
      const selfCaptures = this.findDestSquares(
        [x, y],
        {
          attackOnly: true,
          segments: this.options["cylinder"],
          stepSpec: stepSpec
        },
        ([i1, j1], [i2, j2]) =>
          this.getColor(i2, j2) == color && !this.isKing(i2, j2)
      );
      Array.prototype.push.apply(squares, selfCaptures);
    }
    return squares.map(s => {
      let mv = this.getBasicMove([x, y], s.sq);
      if (this.options["cylinder"] && s.segments.length >= 2)
        mv.segments = s.segments;
      return mv;
    });
  }

  findDestSquares([x, y], o, allowed) {
    if (!allowed)
      allowed = (sq1, sq2) => this.canTake(sq1, sq2);
    const apparentPiece = this.getPiece(x, y); //how it looks
    let res = [];
    // Next 3 for Cylinder mode: (unused if !o.segments)
    let explored = {};
    let segments = [];
    let segStart = [];
    const addSquare = ([i, j]) => {
      let elt = {sq: [i, j]};
      if (o.segments)
        elt.segments = this.getSegments(segments, segStart, end);
      res.push(elt);
    };
    const exploreSteps = (stepArray) => {
      for (let s of stepArray) {
        outerLoop: for (let step of s.steps) {
          if (o.segments) {
            segments = [];
            segStart = [x, y];
          }
          let [i, j] = [x, y];
          let stepCounter = 0;
          while (
            this.onBoard(i, j) &&
            ((i == x && j == y) || this.canStepOver(i, j, apparentPiece))
          ) {
            if (!explored[i + "." + j] && (i != x || j != y)) {
              explored[i + "." + j] = true;
              if (
                !o.captureTarget ||
                (o.captureTarget[0] == i && o.captureTarget[1] == j)
              ) {
                if (o.one && !o.attackOnly)
                  return true;
                if (!o.attackOnly)
                  addSquare(!o.captureTarget ? [i, j] : [x, y]);
                if (o.captureTarget)
                  return res[0];
              }
            }
            if (s.range <= stepCounter++)
              continue outerLoop;
            const oldIJ = [i, j];
            i += step[0];
            j = this.getY(j + step[1]);
            if (o.segments && Math.abs(j - oldIJ[1]) > 1) {
              // Boundary between segments (cylinder mode)
              segments.push([[segStart[0], segStart[1]], oldIJ]);
              segStart = [i, j];
            }
          }
          if (!this.onBoard(i, j))
            continue;
          const pieceIJ = this.getPieceType(i, j);
          if (!explored[i + "." + j]) {
            explored[i + "." + j] = true;
            if (allowed([x, y], [i, j])) {
              if (o.one && !o.moveOnly)
                return true;
              if (!o.moveOnly)
                addSquare(!o.captureTarget ? [i, j] : [x, y]);
              if (
                o.captureTarget &&
                o.captureTarget[0] == i && o.captureTarget[1] == j
              ) {
                return res[0];
              }
            }
          }
        }
      }
      return undefined; //default, but let's explicit it
    };
    if (o.captureTarget)
      return exploreSteps(o.captureSteps)
    else {
      const stepSpec =
        o.stepSpec || this.getStepSpec(this.getColor(x, y), x, y);
      let outOne = false;
      if (!o.attackOnly || !stepSpec.attack)
        outOne = exploreSteps(stepSpec.moves);
      if (!outOne && !o.moveOnly && !!stepSpec.attack) {
        o.attackOnly = true; //ok because o is always a temporary object
        outOne = exploreSteps(stepSpec.attack);
      }
      return (o.one ? outOne : res);
    }
  }

  // Search for enemy (or not) pieces attacking [x, y]
  findCapturesOn([x, y], o, allowed) {
    if (!o.byCol)
      o.byCol = [C.GetOppCol(this.getColor(x, y) || this.turn)];
    let res = [];
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        const colIJ = this.getColor(i, j);
        if (
          this.board[i][j] != "" &&
          o.byCol.includes(colIJ) &&
          !this.isImmobilized([i, j])
        ) {
          const apparentPiece = this.getPiece(i, j);
          // Quick check: does this potential attacker target x,y ?
          if (this.canStepOver(x, y, apparentPiece))
            continue;
          const stepSpec = this.getStepSpec(colIJ, i, j);
          const attacks = stepSpec.attack || stepSpec.moves;
          for (let a of attacks) {
            for (let s of a.steps) {
              // Quick check: if step isn't compatible, don't even try
              if (!this.compatibleStep([i, j], [x, y], s, a.range))
                continue;
              // Finally verify that nothing stand in-between
              const out = this.findDestSquares(
                [i, j],
                {
                  captureTarget: [x, y],
                  captureSteps: [{steps: [s], range: a.range}],
                  segments: o.segments,
                  attackOnly: true,
                  one: false //one and captureTarget are mutually exclusive
                },
                allowed
              );
              if (out) {
                if (o.one)
                  return true;
                res.push(out);
              }
            }
          }
        }
      }
    }
    return (o.one ? false : res);
  }

  // Build a regular move from its initial and destination squares.
  // tr: transformation
  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.getColor(sx, sy);
    const initPiece = this.getPiece(sx, sy);
    const destColor = (this.board[ex][ey] != "" ? this.getColor(ex, ey) : "");
    let mv = new Move({
      appear: [],
      vanish: [],
      start: {x: sx, y: sy},
      end: {x: ex, y: ey}
    });
    if (
      !this.options["rifle"] ||
      this.board[ex][ey] == "" ||
      destColor == initColor //Recycle, Teleport
    ) {
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: !!tr ? tr.c : initColor,
          p: !!tr ? tr.p : initPiece
        })
      ];
      mv.vanish = [
        new PiPo({
          x: sx,
          y: sy,
          c: initColor,
          p: initPiece
        })
      ];
    }
    if (this.board[ex][ey] != "") {
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.getPiece(ex, ey)
        })
      );
      if (this.options["cannibal"] && destColor != initColor) {
        const lastIdx = mv.vanish.length - 1; //think "Rifle+Cannibal"
        let trPiece = mv.vanish[lastIdx].p;
        if (this.isKing(sx, sy))
          trPiece = C.CannibalKingCode[trPiece];
        if (mv.appear.length >= 1)
          mv.appear[0].p = trPiece;
        else if (this.options["rifle"]) {
          mv.appear.unshift(
            new PiPo({
              x: sx,
              y: sy,
              c: initColor,
              p: trPiece
            })
          );
          mv.vanish.unshift(
            new PiPo({
              x: sx,
              y: sy,
              c: initColor,
              p: initPiece
            })
          );
        }
      }
    }
    return mv;
  }

  // En-passant square, if any
  getEpSquare(moveOrSquare) {
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-")
        return undefined;
      return C.SquareToCoords(square);
    }
    // Argument is a move:
    const move = moveOrSquare;
    const s = move.start,
          e = move.end;
    if (
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      // Next conditions for variants like Atomic or Rifle, Recycle...
      (
        move.appear.length > 0 &&
        this.getPieceType(0, 0, move.appear[0].p) == 'p'
      )
      &&
      (
        move.vanish.length > 0 &&
        this.getPieceType(0, 0, move.vanish[0].p) == 'p'
      )
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined; //default
  }

  // Special case of en-passant captures: treated separately
  getEnpassantCaptures([x, y]) {
    const color = this.getColor(x, y);
    const shiftX = (color == 'w' ? -1 : 1);
    const oppCol = C.GetOppCol(color);
    if (
      this.epSquare &&
      this.epSquare.x == x + shiftX &&
      Math.abs(this.getY(this.epSquare.y - y)) == 1 &&
      // Doublemove (and Progressive?) guards:
      this.board[this.epSquare.x][this.epSquare.y] == "" &&
      this.getColor(x, this.epSquare.y) == oppCol
    ) {
      const [epx, epy] = [this.epSquare.x, this.epSquare.y];
      this.board[epx][epy] = oppCol + 'p';
      let enpassantMove = this.getBasicMove([x, y], [epx, epy]);
      this.board[epx][epy] = "";
      const lastIdx = enpassantMove.vanish.length - 1; //think Rifle
      enpassantMove.vanish[lastIdx].x = x;
      return [enpassantMove];
    }
    return [];
  }

  getCastleMoves([x, y], finalSquares, castleWith) {
    const c = this.getColor(x, y);

    // Castling ?
    const oppCol = C.GetOppCol(c);
    let moves = [];
    // King, then rook:
    finalSquares =
      finalSquares || [ [2, 3], [this.size.y - 2, this.size.y - 3] ];
    const castlingKing = this.getPiece(x, y);
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= this.size.y)
        continue;
      // If this code is reached, rook and king are on initial position

      // NOTE: in some variants this is not a rook
      const rookPos = this.castleFlags[c][castleSide];
      const castlingPiece = this.getPiece(x, rookPos);
      if (
        this.board[x][rookPos] == "" ||
        this.getColor(x, rookPos) != c ||
        (castleWith && !castleWith.includes(castlingPiece))
      ) {
        // Rook is not here, or changed color (see Benedict)
        continue;
      }
      // Nothing on the path of the king ? (and no checks)
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      let i = y;
      do {
        if (
          // NOTE: next weird test because underCheck() verification
          // will be executed in filterValid() later.
          (
            i != finalSquares[castleSide][0] &&
            this.underCheck([x, i], oppCol)
          )
          ||
          (
            this.board[x][i] != "" &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c || ![rookPos, y].includes(i))
          )
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);
      // Nothing on the path to the rook?
      step = (castleSide == 0 ? -1 : 1);
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != "")
          continue castlingCheck;
      }

      // Nothing on final squares, except maybe king and castling rook?
      for (i = 0; i < 2; i++) {
        if (
          finalSquares[castleSide][i] != rookPos &&
          this.board[x][finalSquares[castleSide][i]] != "" &&
          (
            finalSquares[castleSide][i] != y ||
            this.getColor(x, finalSquares[castleSide][i]) != c
          )
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is potentially valid
      moves.push(
        new Move({
          appear: [
            new PiPo({
              x: x,
              y: finalSquares[castleSide][0],
              p: castlingKing,
              c: c
            }),
            new PiPo({
              x: x,
              y: finalSquares[castleSide][1],
              p: castlingPiece,
              c: c
            })
          ],
          vanish: [
            // King might be initially disguised (Titan...)
            new PiPo({ x: x, y: y, p: castlingKing, c: c }),
            new PiPo({ x: x, y: rookPos, p: castlingPiece, c: c })
          ],
          end:
            Math.abs(y - rookPos) <= 2
              ? {x: x, y: rookPos}
              : {x: x, y: y + 2 * (castleSide == 0 ? -1 : 1)}
        })
      );
    }

    return moves;
  }

  ////////////////////
  // MOVES VALIDATION

  // Is piece (or square) at given position attacked by "oppCol" ?
  underAttack([x, y], oppCol) {
    // An empty square is considered as king,
    // since it's used only in getCastleMoves (TODO?)
    const king = this.board[x][y] == "" || this.isKing(x, y);
    return (
      (
        (!this.options["zen"] || king) &&
        this.findCapturesOn(
          [x, y],
          {
            byCol: [oppCol],
            segments: this.options["cylinder"],
            one: true
          }
        )
      )
      ||
      (
        (!!this.options["zen"] && !king) &&
        this.findDestSquares(
          [x, y],
          {
            attackOnly: true,
            segments: this.options["cylinder"],
            one: true
          },
          ([i1, j1], [i2, j2]) => this.getColor(i2, j2) == oppCol
        )
      )
    );
  }

  underCheck([x, y], oppCol) {
    if (this.options["taking"] || this.options["dark"])
      return false;
    return this.underAttack([x, y], oppCol);
  }

  // Stop at first king found (TODO: multi-kings)
  searchKingPos(color) {
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        if (this.getColor(i, j) == color && this.isKing(i, j))
          return [i, j];
      }
    }
    return [-1, -1]; //king not found
  }

  // 'color' arg because some variants (e.g. Refusal) check opponent moves
  filterValid(moves, color) {
    if (!color)
      color = this.turn;
    const oppCol = C.GetOppCol(color);
    const kingPos = this.searchKingPos(color);
    let filtered = {}; //avoid re-checking similar moves (promotions...)
    return moves.filter(m => {
      const key = m.start.x + m.start.y + '.' + m.end.x + m.end.y;
      if (!filtered[key]) {
        this.playOnBoard(m);
        let square = kingPos,
            res = true; //a priori valid
        if (m.vanish.some(v => this.isKing(0, 0, v.p) && v.c == color)) {
          // Search king in appear array:
          const newKingIdx =
            m.appear.findIndex(a => this.isKing(0, 0, a.p) && a.c == color);
          if (newKingIdx >= 0)
            square = [m.appear[newKingIdx].x, m.appear[newKingIdx].y];
          else
            res = false;
        }
        res &&= !this.underCheck(square, oppCol);
        this.undoOnBoard(m);
        filtered[key] = res;
        return res;
      }
      return filtered[key];
    });
  }

  /////////////////
  // MOVES PLAYING

  // Apply a move on board
  playOnBoard(move) {
    for (let psq of move.vanish)
      this.board[psq.x][psq.y] = "";
    for (let psq of move.appear)
      this.board[psq.x][psq.y] = psq.c + psq.p;
  }
  // Un-apply the played move
  undoOnBoard(move) {
    for (let psq of move.appear)
      this.board[psq.x][psq.y] = "";
    for (let psq of move.vanish)
      this.board[psq.x][psq.y] = psq.c + psq.p;
  }

  updateCastleFlags(move) {
    // Update castling flags if start or arrive from/at rook/king locations
    move.appear.concat(move.vanish).forEach(psq => {
      if (this.isKing(0, 0, psq.p))
        this.castleFlags[psq.c] = [this.size.y, this.size.y];
      // NOTE: not "else if" because king can capture enemy rook...
      let c = "";
      if (psq.x == 0)
        c = "b";
      else if (psq.x == this.size.x - 1)
        c = "w";
      if (c != "") {
        const fidx = this.castleFlags[c].findIndex(f => f == psq.y);
        if (fidx >= 0)
          this.castleFlags[c][fidx] = this.size.y;
      }
    });
  }

  prePlay(move) {
    if (
      this.hasCastle &&
      // If flags already off, no need to re-check:
      Object.values(this.castleFlags).some(cvals =>
        cvals.some(val => val < this.size.y))
    ) {
      this.updateCastleFlags(move);
    }
    if (this.options["crazyhouse"]) {
      move.vanish.forEach(v => {
        const square = C.CoordsToSquare({x: v.x, y: v.y});
        if (this.ispawn[square])
          delete this.ispawn[square];
      });
      if (move.appear.length > 0 && move.vanish.length > 0) {
        // Assumption: something is moving
        const initSquare = C.CoordsToSquare(move.start);
        const destSquare = C.CoordsToSquare(move.end);
        if (
          this.ispawn[initSquare] ||
          (move.vanish[0].p == 'p' && move.appear[0].p != 'p')
        ) {
          this.ispawn[destSquare] = true;
        }
        else if (
          this.ispawn[destSquare] &&
          this.getColor(move.end.x, move.end.y) != move.vanish[0].c
        ) {
          move.vanish[1].p = 'p';
          delete this.ispawn[destSquare];
        }
      }
    }
    const minSize = Math.min(move.appear.length, move.vanish.length);
    if (
      this.hasReserve &&
      // Warning; atomic pawn removal isn't a capture
      (!this.options["atomic"] || !this.rempawn || this.movesCount >= 1)
    ) {
      const color = this.turn;
      for (let i=minSize; i<move.appear.length; i++) {
        // Something appears = dropped on board (some exceptions, Chakart...)
        if (move.appear[i].c == color) {
          const piece = move.appear[i].p;
          this.updateReserve(color, piece, this.reserve[color][piece] - 1);
        }
      }
      for (let i=minSize; i<move.vanish.length; i++) {
        // Something vanish: add to reserve except if recycle & opponent
        if (
          this.options["crazyhouse"] ||
          (this.options["recycle"] && move.vanish[i].c == color)
        ) {
          const piece = move.vanish[i].p;
          this.updateReserve(color, piece, this.reserve[color][piece] + 1);
        }
      }
    }
  }

  play(move) {
    this.prePlay(move);
    if (this.hasEnpassant)
      this.epSquare = this.getEpSquare(move);
    this.playOnBoard(move);
    this.postPlay(move);
  }

  postPlay(move) {
    const color = this.turn;
    if (this.options["dark"])
      this.updateEnlightened();
    if (this.options["teleport"]) {
      if (
        this.subTurnTeleport == 1 &&
        move.vanish.length > move.appear.length &&
        move.vanish[1].c == color
      ) {
        const v = move.vanish[move.vanish.length - 1];
        this.captured = {x: v.x, y: v.y, c: v.c, p: v.p};
        this.subTurnTeleport = 2;
        return;
      }
      this.subTurnTeleport = 1;
      this.captured = null;
    }
    if (this.isLastMove(move)) {
      this.turn = C.GetOppCol(color);
      this.movesCount++;
      this.subTurn = 1;
    }
    else if (!move.next)
      this.subTurn++;
  }

  isLastMove(move) {
    if (move.next)
      return false;
    const color = this.turn;
    const oppKingPos = this.searchKingPos(C.GetOppCol(color));
    if (oppKingPos[0] < 0 || this.underCheck(oppKingPos, color))
      return true;
    return (
      (
        !this.options["balance"] ||
        ![1, 2].includes(this.movesCount) ||
        this.subTurn == 2
      )
      &&
      (
        !this.options["doublemove"] ||
        this.movesCount == 0 ||
        this.subTurn == 2
      )
      &&
      (
        !this.options["progressive"] ||
        this.subTurn == this.movesCount + 1
      )
    );
  }

  // "Stop at the first move found"
  atLeastOneMove(color) {
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.board[i][j] != "" && this.getColor(i, j) == color) {
          // NOTE: in fact searching for all potential moves from i,j.
          //       I don't believe this is an issue, for now at least.
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.some(m => this.filterValid([m]).length >= 1))
            return true;
        }
      }
    }
    if (this.hasReserve && this.reserve[color]) {
      for (let p of Object.keys(this.reserve[color])) {
        const moves = this.getDropMovesFrom([color, p]);
        if (moves.some(m => this.filterValid([m]).length >= 1))
          return true;
      }
    }
    return false;
  }

  // What is the score ? (Interesting if game is over)
  getCurrentScore(move) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    const kingPos = [this.searchKingPos(color), this.searchKingPos(oppCol)];
    if (kingPos[0][0] < 0 && kingPos[1][0] < 0)
      return "1/2";
    if (kingPos[0][0] < 0)
      return (color == "w" ? "0-1" : "1-0");
    if (kingPos[1][0] < 0)
      return (color == "w" ? "1-0" : "0-1");
    if (this.atLeastOneMove(color))
      return "*";
    // No valid move: stalemate or checkmate?
    if (!this.underCheck(kingPos[0], oppCol))
      return "1/2";
    // OK, checkmate
    return (color == "w" ? "0-1" : "1-0");
  }

  playVisual(move, r) {
    move.vanish.forEach(v => {
      this.g_pieces[v.x][v.y].remove();
      this.g_pieces[v.x][v.y] = null;
    });
    let chessboard =
      document.getElementById(this.containerId).querySelector(".chessboard");
    if (!r)
      r = chessboard.getBoundingClientRect();
    const pieceWidth = this.getPieceWidth(r.width);
    move.appear.forEach(a => {
      this.g_pieces[a.x][a.y] = document.createElement("piece");
      C.AddClass_es(this.g_pieces[a.x][a.y],
                    this.pieces(a.c, a.x, a.y)[a.p]["class"]);
      this.g_pieces[a.x][a.y].classList.add(C.GetColorClass(a.c));
      this.g_pieces[a.x][a.y].style.width = pieceWidth + "px";
      this.g_pieces[a.x][a.y].style.height = pieceWidth + "px";
      const [ip, jp] = this.getPixelPosition(a.x, a.y, r);
      // Translate coordinates to use chessboard as reference:
      this.g_pieces[a.x][a.y].style.transform =
        `translate(${ip - r.x}px,${jp - r.y}px)`;
      if (this.enlightened && !this.enlightened[a.x][a.y])
        this.g_pieces[a.x][a.y].classList.add("hidden");
      chessboard.appendChild(this.g_pieces[a.x][a.y]);
    });
    if (this.options["dark"])
      this.graphUpdateEnlightened();
  }

  // TODO: send stack receive stack, or allow incremental? (good/bad points)
  buildMoveStack(move, r) {
    this.moveStack.push(move);
    this.computeNextMove(move);
    this.play(move);
    const newTurn = this.turn;
    if (this.moveStack.length == 1)
      this.playVisual(move, r);
    if (move.next) {
      this.gameState = {
        fen: this.getFen(),
        board: JSON.parse(JSON.stringify(this.board)) //easier
      };
      this.buildMoveStack(move.next, r);
    }
    else {
      if (this.moveStack.length == 1) {
        // Usual case (one normal move)
        this.afterPlay(this.moveStack, newTurn, {send: true, res: true});
        this.moveStack = []
      }
      else {
        this.afterPlay(this.moveStack, newTurn, {send: true, res: false});
        this.re_initFromFen(this.gameState.fen, this.gameState.board);
        this.playReceivedMove(this.moveStack.slice(1), () => {
          this.afterPlay(this.moveStack, newTurn, {send: false, res: true});
          this.moveStack = []
        });
      }
    }
  }

  // Implemented in variants using (automatic) moveStack
  computeNextMove(move) {}

  animateMoving(start, end, drag, segments, cb) {
    let initPiece = this.getDomPiece(start.x, start.y);
    // NOTE: cloning often not required, but light enough, and simpler
    let movingPiece = initPiece.cloneNode();
    initPiece.style.opacity = "0";
    let container =
      document.getElementById(this.containerId)
    const r = container.querySelector(".chessboard").getBoundingClientRect();
    if (typeof start.x == "string") {
      // Need to bound width/height (was 100% for reserve pieces)
      const pieceWidth = this.getPieceWidth(r.width);
      movingPiece.style.width = pieceWidth + "px";
      movingPiece.style.height = pieceWidth + "px";
    }
    const maxDist = this.getMaxDistance(r);
    const apparentColor = this.getColor(start.x, start.y);
    const pieces = this.pieces(apparentColor, start.x, start.y);
    if (drag) {
      const startCode = this.getPiece(start.x, start.y);
      C.RemoveClass_es(movingPiece, pieces[startCode]["class"]);
      C.AddClass_es(movingPiece, pieces[drag.p]["class"]);
      if (apparentColor != drag.c) {
        movingPiece.classList.remove(C.GetColorClass(apparentColor));
        movingPiece.classList.add(C.GetColorClass(drag.c));
      }
    }
    container.appendChild(movingPiece);
    const animateSegment = (index, cb) => {
      // NOTE: move.drag could be generalized per-segment (usage?)
      const [i1, j1] = segments[index][0];
      const [i2, j2] = segments[index][1];
      const dep = this.getPixelPosition(i1, j1, r);
      const arr = this.getPixelPosition(i2, j2, r);
      movingPiece.style.transitionDuration = "0s";
      movingPiece.style.transform = `translate(${dep[0]}px, ${dep[1]}px)`;
      const distance =
        Math.sqrt((arr[0] - dep[0]) ** 2 + (arr[1] - dep[1]) ** 2);
      const duration = 0.2 + (distance / maxDist) * 0.3;
      // TODO: unclear why we need this new delay below:
      setTimeout(() => {
        movingPiece.style.transitionDuration = duration + "s";
        // movingPiece is child of container: no need to adjust coordinates
        movingPiece.style.transform = `translate(${arr[0]}px, ${arr[1]}px)`;
        setTimeout(cb, duration * 1000);
      }, 50);
    };
    let index = 0;
    const animateSegmentCallback = () => {
      if (index < segments.length)
        animateSegment(index++, animateSegmentCallback);
      else {
        movingPiece.remove();
        initPiece.style.opacity = "1";
        cb();
      }
    };
    animateSegmentCallback();
  }

  // Input array of objects with at least fields x,y (e.g. PiPo)
  animateFading(arr, cb) {
    const animLength = 350; //TODO: 350ms? More? Less?
    arr.forEach(v => {
      let fadingPiece = this.getDomPiece(v.x, v.y);
      fadingPiece.style.transitionDuration = (animLength / 1000) + "s";
      fadingPiece.style.opacity = "0";
    });
    setTimeout(cb, animLength);
  }

  animate(move, callback) {
    if (this.noAnimate || move.noAnimate) {
      callback();
      return;
    }
    let segments = move.segments;
    if (!segments)
      segments = [ [[move.start.x, move.start.y], [move.end.x, move.end.y]] ];
    let targetObj = new TargetObj(callback);
    if (move.start.x != move.end.x || move.start.y != move.end.y) {
      targetObj.target++;
      this.animateMoving(move.start, move.end, move.drag, segments,
                         () => targetObj.increment());
    }
    if (move.vanish.length > move.appear.length) {
      const arr = move.vanish.slice(move.appear.length)
        // Ignore disappearing pieces hidden by some appearing ones:
        .filter(v => move.appear.every(a => a.x != v.x || a.y != v.y));
      if (arr.length > 0) {
        targetObj.target++;
        this.animateFading(arr, () => targetObj.increment());
      }
    }
    targetObj.target +=
      this.customAnimate(move, segments, () => targetObj.increment());
    if (targetObj.target == 0)
      callback();
  }

  // Potential other animations (e.g. for Suction variant)
  customAnimate(move, segments, cb) {
    return 0; //nb of targets
  }

  playReceivedMove(moves, callback) {
    const launchAnimation = () => {
      const r = container.querySelector(".chessboard").getBoundingClientRect();
      const animateRec = i => {
        this.animate(moves[i], () => {
          this.play(moves[i]);
          this.playVisual(moves[i], r);
          if (i < moves.length - 1)
            setTimeout(() => animateRec(i+1), 300);
          else
            callback();
        });
      };
      animateRec(0);
    };
    // Delay if user wasn't focused:
    const checkDisplayThenAnimate = (delay) => {
      if (container.style.display == "none") {
        alert("New move! Let's go back to game...");
        document.getElementById("gameInfos").style.display = "none";
        container.style.display = "block";
        setTimeout(launchAnimation, 700);
      }
      else
        setTimeout(launchAnimation, delay || 0);
    };
    let container = document.getElementById(this.containerId);
    if (document.hidden) {
      document.onvisibilitychange = () => {
        document.onvisibilitychange = undefined;
        checkDisplayThenAnimate(700);
      };
    }
    else
      checkDisplayThenAnimate();
  }

};
