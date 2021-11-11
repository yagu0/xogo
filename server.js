const params = require("./parameters.js");
const WebSocket = require('ws');
const wss = new WebSocket.Server(
  {port: params.socket_port, path: params.socket_path});

let challenges = {}; //variantName --> socketId, name
let games = {}; //gameId --> gameInfo (vname, fen, players, options)
let sockets = {}; //socketId --> socket
const variants = require("./variants.js");

const send = (sid, code, data) => {
  const socket = sockets[sid];
  // If a player delete local infos and then try to resume a game,
  // sockets[oppSid] will probably not exist anymore:
  if (socket) socket.send(JSON.stringify(Object.assign({ code: code }, data)));
}

const Crypto = require('crypto')
function randomString(size = 8) {
  return Crypto.randomBytes(size).toString('hex').slice(0, size);
}

wss.on('connection', function connection(socket, req) {
  const sid = req.url.split("=")[1]; //...?sid=...
  sockets[sid] = socket;
  socket.isAlive = true;
  socket.on('pong', () => socket.isAlive = true);

  function launchGame(vname, players, options) {
    const gid = randomString(8);
    games[gid] = {
      vname: vname,
      players: players.map(p => {
                 return (!p ? null : {sid: p.sid, name: p.name});
               }),
      options: options
    };
    if (players.every(p => p)) {
      const gameInfo = Object.assign(
        // Provide seed so that both players initialize with same FEN
        {seed: Math.floor(Math.random() * 1984), gid: gid},
        games[gid]);
      for (let i of [0, 1]) {
        send(players[i].sid, "gamestart",
             Object.assign({randvar: players[i].randvar}, gameInfo));
      }
    }
    else {
      // Incomplete players array: do not start game yet
      send(sid, "gamecreated", {gid: gid});
      // If nobody joins within a minute, delete game
      setTimeout(
        () => {
          if (games[gid] && games[gid].players.some(p => !p))
            delete games[gid];
        },
        60000
      );
    }
  }

  socket.on('message', (msg) => {
    const obj = JSON.parse(msg);
    switch (obj.code) {
      // Send challenge (may trigger game creation)
      case "seekgame": {
        // Only one challenge per player:
        if (Object.keys(challenges).some(k => challenges[k].sid == sid))
          return;
        let opponent = undefined,
            choice = undefined;
        const vname = obj.vname,
              randvar = (obj.vname == "_random");
        if (vname == "_random") {
          // Pick any current challenge if any
          const currentChalls = Object.keys(challenges);
          if (currentChalls.length >= 1) {
            choice =
              currentChalls[Math.floor(Math.random() * currentChalls.length)];
            opponent = challenges[choice];
          }
        }
        else if (challenges[vname]) {
          opponent = challenges[vname];
          choice = vname;
        }
        if (opponent) {
          delete challenges[choice];
          if (choice == "_random") {
            // Pick a variant at random in the list
            const index = Math.floor(Math.random() * variants.length);
            choice = variants[index].name;
          }
          // Launch game
          let players = [
            {sid: sid, name: obj.name, randvar: randvar},
            opponent
          ];
          if (Math.random() < 0.5) players = players.reverse();
          launchGame(choice, players, {}); //empty options => default
        }
        else
          // Place challenge and wait. 'randvar' indicate if we play anything
          challenges[vname] = {sid: sid, name: obj.name, randvar: randvar};
        break;
      }
      // Set FEN after game was created
      case "setfen":
        games[obj.gid].fen = obj.fen;
        break;
      // Send back game informations
      case "getgame": {
        if (!games[obj.gid]) send(sid, "nogame");
        else send(sid, "gameinfo", games[obj.gid]);
        break;
      }
      // Cancel challenge
      case "cancelseek":
        delete challenges[obj.vname];
        break;
      // Receive rematch
      case "rematch": {
        if (!games[obj.gid]) send(sid, "closerematch");
        else {
          const myIndex = (games[obj.gid].players[0].sid == sid ? 0 : 1);
          if (!games[obj.gid].rematch) games[obj.gid].rematch = [false, false];
          games[obj.gid].rematch[myIndex] = true;
          if (games[obj.gid].rematch[1-myIndex]) {
            // Launch new game, colors reversed
            launchGame(games[obj.gid].vname,
                       games[obj.gid].players.reverse(),
                       games[obj.gid].options);
          }
        }
        break;
      }
        // Rematch cancellation
      case "norematch": {
        if (games[obj.gid]) {
          const myIndex = (games[obj.gid].players[0].sid == sid ? 0 : 1);
          send(games[obj.gid].players[1-myIndex].sid, "closerematch");
        }
        break;
      }
      // Create game vs. friend
      case "creategame":
        let players = [
          { sid: obj.player.sid, name: obj.player.name },
          undefined
        ];
        if (
          obj.player.color == 'b' ||
          (obj.player.color == '' && Math.random() < 0.5)
        ) {
          players = players.reverse();
        }
        launchGame(obj.vname, players, obj.options);
        break;
      // Join game vs. friend
      case "joingame": {
        if (!games[obj.gid]) send(sid, "jointoolate");
        else {
          // Join a game (started by some other player)
          const emptySlot = games[obj.gid].players.findIndex(p => !p);
          if (emptySlot < 0) send(sid, "jointoolate");
          games[obj.gid].players[emptySlot] = {sid: sid, name: obj.name};
          const gameInfo = Object.assign(
            // Provide seed so that both players initialize with same FEN
            {seed: Math.floor(Math.random()*1984), gid: obj.gid},
            games[obj.gid]);
          for (let i of [0, 1])
            send(games[obj.gid].players[i].sid, "gamestart", gameInfo);
        }
        break;
      }
      // Relay a move + update games object
      case "newmove": {
        // TODO?: "pingback" strategy to ensure that move was transmitted
        games[obj.gid].fen = obj.fen;
        const playingWhite = (games[obj.gid].players[0].sid == sid);
        const oppSid = games[obj.gid].players[playingWhite ? 1 : 0].sid;
        send(oppSid, "newmove", { moves: obj.moves });
        break;
      }
      // Relay "game ends" message
      case "gameover": {
        const playingWhite = (games[obj.gid].players[0].sid == sid);
        const oppSid = games[obj.gid].players[playingWhite ? 1 : 0].sid;
        if (obj.relay) send(oppSid, "gameover", { gid: obj.gid });
        games[obj.gid].over = true;
        setTimeout( () => delete games[obj.gid], 60000 );
        break;
      }
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
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
wss.on('close', () => clearInterval(interval));
