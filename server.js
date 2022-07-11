const params = require("./parameters.js");
const WebSocket = require("ws");
const wss = new WebSocket.Server({
  port: params.socket_port,
  path: params.socket_path
});

let challenges = {}; //variantName --> socketId, name
let games = {}; //gameId --> gameInfo (vname, fen, players, options, time)
let sockets = {}; //socketId --> socket
const variants = require("./variants.js");
const Crypto = require("crypto");
const randstrSize = 8;

function send(sid, code, data) {
  const socket = sockets[sid];
  // If a player deletes local infos and then tries to resume a game,
  // sockets[oppSid] will probably not exist anymore:
  if (socket)
    socket.send(JSON.stringify(Object.assign({code: code}, data)));
}

function initializeGame(vname, players, options) {
  const gid =
    Crypto.randomBytes(randstrSize).toString("hex").slice(0, randstrSize);
  games[gid] = {
    vname: vname,
    players: players,
    options: options,
    time: Date.now(),
    moveHash: {} //set of moves hashes seen so far
  };
  return gid;
}

// Provide seed in case of, so that both players initialize with same FEN
function launchGame(gid) {
  const gameInfo = Object.assign(
    {seed: Math.floor(Math.random() * 19840), gid: gid},
    games[gid]
  );
  // players array is supposed to be full:
  for (const p of games[gid].players)
    send(p.sid, "gamestart", gameInfo);
}

function getRandomVariant() {
  // Pick a variant at random in the list
  const index = Math.floor(Math.random() * variants.length);
  return variants[index].name;
}

wss.on("connection", (socket, req) => {
  const sid = req.url.split("=")[1]; //...?sid=...
  sockets[sid] = socket;
  socket.isAlive = true;
  socket.on("pong", () => socket.isAlive = true);
  if (params.dev == true) {
    const chokidar = require("chokidar");
    const watcher = chokidar.watch(
      ["*.js", "*.css", "utils/", "variants/"],
      {persistent: true});
    watcher.on("change", path => send(sid, "filechange", {path: path}));
  }
  socket.on("message", (msg) => {
    const obj = JSON.parse(msg);
    switch (obj.code) {
      // Send challenge (may trigger game creation)
      case "seekgame": {
        let oppIndex = undefined, //variant name
            choice = undefined; //variant finally played
        const vname = obj.vname, //variant requested
              randvar = (obj.vname == "_random");
        if (vname == "_random") {
          // Pick any current challenge if possible
          const currentChalls = Object.keys(challenges);
          if (currentChalls.length >= 1) {
            choice =
              currentChalls[Math.floor(Math.random() * currentChalls.length)];
            oppIndex = choice;
          }
        }
        else if (challenges[vname]) {
          // Anyone wanting to play the same variant ?
          choice = vname;
          oppIndex = vname;
        }
        else if (challenges["_random"]) {
          // Anyone accepting any variant (including vname) ?
          choice = vname;
          oppIndex = "_random";
        }
        if (oppIndex) {
          if (choice == "_random")
            choice = getRandomVariant();
          // Launch game
          let players = [
            {sid: sid, name: obj.name, randvar: randvar},
            Object.assign({}, challenges[oppIndex])
          ];
          delete challenges[oppIndex];
          if (Math.random() < 0.5)
            players = players.reverse();
          // Empty options = default
          launchGame( initializeGame(choice, players, {}) );
        }
        else
          // Place challenge and wait. 'randvar' indicate if we play anything
          challenges[vname] = {sid: sid, name: obj.name, randvar: randvar};
        break;
      }
      // Set FEN after game was created (received twice)
      case "setfen":
        games[obj.gid].fen = obj.fen;
        break;
      // Send back game informations
      case "getgame":
        if (!games[obj.gid])
          send(sid, "nogame");
        else
          send(sid, "gameinfo", games[obj.gid]);
        break;
      // Cancel challenge
      case "cancelseek":
        delete challenges[obj.vname];
        break;
      // Receive rematch
      case "rematch":
        if (!games[obj.gid])
          send(sid, "closerematch");
        else {
          const myIndex = (games[obj.gid].players[0].sid == sid ? 0 : 1);
          if (!games[obj.gid].rematch)
            games[obj.gid].rematch = [0, 0];
          games[obj.gid].rematch[myIndex] = !obj.random ? 1 : 2;
          if (games[obj.gid].rematch[1-myIndex]) {
            // Launch new game, colors reversed
            let vname = games[obj.gid].vname;
            const allrand = games[obj.gid].rematch.every(r => r == 2);
            if (allrand)
              vname = getRandomVariant();
            games[obj.gid].players.forEach(p => p.randvar = allrand);
            const gid = initializeGame(vname,
                                       games[obj.gid].players.reverse(),
                                       games[obj.gid].options);
            launchGame(gid);
          }
        }
        break;
      // Rematch cancellation
      case "norematch":
        if (games[obj.gid]) {
          const myIndex = (games[obj.gid].players[0].sid == sid ? 0 : 1);
          send(games[obj.gid].players[1-myIndex].sid, "closerematch");
        }
        break;
      // Create game vs. friend
      case "creategame": {
        let players = [
          {sid: obj.player.sid, name: obj.player.name},
          undefined
        ];
        if (
          obj.player.color == 'b' ||
          (obj.player.color == '' && Math.random() < 0.5)
        ) {
          players = players.reverse();
        }
        // Incomplete players array: do not start game yet
        const gid = initializeGame(obj.vname, players, obj.options);
        send(sid, "gamecreated", {gid: gid});
        // If nobody joins within 3 minutes, delete game
        setTimeout(
          () => {
            if (games[gid] && games[gid].players.some(p => !p))
              delete games[gid];
          },
          3 * 60000
        );
        break;
      }
      // Join game vs. friend
      case "joingame":
        if (!games[obj.gid])
          send(sid, "jointoolate");
        else {
          const emptySlot = games[obj.gid].players.findIndex(p => !p);
          if (emptySlot < 0)
            send(sid, "jointoolate");
          else {
            // Join a game (started by some other player)
            games[obj.gid].players[emptySlot] = {sid: sid, name: obj.name};
            launchGame(obj.gid);
          }
        }
        break;
      // Relay a move + update games object
      case "newmove":
        // NOTE: still potential racing issues, but... fingers crossed
        const hash = Crypto.createHash("md5")
                     .update(JSON.stringify(obj.fen))
                     .digest("hex");
        if (games[obj.gid].moveHash[hash])
          break;
        games[obj.gid].moveHash[hash] = true;
        games[obj.gid].fen = obj.fen;
        games[obj.gid].time = Date.now(); //update useful if verrry slow game
        const playingWhite = (games[obj.gid].players[0].sid == sid);
        const oppSid = games[obj.gid].players[playingWhite ? 1 : 0].sid;
        send(oppSid, "newmove", {moves: obj.moves});
        break;
      // Relay "game ends" message
      case "gameover":
        if (obj.relay) {
          const playingWhite = (games[obj.gid].players[0].sid == sid);
          const oppSid = games[obj.gid].players[playingWhite ? 1 : 0].sid;
          send(oppSid, "gameover", { gid: obj.gid });
        }
        // 2 minutes timeout for rematch:
        setTimeout(() => delete games[obj.gid], 2 * 60000);
        break;
    }
  });
  socket.on("close", () => {
    delete sockets[sid];
    for (const [key, value] of Object.entries(challenges)) {
      if (value.sid == sid) {
        delete challenges[key];
        break; //only one challenge per player
      }
    }
    for (let g of Object.values(games)) {
      const myIndex = g.players.findIndex(p => p && p.sid == sid);
      if (myIndex >= 0) {
        if (g.rematch && g.rematch[myIndex] > 0) g.rematch[myIndex] = 0;
        break; //only one game per player
      }
    }
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false)
      return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Every 24 hours, scan games and remove if last move older than 24h
const dayInMillisecs = 24 * 60 * 60 * 1000;
const killOldGames = setInterval(() => {
  const now = Date.now();
  Object.keys(games).forEach(gid => {
    if (now - games[gid].time >= dayInMillisecs)
      delete games[gid];
  });
}, dayInMillisecs);

// TODO: useful code here?
wss.on("close", () => {
  clearInterval(heartbeat);
  clearInterval(killOldGames);
});
