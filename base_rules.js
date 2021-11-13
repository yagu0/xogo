import { Random } from "/utils/alea.js";
import { ArrayFun } from "/utils/array.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

// NOTE: x coords: top to bottom (white perspective); y: left to right
export default class ChessRules {

  /////////////////////////
  // VARIANT SPECIFICATIONS

  // Some variants have specific options, like the number of pawns in Monster,
  // or the board size for Pandemonium.
  // Users can generally select a randomness level from 0 to 2.
  static get Options() {
    return {
      // NOTE: some options are required for FEN generation, some aren't.
      select: [{
        label: "Randomness",
        variable: "randomness",
        defaut: 0,
        options: [
          { label: "Deterministic", value: 0 },
          { label: "Symmetric random", value: 1 },
          { label: "Asymmetric random", value: 2 }
        ]
      }],
      check: [{
        label: "Capture king?",
        defaut: false,
        variable: "taking"
      }],
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

  // Pawns specifications
  get pawnSpecs() {
    return {
      directions: { 'w': -1, 'b': 1 },
      initShift: { w: 1, b: 1 },
      twoSquares: true,
      threeSquares: false,
      canCapture: true,
      captureBackward: false,
      bidirectional: false,
      promotions: ['r', 'n', 'b', 'q']
    };
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

  get noAnimate() {
    return !!this.options["dark"];
  }

  // Some variants use click infos:
  doClick([x, y]) {
    if (typeof x != "number") return null; //click on reserves
    if (
      this.options["teleport"] && this.subTurn == 2 &&
      this.board[x][y] == ""
    ) {
      return new Move({
        start: {x: this.captured.x, y: this.captured.y},
        appear: [
          new PiPo({
            x: x,
            y: y,
            c: this.captured.c, //this.turn,
            p: this.captured.p
          })
        ],
        vanish: []
      });
    }
    return null;
  }

  ////////////////////
  // COORDINATES UTILS

  // 3 --> d (column number to letter)
  static CoordToColumn(colnum) {
    return String.fromCharCode(97 + colnum);
  }

  // d --> 3 (column letter to number)
  static ColumnToCoord(columnStr) {
    return columnStr.charCodeAt(0) - 97;
  }

  // 7 (numeric) --> 1 (str) [from black viewpoint].
  static CoordToRow(rownum) {
    return rownum;
  }

  // NOTE: wrong row index (1 should be 7 ...etc). But OK for the usage.
  static RowToCoord(rownumStr) {
    // NOTE: 30 is way more than enough (allow up to 29 rows on one character)
    return parseInt(rownumStr, 30);
  }

  // a2 --> {x:2,y:0} (this is in fact a6)
  static SquareToCoords(sq) {
    return {
      x: ChessRules.RowToCoord(sq[1]),
      // NOTE: column is always one char => max 26 columns
      y: ChessRules.ColumnToCoord(sq[0])
    };
  }

  // {x:0,y:4} --> e0 (should be e8)
  static CoordsToSquare(coords) {
    return (
      ChessRules.CoordToColumn(coords.y) + ChessRules.CoordToRow(coords.x)
    );
  }

  coordsToId([x, y]) {
    if (typeof x == "number")
      return `${this.containerId}|sq-${x.toString(30)}-${y.toString(30)}`;
    // Reserve :
    return `${this.containerId}|rsq-${x}-${y}`;
  }

  idToCoords(targetId) {
    if (!targetId) return null; //outside page, maybe...
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
      return [ parseInt(squares[1], 30), parseInt(squares[2], 30) ];
    // squares[0] == "rsq" : reserve, 'c' + 'p' (letters)
    return [squares[1], squares[2]];
  }

  /////////////
  // FEN UTILS

  // Turn "wb" into "B" (for FEN)
  board2fen(b) {
    return b[0] == "w" ? b[1].toUpperCase() : b[1];
  }

  // Turn "p" into "bp" (for board)
  fen2board(f) {
    return f.charCodeAt(0) <= 90 ? "w" + f.toLowerCase() : "b" + f;
  }

  // Setup the initial random-or-not (asymmetric-or-not) position
  genRandInitFen(seed) {
    Random.setSeed(seed);

    let fen, flags = "0707";
    if (this.options.randomness == 0 || !this.options.randomness)
      // Deterministic:
      fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0";

    else {
      // Randomize
      let pieces = { w: new Array(8), b: new Array(8) };
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
    if (this.hasFlags) parts.push(`"flags":"${flags}"`);
    if (this.hasEnpassant) parts.push('"enpassant":"-"');
    if (this.hasReserve) parts.push('"reserve":"000000000000"');
    if (this.options["crazyhouse"]) parts.push('"ispawn":"-"');
    if (parts.length >= 1) fen += " {" + parts.join(",") + "}";
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
    if (fenParts.length > 3) res = Object.assign(res, JSON.parse(fenParts[3]));
    return res;
  }

  // Return current fen (game state)
  getFen() {
    let fen = (
      this.getBaseFen() + " " +
      this.getTurnFen() + " " +
      this.movesCount
    );
    let parts = [];
    if (this.hasFlags) parts.push(`"flags":"${this.getFlagsFen()}"`);
    if (this.hasEnpassant)
      parts.push(`"enpassant":"${this.getEnpassantFen()}"`);
    if (this.hasReserve) parts.push(`"reserve":"${this.getReserveFen()}"`);
    if (this.options["crazyhouse"])
      parts.push(`"ispawn":"${this.getIspawnFen()}"`);
    if (parts.length >= 1) fen += " {" + parts.join(",") + "}";
    return fen;
  }

  // Position part of the FEN string
  getBaseFen() {
    const format = (count) => {
      // if more than 9 consecutive free spaces, break the integer,
      // otherwise FEN parsing will fail.
      if (count <= 9) return count;
      // Most boards of size < 18:
      if (count <= 18) return "9" + (count - 9);
      // Except Gomoku:
      return "99" + (count - 18);
    };
    let position = "";
    for (let i = 0; i < this.size.y; i++) {
      let emptyCount = 0;
      for (let j = 0; j < this.size.x; j++) {
        if (this.board[i][j] == "") emptyCount++;
        else {
          if (emptyCount > 0) {
            // Add empty squares in-between
            position += format(emptyCount);
            emptyCount = 0;
          }
          position += this.board2fen(this.board[i][j]);
        }
      }
      if (emptyCount > 0)
        // "Flush remainder"
        position += format(emptyCount);
      if (i < this.size.y - 1) position += "/"; //separate rows
    }
    return position;
  }

  getTurnFen() {
    return this.turn;
  }

  // Flags part of the FEN string
  getFlagsFen() {
    return ["w", "b"].map(c => {
      return this.castleFlags[c].map(x => x.toString(30)).join("");
    }).join("");
  }

  // Enpassant part of the FEN string
  getEnpassantFen() {
    if (!this.epSquare) return "-"; //no en-passant
    return ChessRules.CoordsToSquare(this.epSquare);
  }

  getReserveFen() {
    return (
      ["w","b"].map(c => Object.values(this.reserve[c]).join("")).join("")
    );
  }

  getIspawnFen() {
    const coords = Object.keys(this.ispawn);
    if (coords.length == 0) return "-";
    return coords.map(ChessRules.CoordsToSquare).join(",");
  }

  // Set flags from fen (castle: white a,h then black a,h)
  setFlags(fenflags) {
    this.castleFlags = {
      w: [0, 1].map(i => parseInt(fenflags.charAt(i), 30)),
      b: [2, 3].map(i => parseInt(fenflags.charAt(i), 30))
    };
  }

  //////////////////
  // INITIALIZATION

  // Fen string fully describes the game state
  constructor(o) {
    this.options = o.options;
    this.playerColor = o.color;
    this.afterPlay = o.afterPlay;

    // FEN-related:
    if (!o.fen) o.fen = this.genRandInitFen(o.seed);
    const fenParsed = this.parseFen(o.fen);
    this.board = this.getBoard(fenParsed.position);
    this.turn = fenParsed.turn;
    this.movesCount = parseInt(fenParsed.movesCount, 10);
    this.setOtherVariables(fenParsed);

    // Graphical (can use variables defined above)
    this.containerId = o.element;
    this.graphicalInit();
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
        if (!isNaN(num)) j += num;
        // Else: something at position i,j
        else board[i][j++] = this.fen2board(character);
      }
    }
    return board;
  }

  // Some additional variables from FEN (variant dependant)
  setOtherVariables(fenParsed) {
    // Set flags and enpassant:
    if (this.hasFlags) this.setFlags(fenParsed.flags);
    if (this.hasEnpassant)
      this.epSquare = this.getEpSquare(fenParsed.enpassant);
    if (this.hasReserve) this.initReserves(fenParsed.reserve);
    if (this.options["crazyhouse"]) this.initIspawn(fenParsed.ispawn);
    this.subTurn = 1; //may be unused
    if (this.options["teleport"]) this.captured = null;
    if (this.options["dark"]) {
      this.enlightened = ArrayFun.init(this.size.x, this.size.y);
      // Setup enlightened: squares reachable by player side
      this.updateEnlightened(false);
    }
  }

  updateEnlightened(withGraphics) {
    let newEnlightened = ArrayFun.init(this.size.x, this.size.y, false);
    const pawnShift = { w: -1, b: 1 };
    // Add pieces positions + all squares reachable by moves (includes Zen):
    // (watch out special pawns case)
    for (let x=0; x<this.size.x; x++) {
      for (let y=0; y<this.size.y; y++) {
        if (this.board[x][y] != "" && this.getColor(x, y) == this.playerColor)
        {
          newEnlightened[x][y] = true;
          const piece = this.getPiece(x, y);
          if (piece == ChessRules.PAWN) {
            // Attacking squares wouldn't be highlighted if no captures:
            this.pieces(this.playerColor)[piece].attack.forEach(step => {
              const [i, j] = [x + step[0], this.computeY(y + step[1])];
              if (this.onBoard(i, j) && this.board[i][j] == "")
                newEnlightened[i][j] = true;
            });
          }
          this.getPotentialMovesFrom([x, y]).forEach(m => {
            newEnlightened[m.end.x][m.end.y] = true;
          });
        }
      }
    }
    if (this.epSquare) this.enlightEnpassant(newEnlightened);
    if (withGraphics) this.graphUpdateEnlightened(newEnlightened);
    this.enlightened = newEnlightened;
  }

  // Include en-passant capturing square if any:
  enlightEnpassant(newEnlightened) {
    const steps = this.pieces(this.playerColor)[ChessRules.PAWN].attack;
    for (let step of steps) {
      const x = this.epSquare.x - step[0],
            y = this.computeY(this.epSquare.y - step[1]);
      if (
        this.onBoard(x, y) &&
        this.getColor(x, y) == this.playerColor &&
        this.getPiece(x, y) == ChessRules.PAWN
      ) {
        newEnlightened[x][this.epSquare.y] = true;
        break;
      }
    }
  }

  // Apply diff this.enlightened --> newEnlightened on board
  graphUpdateEnlightened(newEnlightened) {
    let container = document.getElementById(this.containerId);
    const r = container.getBoundingClientRect();
    const pieceWidth = this.getPieceWidth(r.width);
    for (let x=0; x<this.size.x; x++) {
      for (let y=0; y<this.size.y; y++) {
        if (this.enlightened[x][y] && !newEnlightened[x][y]) {
          let elt = document.getElementById(this.coordsToId([x, y]));
          elt.classList.add("in-shadow");
          if (this.g_pieces[x][y]) {
            this.g_pieces[x][y].remove();
            this.g_pieces[x][y] = null;
          }
        }
        else if (!this.enlightened[x][y] && newEnlightened[x][y]) {
          let elt = document.getElementById(this.coordsToId([x, y]));
          elt.classList.remove("in-shadow");
          if (this.board[x][y] != "") {
            const piece = this.getPiece(x, y);
            const color = this.getColor(x, y);
            this.g_pieces[x][y] = document.createElement("piece");
            let newClasses = [
              this.pieces()[piece]["class"],
              color == "w" ? "white" : "black"
            ];
            newClasses.forEach(cl => this.g_pieces[x][y].classList.add(cl));
            this.g_pieces[x][y].style.width = pieceWidth + "px";
            this.g_pieces[x][y].style.height = pieceWidth + "px";
            const [ip, jp] = this.getPixelPosition(x, y, r);
            this.g_pieces[x][y].style.transform =
              `translate(${ip}px,${jp}px)`;
            container.appendChild(this.g_pieces[x][y]);
          }
        }
      }
    }
  }

  // ordering p,r,n,b,q,k (most general + count in base 30 if needed)
  initReserves(reserveStr) {
    const counts = reserveStr.split("").map(c => parseInt(c, 30));
    this.reserve = { w: {}, b: {} };
    const pieceName = Object.keys(this.pieces());
    for (let i of ArrayFun.range(12)) {
      if (i < 6) this.reserve['w'][pieceName[i]] = counts[i];
      else this.reserve['b'][pieceName[i-6]] = counts[i];
    }
  }

  initIspawn(ispawnStr) {
    if (ispawnStr != "-") {
      this.ispawn = ispawnStr.split(",").map(ChessRules.SquareToCoords)
                    .reduce((o, key) => ({ ...o, [key]: true}), {});
    }
    else this.ispawn = {};
  }

  getNbReservePieces(color) {
    return (
      Object.values(this.reserve[color]).reduce(
        (oldV,newV) => oldV + (newV > 0 ? 1 : 0), 0)
    );
  }

  //////////////
  // VISUAL PART

  getPieceWidth(rwidth) {
    return (rwidth / this.size.y);
  }

  getSquareWidth(rwidth) {
    return this.getPieceWidth(rwidth);
  }

  getReserveSquareSize(rwidth, nbR) {
    const sqSize = this.getSquareWidth(rwidth);
    return Math.min(sqSize, rwidth / nbR);
  }

  getReserveNumId(color, piece) {
    return `${this.containerId}|rnum-${color}${piece}`;
  }

  graphicalInit() {
    // NOTE: not window.onresize = this.re_drawBoardElts because scope (this)
    window.onresize = () => this.re_drawBoardElements();
    this.re_drawBoardElements();
    this.initMouseEvents();
    const container = document.getElementById(this.containerId);
    new ResizeObserver(this.rescale).observe(container);
  }

  re_drawBoardElements() {
    const board = this.getSvgChessboard();
    const oppCol = ChessRules.GetOppCol(this.playerColor);
    let container = document.getElementById(this.containerId);
    container.innerHTML = "";
    container.insertAdjacentHTML('beforeend', board);
    let cb = container.querySelector("#" + this.containerId + "_SVG");
    const aspectRatio = this.size.y / this.size.x;
    // Compare window ratio width / height to aspectRatio:
    const windowRatio = window.innerWidth / window.innerHeight;
    let cbWidth, cbHeight;
    if (windowRatio <= aspectRatio) {
      // Limiting dimension is width:
      cbWidth = Math.min(window.innerWidth, 767);
      cbHeight = cbWidth / aspectRatio;
    }
    else {
      // Limiting dimension is height:
      cbHeight = Math.min(window.innerHeight, 767);
      cbWidth = cbHeight * aspectRatio;
    }
    if (this.reserve) {
      const sqSize = cbWidth / this.size.y;
      // NOTE: allocate space for reserves (up/down) even if they are empty
      if ((window.innerHeight - cbHeight) / 2 < sqSize + 5) {
        cbHeight = window.innerHeight - 2 * (sqSize + 5);
        cbWidth = cbHeight * aspectRatio;
      }
    }
    container.style.width = cbWidth + "px";
    container.style.height = cbHeight + "px";
    // Center chessboard:
    const spaceLeft = (window.innerWidth - cbWidth) / 2,
          spaceTop = (window.innerHeight - cbHeight) / 2;
    container.style.left = spaceLeft + "px";
    container.style.top = spaceTop + "px";
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
    const [sizeX, sizeY] = [this.size.x, this.size.y];
    const flipped = (this.playerColor == 'b');
    let board = `
      <svg
        viewBox="0 0 80 80"
        version="1.1"
        id="${this.containerId}_SVG">
      <g>`;
    for (let i=0; i < sizeX; i++) {
      for (let j=0; j < sizeY; j++) {
        const ii = (flipped ? this.size.x - 1 - i : i);
        const jj = (flipped ? this.size.y - 1 - j : j);
        let classes = this.getSquareColorClass(ii, jj);
        if (this.enlightened && !this.enlightened[ii][jj])
          classes += " in-shadow";
        // NOTE: x / y reversed because coordinates system is reversed.
        board += `<rect
          class="${classes}"
          id="${this.coordsToId([ii, jj])}"
          width="10"
          height="10"
          x="${10*j}"
          y="${10*i}" />`;
      }
    }
    board += "</g></svg>";
    return board;
  }

  // Generally light square bottom-right; TODO: user-defined colors at least
  getSquareColorClass(i, j) {
    return ((i+j) % 2 == 0 ? "light-square": "dark-square");
  }

  setupPieces(r) {
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
    else this.g_pieces = ArrayFun.init(this.size.x, this.size.y, null);
    let container = document.getElementById(this.containerId);
    if (!r) r = container.getBoundingClientRect();
    const pieceWidth = this.getPieceWidth(r.width);
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          (!this.options["dark"] || this.enlightened[i][j])
        ) {
          const piece = this.getPiece(i, j);
          const color = this.getColor(i, j);
          this.g_pieces[i][j] = document.createElement("piece");
          this.g_pieces[i][j].classList.add(this.pieces()[piece]["class"]);
          this.g_pieces[i][j].classList.add(color == "w" ? "white" : "black");
          this.g_pieces[i][j].style.width = pieceWidth + "px";
          this.g_pieces[i][j].style.height = pieceWidth + "px";
          const [ip, jp] = this.getPixelPosition(i, j, r);
          this.g_pieces[i][j].style.transform = `translate(${ip}px,${jp}px)`;
          container.appendChild(this.g_pieces[i][j]);
        }
      }
    }
    if (this.reserve) this.re_drawReserve(['w', 'b'], r);
  }

  // NOTE: assume !!this.reserve
  re_drawReserve(colors, r) {
    if (this.r_pieces) {
      // Remove (old) reserve pieces
      for (let c of colors) {
        if (!this.reserve[c]) continue;
        Object.keys(this.reserve[c]).forEach(p => {
          if (this.r_pieces[c][p]) {
            this.r_pieces[c][p].remove();
            delete this.r_pieces[c][p];
            const numId = this.getReserveNumId(c, p);
            document.getElementById(numId).remove();
          }
        });
        let reservesDiv = document.getElementById("reserves_" + c);
        if (reservesDiv) reservesDiv.remove();
      }
    }
    else this.r_pieces = { 'w': {}, 'b': {} };
    if (!r) {
      const container = document.getElementById(this.containerId);
      r = container.getBoundingClientRect();
    }
    const epsilon = 1e-4; //fix display bug on Firefox at least
    for (let c of colors) {
      if (!this.reserve[c]) continue;
      const nbR = this.getNbReservePieces(c);
      if (nbR == 0) continue;
      const sqResSize = this.getReserveSquareSize(r.width, nbR);
      let ridx = 0;
      const vShift = (c == this.playerColor ? r.height + 5 : -sqResSize - 5);
      const [i0, j0] = [r.x, r.y + vShift];
      let rcontainer = document.createElement("div");
      rcontainer.id = "reserves_" + c;
      rcontainer.classList.add("reserves");
      rcontainer.style.left = i0 + "px";
      rcontainer.style.top = j0 + "px";
      rcontainer.style.width = (nbR * sqResSize) + "px";
      rcontainer.style.height = sqResSize + "px";
      document.getElementById("boardContainer").appendChild(rcontainer);
      for (let p of Object.keys(this.reserve[c])) {
        if (this.reserve[c][p] == 0) continue;
        let r_cell = document.createElement("div");
        r_cell.id = this.coordsToId([c, p]);
        r_cell.classList.add("reserve-cell");
        r_cell.style.width = (sqResSize - epsilon) + "px";
        r_cell.style.height = (sqResSize - epsilon) + "px";
        rcontainer.appendChild(r_cell);
        let piece = document.createElement("piece");
        const pieceSpec = this.pieces(c)[p];
        piece.classList.add(pieceSpec["class"]);
        piece.classList.add(c == 'w' ? "white" : "black");
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
    const oldCount = this.reserve[color][piece];
    this.reserve[color][piece] = count;
    // Redrawing is much easier if count==0
    if ([oldCount, count].includes(0)) this.re_drawReserve([color]);
    else {
      const numId = this.getReserveNumId(color, piece);
      document.getElementById(numId).textContent = count;
    }
  }

  // After resize event: no need to destroy/recreate pieces
  rescale() {
    let container = document.getElementById(this.containerId);
    if (!container) return; //useful at initial loading
    const r = container.getBoundingClientRect();
    const newRatio = r.width / r.height;
    const aspectRatio = this.size.y / this.size.x;
    let newWidth = r.width,
        newHeight = r.height;
    if (newRatio > aspectRatio) {
      newWidth = r.height * aspectRatio;
      container.style.width = newWidth + "px";
    }
    else if (newRatio < aspectRatio) {
      newHeight = r.width / aspectRatio;
      container.style.height = newHeight + "px";
    }
    const newX = (window.innerWidth - newWidth) / 2;
    container.style.left = newX + "px";
    const newY = (window.innerHeight - newHeight) / 2;
    container.style.top = newY + "px";
    const newR = { x: newX, y: newY, width: newWidth, height: newHeight };
    const pieceWidth = this.getPieceWidth(newWidth);
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        if (this.board[i][j] != "") {
          // NOTE: could also use CSS transform "scale"
          this.g_pieces[i][j].style.width = pieceWidth + "px";
          this.g_pieces[i][j].style.height = pieceWidth + "px";
          const [ip, jp] = this.getPixelPosition(i, j, newR);
          this.g_pieces[i][j].style.transform = `translate(${ip}px,${jp}px)`;
        }
      }
    }
    if (this.reserve) this.rescaleReserve(newR);
  }

  rescaleReserve(r) {
    const epsilon = 1e-4;
    for (let c of ['w','b']) {
      if (!this.reserve[c]) continue;
      const nbR = this.getNbReservePieces(c);
      if (nbR == 0) continue;
      // Resize container first
      const sqResSize = this.getReserveSquareSize(r.width, nbR);
      const vShift = (c == this.playerColor ? r.height + 5 : -sqResSize - 5);
      const [i0, j0] = [r.x, r.y + vShift];
      let rcontainer = document.getElementById("reserves_" + c);
      rcontainer.style.left = i0 + "px";
      rcontainer.style.top = j0 + "px";
      rcontainer.style.width = (nbR * sqResSize) + "px";
      rcontainer.style.height = sqResSize + "px";
      // And then reserve cells:
      const rpieceWidth = this.getReserveSquareSize(r.width, nbR);
      Object.keys(this.reserve[c]).forEach(p => {
        if (this.reserve[c][p] == 0) return;
        let r_cell = document.getElementById(this.coordsToId([c, p]));
        r_cell.style.width = (sqResSize - epsilon) + "px";
        r_cell.style.height = (sqResSize - epsilon) + "px";
      });
    }
  }

  // Return the absolute pixel coordinates given current position.
  // Our coordinate system differs from CSS one (x <--> y).
  // We return here the CSS coordinates (more useful).
  getPixelPosition(i, j, r) {
    const sqSize = this.getSquareWidth(r.width);
    if (i < 0 || j < 0) return [0, 0]; //piece vanishes
    const flipped = (this.playerColor == 'b');
    const x = (flipped ? this.size.y - 1 - j : j) * sqSize;
    const y = (flipped ? this.size.x - 1 - i : i) * sqSize;
    return [x, y];
  }

  initMouseEvents() {
    let container = document.getElementById(this.containerId);

    const getOffset = e => {
      if (e.clientX) return {x: e.clientX, y: e.clientY}; //Mouse
      let touchLocation = null;
      if (e.targetTouches && e.targetTouches.length >= 1)
        // Touch screen, dragstart
        touchLocation = e.targetTouches[0];
      else if (e.changedTouches && e.changedTouches.length >= 1)
        // Touch screen, dragend
        touchLocation = e.changedTouches[0];
      if (touchLocation)
        return {x: touchLocation.pageX, y: touchLocation.pageY};
      return [0, 0]; //Big trouble here =)
    }

    const centerOnCursor = (piece, e) => {
      const centerShift = sqSize / 2;
      const offset = getOffset(e);
      piece.style.left = (offset.x - centerShift) + "px";
      piece.style.top = (offset.y - centerShift) + "px";
    }

    let start = null,
        r = null,
        startPiece, curPiece = null,
        sqSize;
    const mousedown = (e) => {
      r = container.getBoundingClientRect();
      sqSize = this.getSquareWidth(r.width);
      const square = this.idToCoords(e.target.id);
      if (square) {
        const [i, j] = square;
        const move = this.doClick([i, j]);
        if (move) this.playPlusVisual(move);
        else {
          if (typeof i != "number") startPiece = this.r_pieces[i][j];
          else if (this.g_pieces[i][j]) startPiece = this.g_pieces[i][j];
          if (startPiece && this.canIplay(i, j)) {
            e.preventDefault();
            start = { x: i, y: j };
            curPiece = startPiece.cloneNode();
            curPiece.style.transform = "none";
            curPiece.style.zIndex = 5;
            curPiece.style.width = sqSize + "px";
            curPiece.style.height = sqSize + "px";
            centerOnCursor(curPiece, e);
            document.getElementById("boardContainer").appendChild(curPiece);
            startPiece.style.opacity = "0.4";
            container.style.cursor = "none";
          }
        }
      }
    };

    const mousemove = (e) => {
      if (start) {
        e.preventDefault();
        centerOnCursor(curPiece, e);
      }
    };

    const mouseup = (e) => {
      const newR = container.getBoundingClientRect();
      if (newR.width != r.width || newR.height != r.height) {
        this.rescale();
        return;
      }
      if (!start) return;
      const [x, y] = [start.x, start.y];
      start = null;
      e.preventDefault();
      container.style.cursor = "pointer";
      startPiece.style.opacity = "1";
      const offset = getOffset(e);
      const landingElt = document.elementFromPoint(offset.x, offset.y);
      const sq = this.idToCoords(landingElt.id);
      if (sq) {
        const [i, j] = sq;
        // NOTE: clearly suboptimal, but much easier, and not a big deal.
        const potentialMoves = this.getPotentialMovesFrom([x, y])
          .filter(m => m.end.x == i && m.end.y == j);
        const moves = this.filterValid(potentialMoves);
        if (moves.length >= 2) this.showChoices(moves, r);
        else if (moves.length == 1) this.playPlusVisual(moves[0], r);
      }
      curPiece.remove();
    };

    if ('onmousedown' in window) {
      document.addEventListener("mousedown", mousedown);
      document.addEventListener("mousemove", mousemove);
      document.addEventListener("mouseup", mouseup);
    }
    if ('ontouchstart' in window) {
      document.addEventListener("touchstart", mousedown);
      document.addEventListener("touchmove", mousemove);
      document.addEventListener("touchend", mouseup);
    }
  }

  showChoices(moves, r) {
    let container = document.getElementById(this.containerId);
    let choices = document.createElement("div");
    choices.id = "choices";
    choices.style.width = r.width + "px";
    choices.style.height = r.height + "px";
    choices.style.left = r.x + "px";
    choices.style.top = r.y + "px";
    container.style.opacity = "0.5";
    let boardContainer = document.getElementById("boardContainer");
    boardContainer.appendChild(choices);
    const squareWidth = this.getSquareWidth(r.width);
    const firstUpLeft = (r.width - (moves.length * squareWidth)) / 2;
    const firstUpTop = (r.height - squareWidth) / 2;
    const color = moves[0].appear[0].c;
    const callback = (m) => {
      container.style.opacity = "1";
      boardContainer.removeChild(choices);
      this.playPlusVisual(m, r);
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
      const pieceSpec = this.pieces(color)[moves[i].appear[0].p];
      piece.classList.add(pieceSpec["class"]);
      piece.classList.add(color == 'w' ? "white" : "black");
      piece.style.width = "100%";
      piece.style.height = "100%";
      choice.appendChild(piece);
      choices.appendChild(choice);
    }
  }

  //////////////
  // BASIC UTILS

  get size() {
    return { "x": 8, "y": 8 };
  }

  // Color of thing on square (i,j). 'undefined' if square is empty
  getColor(i, j) {
    return this.board[i][j].charAt(0);
  }

  // Piece type on square (i,j). 'undefined' if square is empty
  getPiece(i, j) {
    return this.board[i][j].charAt(1);
  }

  // Get opponent color
  static GetOppCol(color) {
    return (color == "w" ? "b" : "w");
  }

  // Can thing on square1 take thing on square2
  canTake([x1, y1], [x2, y2]) {
    return (
      (
        (this.options["recycle"] || this.options["teleport"]) &&
        this.getPiece(x2, y2) != ChessRules.KING
      ) ||
      (this.getColor(x1, y1) !== this.getColor(x2, y2))
    );
  }

  // Is (x,y) on the chessboard?
  onBoard(x, y) {
    return x >= 0 && x < this.size.x && y >= 0 && y < this.size.y;
  }

  // Used in interface: 'side' arg == player color
  canIplay(x, y) {
    return (
      this.playerColor == this.turn &&
      (
        (typeof x == "number" && this.getColor(x, y) == this.turn) ||
        (typeof x == "string" && x == this.turn) //reserve
      )
    );
  }

  ////////////////////////
  // PIECES SPECIFICATIONS

  pieces(color) {
    const pawnShift = (color == "w" ? -1 : 1);
    return {
      'p': {
        "class": "pawn",
        steps: [[pawnShift, 0]],
        range: 1,
        attack: [[pawnShift, 1], [pawnShift, -1]]
      },
      // rook
      'r': {
        "class": "rook",
        steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]
      },
      // knight
      'n': {
        "class": "knight",
        steps: [
          [1, 2], [1, -2], [-1, 2], [-1, -2],
          [2, 1], [-2, 1], [2, -1], [-2, -1]
        ],
        range: 1
      },
      // bishop
      'b': {
        "class": "bishop",
        steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      },
      // queen
      'q': {
        "class": "queen",
        steps: [
          [0, 1], [0, -1], [1, 0], [-1, 0],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]
      },
      // king
      'k': {
        "class": "king",
        steps: [
          [0, 1], [0, -1], [1, 0], [-1, 0],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
        ],
        range: 1
      }
    };
  }

  // Some pieces codes (for a clearer code)
  static get PAWN() {
    return "p";
  }
  static get QUEEN() {
    return "q";
  }
  static get KING() {
    return "k";
  }

  ////////////////////
  // MOVES GENERATION

  // For Cylinder: get Y coordinate
  computeY(y) {
    if (!this.options["cylinder"]) return y;
    let res = y % this.size.y;
    if (res < 0) res += this.size.y;
    return res;
  }

  // Stop at the first capture found
  atLeastOneCapture(color) {
    color = color || this.turn;
    const oppCol = ChessRules.GetOppCol(color);
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.board[i][j] != "" && this.getColor(i, j) == color) {
          const specs = this.pieces(color)[this.getPiece(i, j)];
          const steps = specs.attack || specs.steps;
          outerLoop: for (let step of steps) {
            let [ii, jj] = [i + step[0], this.computeY(j + step[1])];
            let stepCounter = 1;
            while (this.onBoard(ii, jj) && this.board[ii][jj] == "") {
              if (specs.range <= stepCounter++) continue outerLoop;
              ii += step[0];
              jj = this.computeY(jj + step[1]);
            }
            if (
              this.onBoard(ii, jj) &&
              this.getColor(ii, jj) == oppCol &&
              this.filterValid(
                [this.getBasicMove([i, j], [ii, jj])]
              ).length >= 1
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  getDropMovesFrom([c, p]) {
    // NOTE: by design, this.reserve[c][p] >= 1 on user click
    // (but not necessarily otherwise)
    if (!this.reserve[c][p] || this.reserve[c][p] == 0) return [];
    let moves = [];
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        // TODO: rather simplify this "if" and add post-condition: more general
        if (
          this.board[i][j] == "" &&
          (!this.options["dark"] || this.enlightened[i][j]) &&
          (
            p != ChessRules.PAWN ||
            (c == 'w' && i < this.size.x - 1) ||
            (c == 'b' && i > 0)
          )
        ) {
          moves.push(
            new Move({
              start: {x: c, y: p},
              end: {x: i, y: j},
              appear: [new PiPo({x: i, y: j, c: c, p: p})],
              vanish: []
            })
          );
        }
      }
    }
    return moves;
  }

  // All possible moves from selected square
  getPotentialMovesFrom(sq, color) {
    if (typeof sq[0] == "string") return this.getDropMovesFrom(sq);
    if (this.options["madrasi"] && this.isImmobilized(sq)) return [];
    const piece = this.getPiece(sq[0], sq[1]);
    let moves;
    if (piece == ChessRules.PAWN) moves = this.getPotentialPawnMoves(sq);
    else moves = this.getPotentialMovesOf(piece, sq);
    if (
      piece == ChessRules.KING &&
      this.hasCastle &&
      this.castleFlags[color || this.turn].some(v => v < this.size.y)
    ) {
      Array.prototype.push.apply(moves, this.getCastleMoves(sq));
    }
    return this.postProcessPotentialMoves(moves);
  }

  postProcessPotentialMoves(moves) {
    if (moves.length == 0) return [];
    const color = this.getColor(moves[0].start.x, moves[0].start.y);
    const oppCol = ChessRules.GetOppCol(color);

    if (this.options["capture"] && this.atLeastOneCapture()) {
      // Filter out non-capturing moves (not using m.vanish because of
      // self captures of Recycle and Teleport).
      moves = moves.filter(m => {
        return (
          this.board[m.end.x][m.end.y] != "" &&
          this.getColor(m.end.x, m.end.y) == oppCol
        );
      });
    }

    if (this.options["atomic"]) {
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
          for (let step of steps) {
            let x = m.end.x + step[0];
            let y = this.computeY(m.end.y + step[1]);
            if (
              this.onBoard(x, y) &&
              this.board[x][y] != "" &&
              this.getPiece(x, y) != ChessRules.PAWN
            ) {
              m.vanish.push(
                new PiPo({
                  p: this.getPiece(x, y),
                  c: this.getColor(x, y),
                  x: x,
                  y: y
                })
              );
            }
          }
          if (!this.options["rifle"]) m.appear.pop(); //nothin appears
        }
      });
    }
    return moves;
  }

  // For Madrasi:
  // (redefined in Baroque etc, where Madrasi condition doesn't make sense)
  isImmobilized([x, y]) {
    const color = this.getColor(x, y);
    const oppCol = ChessRules.GetOppCol(color);
    const piece = this.getPiece(x, y);
    const stepSpec = this.pieces(color)[piece];
    let [steps, range] = [stepSpec.attack || stepSpec.steps, stepSpec.range];
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], y + step[1]];
      let stepCounter = 1;
      while (this.onBoard(i, j) && this.board[i][j] == "") {
        if (range <= stepCounter++) continue outerLoop;
        i += step[0];
        j = this.computeY(j + step[1]);
      }
      if (
        this.onBoard(i, j) &&
        this.getColor(i, j) == oppCol &&
        this.getPiece(i, j) == piece
      ) {
        return true;
      }
    }
    return false;
  }

  // Generic method to find possible moves of "sliding or jumping" pieces
  getPotentialMovesOf(piece, [x, y]) {
    const color = this.getColor(x, y);
    const stepSpec = this.pieces(color)[piece];
    let [steps, range] = [stepSpec.steps, stepSpec.range];
    let moves = [];
    let explored = {}; //for Cylinder mode
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], this.computeY(y + step[1])];
      let stepCounter = 1;
      while (
        this.onBoard(i, j) &&
        this.board[i][j] == "" &&
        !explored[i + "." + j]
      ) {
        explored[i + "." + j] = true;
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (range <= stepCounter++) continue outerLoop;
        i += step[0];
        j = this.computeY(j + step[1]);
      }
      if (
        this.onBoard(i, j) &&
        (
          !this.options["zen"] ||
          this.getPiece(i, j) == ChessRules.KING ||
          this.getColor(i, j) == color //OK for Recycle and Teleport
        ) &&
        this.canTake([x, y], [i, j]) &&
        !explored[i + "." + j]
      ) {
        explored[i + "." + j] = true;
        moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    if (this.options["zen"])
      Array.prototype.push.apply(moves, this.getZenCaptures(x, y));
    return moves;
  }

  getZenCaptures(x, y) {
    let moves = [];
    // Find reverse captures (opponent takes)
    const color = this.getColor(x, y);
    const oppCol = ChessRules.GetOppCol(color);
    const pieces = this.pieces(oppCol);
    Object.keys(pieces).forEach(p => {
      if (p == ChessRules.KING) return; //king isn't captured this way
      const steps = pieces[p].attack || pieces[p].steps;
      const range = pieces[p].range;
      steps.forEach(s => {
        // From x,y: revert step
        let [i, j] = [x - s[0], this.computeY(y - s[1])];
        let stepCounter = 1;
        while (this.onBoard(i, j) && this.board[i][j] == "") {
          if (range <= stepCounter++) return;
          i -= s[0];
          j = this.computeY(j - s[1]);
        }
        if (
          this.onBoard(i, j) &&
          this.getPiece(i, j) == p &&
          this.getColor(i, j) == oppCol && //condition for Recycle & Teleport
          this.canTake([i, j], [x, y])
        ) {
          if (this.getPiece(x, y) != ChessRules.PAWN)
            moves.push(this.getBasicMove([x, y], [i, j]));
          else this.addPawnMoves([x, y], [i, j], moves);
        }
      });
    });
    return moves;
  }

  // Build a regular move from its initial and destination squares.
  // tr: transformation
  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.getColor(sx, sy);
    const initPiece = this.board[sx][sy].charAt(1);
    const destColor = (this.board[ex][ey] != "" ? this.getColor(ex, ey) : "");
    let mv = new Move({
      appear: [],
      vanish: [],
      start: {x:sx, y:sy},
      end: {x:ex, y:ey}
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
          p: this.board[ex][ey].charAt(1)
        })
      );
      if (this.options["rifle"])
        // Rifle captures are tricky in combination with Atomic etc,
        // so it's useful to mark the move :
        mv.capture = true;
      if (this.options["cannibal"] && destColor != initColor) {
        const lastIdx = mv.vanish.length - 1;
        if (mv.appear.length >= 1) mv.appear[0].p = mv.vanish[lastIdx].p;
        else if (this.options["rifle"]) {
          mv.appear.unshift(
            new PiPo({
              x: sx,
              y: sy,
              c: initColor,
              p: mv.vanish[lastIdx].p
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
      if (square == "-") return undefined;
      return ChessRules.SquareToCoords(square);
    }
    // Argument is a move:
    const move = moveOrSquare;
    const s = move.start,
          e = move.end;
    if (
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      // Next conditions for variants like Atomic or Rifle, Recycle...
      (move.appear.length > 0 && move.appear[0].p == ChessRules.PAWN) &&
      (move.vanish.length > 0 && move.vanish[0].p == ChessRules.PAWN)
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined; //default
  }

  // Special case of en-passant captures: treated separately
  getEnpassantCaptures([x, y], shiftX) {
    const color = this.getColor(x, y);
    const oppCol = ChessRules.GetOppCol(color);
    let enpassantMove = null;
    if (
      !!this.epSquare &&
      this.epSquare.x == x + shiftX &&
      Math.abs(this.computeY(this.epSquare.y - y)) == 1 &&
      this.getColor(x, this.epSquare.y) == oppCol //Doublemove guard...
    ) {
      const [epx, epy] = [this.epSquare.x, this.epSquare.y];
      this.board[epx][epy] = oppCol + "p";
      enpassantMove = this.getBasicMove([x, y], [epx, epy]);
      this.board[epx][epy] = "";
      const lastIdx = enpassantMove.vanish.length - 1; //think Rifle
      enpassantMove.vanish[lastIdx].x = x;
    }
    return !!enpassantMove ? [enpassantMove] : [];
  }

  // Consider all potential promotions:
  addPawnMoves([x1, y1], [x2, y2], moves, promotions) {
    let finalPieces = [ChessRules.PAWN];
    const color = this.getColor(x1, y1);
    const lastRank = (color == "w" ? 0 : this.size.x - 1);
    if (x2 == lastRank && (!this.options["rifle"] || this.board[x2][y2] == ""))
    {
      // promotions arg: special override for Hiddenqueen variant
      if (promotions) finalPieces = promotions;
      else if (this.pawnSpecs.promotions)
        finalPieces = this.pawnSpecs.promotions;
    }
    for (let piece of finalPieces) {
      const tr = (piece != ChessRules.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  // What are the pawn moves from square x,y ?
  getPotentialPawnMoves([x, y], promotions) {
    const color = this.getColor(x, y); //this.turn doesn't work for Dark mode
    const [sizeX, sizeY] = [this.size.x, this.size.y];
    const pawnShiftX = this.pawnSpecs.directions[color];
    const firstRank = (color == "w" ? sizeX - 1 : 0);
    const forward = (color == 'w' ? -1 : 1);

    // Pawn movements in shiftX direction:
    const getPawnMoves = (shiftX) => {
      let moves = [];
      // NOTE: next condition is generally true (no pawn on last rank)
      if (x + shiftX >= 0 && x + shiftX < sizeX) {
        if (this.board[x + shiftX][y] == "") {
          // One square forward (or backward)
          this.addPawnMoves([x, y], [x + shiftX, y], moves, promotions);
          // Next condition because pawns on 1st rank can generally jump
          if (
            this.pawnSpecs.twoSquares &&
            (
              (
                color == 'w' &&
                x >= this.size.x - 1 - this.pawnSpecs.initShift['w']
              )
              ||
              (color == 'b' && x <= this.pawnSpecs.initShift['b'])
            )
          ) {
            if (
              shiftX == forward &&
              this.board[x + 2 * shiftX][y] == ""
            ) {
              // Two squares jump
              moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
              if (
                this.pawnSpecs.threeSquares &&
                this.board[x + 3 * shiftX, y] == ""
              ) {
                // Three squares jump
                moves.push(this.getBasicMove([x, y], [x + 3 * shiftX, y]));
              }
            }
          }
        }
        // Captures
        if (this.pawnSpecs.canCapture) {
          for (let shiftY of [-1, 1]) {
            const yCoord = this.computeY(y + shiftY);
            if (yCoord >= 0 && yCoord < sizeY) {
              if (
                this.board[x + shiftX][yCoord] != "" &&
                this.canTake([x, y], [x + shiftX, yCoord]) &&
                (
                  !this.options["zen"] ||
                  this.getPiece(x + shiftX, yCoord) == ChessRules.KING
                )
              ) {
                this.addPawnMoves(
                  [x, y], [x + shiftX, yCoord],
                  moves, promotions
                );
              }
              if (
                this.pawnSpecs.captureBackward && shiftX == forward &&
                x - shiftX >= 0 && x - shiftX < this.size.x &&
                this.board[x - shiftX][yCoord] != "" &&
                this.canTake([x, y], [x - shiftX, yCoord]) &&
                (
                  !this.options["zen"] ||
                  this.getPiece(x + shiftX, yCoord) == ChessRules.KING
                )
              ) {
                this.addPawnMoves(
                  [x, y], [x - shiftX, yCoord],
                  moves, promotions
                );
              }
            }
          }
        }
      }
      return moves;
    }

    let pMoves = getPawnMoves(pawnShiftX);
    if (this.pawnSpecs.bidirectional)
      pMoves = pMoves.concat(getPawnMoves(-pawnShiftX));

    if (this.hasEnpassant) {
      // NOTE: backward en-passant captures are not considered
      // because no rules define them (for now).
      Array.prototype.push.apply(
        pMoves,
        this.getEnpassantCaptures([x, y], pawnShiftX)
      );
    }

    if (this.options["zen"])
      Array.prototype.push.apply(pMoves, this.getZenCaptures(x, y));

    return pMoves;
  }

  // "castleInCheck" arg to let some variants castle under check
  getCastleMoves([x, y], finalSquares, castleInCheck, castleWith) {
    const c = this.getColor(x, y);

    // Castling ?
    const oppCol = ChessRules.GetOppCol(c);
    let moves = [];
    // King, then rook:
    finalSquares =
      finalSquares || [ [2, 3], [this.size.y - 2, this.size.y - 3] ];
    const castlingKing = this.board[x][y].charAt(1);
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= this.size.y) continue;
      // If this code is reached, rook and king are on initial position

      // NOTE: in some variants this is not a rook
      const rookPos = this.castleFlags[c][castleSide];
      const castlingPiece = this.board[x][rookPos].charAt(1);
      if (
        this.board[x][rookPos] == "" ||
        this.getColor(x, rookPos) != c ||
        (!!castleWith && !castleWith.includes(castlingPiece))
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
          (!castleInCheck && this.underCheck([x, i], oppCol)) ||
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
        if (this.board[x][i] != "") continue castlingCheck;
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

      // If this code is reached, castle is valid
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
              ? { x: x, y: rookPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
  }

  ////////////////////
  // MOVES VALIDATION

  // Is (king at) given position under check by "color" ?
  underCheck([x, y], color) {
    if (this.taking || this.options["dark"]) return false;
    color = color || ChessRules.GetOppCol(this.getColor(x, y));
    const pieces = this.pieces(color);
    return Object.keys(pieces).some(p => {
      return this.isAttackedBy([x, y], p, color, pieces[p]);
    });
  }

  isAttackedBy([x, y], piece, color, stepSpec) {
    const steps = stepSpec.attack || stepSpec.steps;
    const range = stepSpec.range;
    let explored = {}; //for Cylinder mode
    outerLoop: for (let step of steps) {
      let rx = x - step[0],
          ry = this.computeY(y - step[1]);
      let stepCounter = 1;
      while (
        this.onBoard(rx, ry) &&
        this.board[rx][ry] == "" &&
        !explored[rx + "." + ry]
      ) {
        explored[rx + "." + ry] = true;
        if (range <= stepCounter++) continue outerLoop;
        rx -= step[0];
        ry = this.computeY(ry - step[1]);
      }
      if (
        this.onBoard(rx, ry) &&
        this.board[rx][ry] != "" &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color &&
        (!this.options["madrasi"] || !this.isImmobilized([rx, ry]))
      ) {
        return true;
      }
    }
    return false;
  }

  // Stop at first king found (TODO: multi-kings)
  searchKingPos(color) {
    for (let i=0; i < this.size.x; i++) {
      for (let j=0; j < this.size.y; j++) {
        if (this.board[i][j] == color + 'k') return [i, j];
      }
    }
    return [-1, -1]; //king not found
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const oppCol = ChessRules.GetOppCol(color);
    if (this.options["balance"] && [1, 3].includes(this.movesCount)) {
      // Forbid moves either giving check or exploding opponent's king:
      const oppKingPos = this.searchKingPos(oppCol);
      moves = moves.filter(m => {
        if (
          m.vanish.some(v => v.c == oppCol && v.p == ChessRules.KING) &&
          m.appear.every(a => a.c != oppCol || a.p != ChessRUles.KING)
        )
          return false;
        this.playOnBoard(m);
        const res = !this.underCheck(oppKingPos, color);
        this.undoOnBoard(m);
        return res;
      });
    }
    if (this.taking || this.options["dark"]) return moves;
    const kingPos = this.searchKingPos(color);
    let filtered = {}; //avoid re-checking similar moves (promotions...)
    return moves.filter(m => {
      const key = m.start.x + m.start.y + '.' + m.end.x + m.end.y;
      if (!filtered[key]) {
        this.playOnBoard(m);
        let square = kingPos,
            res = true; //a priori valid
        if (m.vanish.some(v => v.p == ChessRules.KING && v.c == color)) {
          // Search king in appear array:
          const newKingIdx =
            m.appear.findIndex(a => a.p == ChessRules.KING && a.c == color);
          if (newKingIdx >= 0)
            square = [m.appear[newKingIdx].x, m.appear[newKingIdx].y];
          else res = false;
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

  // Aggregate flags into one object
  aggregateFlags() {
    return this.castleFlags;
  }

  // Reverse operation
  disaggregateFlags(flags) {
    this.castleFlags = flags;
  }

  // Apply a move on board
  playOnBoard(move) {
    for (let psq of move.vanish) this.board[psq.x][psq.y] = "";
    for (let psq of move.appear) this.board[psq.x][psq.y] = psq.c + psq.p;
  }
  // Un-apply the played move
  undoOnBoard(move) {
    for (let psq of move.appear) this.board[psq.x][psq.y] = "";
    for (let psq of move.vanish) this.board[psq.x][psq.y] = psq.c + psq.p;
  }

  updateCastleFlags(move) {
    // Update castling flags if start or arrive from/at rook/king locations
    move.appear.concat(move.vanish).forEach(psq => {
      if (
        this.board[psq.x][psq.y] != "" &&
        this.getPiece(psq.x, psq.y) == ChessRules.KING
      ) {
        this.castleFlags[psq.c] = [this.size.y, this.size.y];
      }
      // NOTE: not "else if" because king can capture enemy rook...
      let c = '';
      if (psq.x == 0) c = 'b';
      else if (psq.x == this.size.x - 1) c = 'w';
      if (c != '') {
        const fidx = this.castleFlags[c].findIndex(f => f == psq.y);
        if (fidx >= 0) this.castleFlags[c][fidx] = this.size.y;
      }
    });
  }

  prePlay(move) {
    if (
      typeof move.start.x == "number" &&
      (!this.options["teleport"] || this.subTurn == 1)
    ) {
      // OK, not a drop move
      if (
        this.hasCastle &&
        // If flags already off, no need to re-check:
        Object.keys(this.castleFlags).some(c => {
          return this.castleFlags[c].some(val => val < this.size.y)})
      ) {
        this.updateCastleFlags(move);
      }
      const initSquare = ChessRules.CoordsToSquare(move.start);
      if (
        this.options["crazyhouse"] &&
        (!this.options["rifle"] || !move.capture)
      ) {
        if (this.ispawn[initSquare]) {
          delete this.ispawn[initSquare];
          this.ispawn[ChessRules.CoordsToSquare(move.end)] = true;
        }
        else if (
          move.vanish[0].p == ChessRules.PAWN &&
          move.appear[0].p != ChessRules.PAWN
        ) {
          this.ispawn[ChessRules.CoordsToSquare(move.end)] = true;
        }
      }
    }
    const minSize = Math.min(move.appear.length, move.vanish.length);
    if (this.hasReserve) {
      const color = this.turn;
      for (let i=minSize; i<move.appear.length; i++) {
        // Something appears = dropped on board (some exceptions, Chakart...)
        const piece = move.appear[i].p;
        this.updateReserve(color, piece, this.reserve[color][piece] - 1);
      }
      for (let i=minSize; i<move.vanish.length; i++) {
        // Something vanish: add to reserve except if recycle & opponent
        const piece = move.vanish[i].p;
        if (this.options["crazyhouse"] || move.vanish[i].c == color)
          this.updateReserve(color, piece, this.reserve[color][piece] + 1);
      }
    }
  }

  play(move) {
    this.prePlay(move);
    if (this.hasEnpassant) this.epSquare = this.getEpSquare(move);
    this.playOnBoard(move);
    this.postPlay(move);
  }

  postPlay(move) {
    const color = this.turn;
    const oppCol = ChessRules.GetOppCol(color);
    if (this.options["dark"]) this.updateEnlightened(true);
    if (this.options["teleport"]) {
      if (
        this.subTurn == 1 &&
        move.vanish.length > move.appear.length &&
        move.vanish[move.vanish.length - 1].c == color
      ) {
        const v = move.vanish[move.vanish.length - 1];
        this.captured = {x: v.x, y: v.y, c: v.c, p: v.p};
        this.subTurn = 2;
        return;
      }
      this.captured = null;
    }
    if (this.options["balance"]) {
      if (![1, 3].includes(this.movesCount)) this.turn = oppCol;
    }
    else {
      if (
        (
          this.options["doublemove"] &&
          this.movesCount >= 1 &&
          this.subTurn == 1
        ) ||
        (this.options["progressive"] && this.subTurn <= this.movesCount)
      ) {
        const oppKingPos = this.searchKingPos(oppCol);
        if (oppKingPos[0] >= 0 && !this.underCheck(oppKingPos, color)) {
          this.subTurn++;
          return;
        }
      }
      this.turn = oppCol;
    }
    this.movesCount++;
    this.subTurn = 1;
  }

  // "Stop at the first move found"
  atLeastOneMove(color) {
    color = color || this.turn;
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.board[i][j] != "" && this.getColor(i, j) == color) {
          // TODO?: do not search all possible moves here
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.some(m => this.filterValid([m]).length >= 1)) return true;
        }
      }
    }
    if (this.hasReserve && this.reserve[color]) {
      for (let p of Object.keys(this.reserve[color])) {
        const moves = this.getDropMovesFrom([color, p]);
        if (moves.some(m => this.filterValid([m]).length >= 1)) return true;
      }
    }
    return false;
  }

  // What is the score ? (Interesting if game is over)
  getCurrentScore(move) {
    const color = this.turn;
    const oppCol = ChessRules.GetOppCol(color);
    const kingPos = [this.searchKingPos(color), this.searchKingPos(oppCol)];
    if (kingPos[0][0] < 0 && kingPos[1][0] < 0) return "1/2";
    if (kingPos[0][0] < 0) return (color == "w" ? "0-1" : "1-0");
    if (kingPos[1][0] < 0) return (color == "w" ? "1-0" : "0-1");
    if (this.atLeastOneMove()) return "*";
    // No valid move: stalemate or checkmate?
    if (!this.underCheck(kingPos, color)) return "1/2";
    // OK, checkmate
    return (color == "w" ? "0-1" : "1-0");
  }

  // NOTE: quite suboptimal for eg. Benedict (TODO?)
  playVisual(move, r) {
    move.vanish.forEach(v => {
      if (!this.enlightened || this.enlightened[v.x][v.y]) {
        this.g_pieces[v.x][v.y].remove();
        this.g_pieces[v.x][v.y] = null;
      }
    });
    let container = document.getElementById(this.containerId);
    if (!r) r = container.getBoundingClientRect();
    const pieceWidth = this.getPieceWidth(r.width);
    move.appear.forEach(a => {
      if (this.enlightened && !this.enlightened[a.x][a.y]) return;
      this.g_pieces[a.x][a.y] = document.createElement("piece");
      this.g_pieces[a.x][a.y].classList.add(this.pieces()[a.p]["class"]);
      this.g_pieces[a.x][a.y].classList.add(a.c == "w" ? "white" : "black");
      this.g_pieces[a.x][a.y].style.width = pieceWidth + "px";
      this.g_pieces[a.x][a.y].style.height = pieceWidth + "px";
      const [ip, jp] = this.getPixelPosition(a.x, a.y, r);
      this.g_pieces[a.x][a.y].style.transform = `translate(${ip}px,${jp}px)`;
      container.appendChild(this.g_pieces[a.x][a.y]);
    });
  }

  playPlusVisual(move, r) {
    this.playVisual(move, r);
    this.play(move);
    this.afterPlay(move); //user method
  }

  // Assumes reserve on top (usage case otherwise? TODO?)
  getReserveShift(c, p, r) {
    let nbR = 0,
        ridx = 0;
    for (let pi of Object.keys(this.reserve[c])) {
      if (this.reserve[c][pi] == 0) continue;
      if (pi == p) ridx = nbR;
      nbR++;
    }
    const rsqSize = this.getReserveSquareSize(r.width, nbR);
    return [ridx * rsqSize, rsqSize]; //slightly inaccurate... TODO?
  }

  animate(move, callback) {
    if (this.noAnimate) {
      callback();
      return;
    }
    const [i1, j1] = [move.start.x, move.start.y];
    const dropMove = (typeof i1 == "string");
    const startArray = (dropMove ? this.r_pieces : this.g_pieces);
    let startPiece = startArray[i1][j1];
    let container = document.getElementById(this.containerId);
    const clonePiece = (
      !dropMove &&
      this.options["rifle"] ||
      (this.options["teleport"] && this.subTurn == 2)
    );
    if (clonePiece) {
      startPiece = startPiece.cloneNode();
      if (this.options["rifle"]) startArray[i1][j1].style.opacity = "0";
      if (this.options["teleport"] && this.subTurn == 2) {
        const pieces = this.pieces();
        const startCode = (dropMove ? j1 : this.getPiece(i1, j1));
        startPiece.classList.remove(pieces[startCode]["class"]);
        startPiece.classList.add(pieces[this.captured.p]["class"]);
        // Color: OK
      }
      container.appendChild(startPiece);
    }
    const [i2, j2] = [move.end.x, move.end.y];
    let startCoords;
    if (dropMove) {
      startCoords = [
        i1 == this.playerColor ? this.size.x : 0,
        this.size.y / 2 //not trying to be accurate here... (TODO?)
      ];
    }
    else startCoords = [i1, j1];
    const r = container.getBoundingClientRect();
    const arrival = this.getPixelPosition(i2, j2, r); //TODO: arrival on drop?
    let rs = [0, 0];
    if (dropMove) rs = this.getReserveShift(i1, j1, r);
    const distance =
      Math.sqrt((startCoords[0] - i2) ** 2 + (startCoords[1] - j2) ** 2);
    const maxDist = Math.sqrt((this.size.x - 1)** 2 + (this.size.y - 1) ** 2);
    const multFact = (distance - 1) / (maxDist - 1); //1 == minDist
    const duration = 0.2 + multFact * 0.3;
    startPiece.style.transform =
      `translate(${arrival[0] + rs[0]}px, ${arrival[1] + rs[1]}px)`;
    startPiece.style.transitionDuration = duration + "s";
    setTimeout(
      () => {
        if (clonePiece) {
          if (this.options["rifle"]) startArray[i1][j1].style.opacity = "1";
          startPiece.remove();
        }
        callback();
      },
      duration * 1000
    );
  }

  playReceivedMove(moves, callback) {
    const launchAnimation = () => {
      const r =
        document.getElementById(this.containerId).getBoundingClientRect();
      const animateRec = i => {
        this.animate(moves[i], () => {
          this.playVisual(moves[i], r);
          this.play(moves[i]);
          if (i < moves.length - 1) setTimeout(() => animateRec(i+1), 300);
          else callback();
        });
      };
      animateRec(0);
    };
    const checkDisplayThenAnimate = () => {
      if (boardContainer.style.display == "none") {
        alert("New move! Let's go back to game...");
        document.getElementById("gameInfos").style.display = "none";
        boardContainer.style.display = "block";
        setTimeout(launchAnimation, 700);
      }
      else launchAnimation(); //focused user!
    };
    let boardContainer = document.getElementById("boardContainer");
    if (!document.hasFocus()) {
      window.onfocus = () => {
        window.onfocus = undefined;
        checkDisplayThenAnimate();
      };
    }
    else checkDisplayThenAnimate();
  }

};
