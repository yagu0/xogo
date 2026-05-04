let $ = document; //shortcut

///////////////////
// Initialisations

function generateId(len) {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const arr = new Uint8Array(len);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => chars[byte % chars.length]).join('');
}

// Populate variants dropdown list
let dropdown = $.getElementById("selectVariant");
dropdown[0] = new Option("? ? ?", "_random", true, true);
dropdown[0].title = "Random variant";
for (let i = 0; i < variants.length; i++) {
  let newOption = new Option(
    variants[i].disp || variants[i].name, variants[i].name, false, false);
  newOption.title = variants[i].desc;
  dropdown[dropdown.length] = newOption;
}

// Ensure that I have a socket ID and a name
if (!localStorage.getItem("sid"))
  localStorage.setItem("sid", generateId(8));
if (!localStorage.getItem("name"))
  localStorage.setItem("name", "@non" + generateId(4));
const sid = localStorage.getItem("sid");
$.getElementById("myName").value = localStorage.getItem("name");

// "Material" input field name
let inputName = document.getElementById("myName");
let formField = document.getElementById("ng-name");
const setActive = (active) => {
  if (active)
    formField.classList.add("form-field--is-active");
  else {
    formField.classList.remove("form-field--is-active");
    inputName.value == ''
      ? formField.classList.remove("form-field--is-filled")
      : formField.classList.add("form-field--is-filled");
  }
};
setActive(true);
inputName.onblur = () => setActive(false);
inputName.onfocus = () => setActive(true);

/////////
// Utils

function h(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(k => {
      // Special treatment for events (ex: onclick)
      if (k.startsWith("on"))
        el[k.toLowerCase()] = attrs[k];
      else
        el.setAttribute(k, attrs[k]);
    });
  }
  if (children) {
    if (Array.isArray(children))
      children.forEach(c => c && el.append(c));
    else
      el.append(children);
  }
  return el;
}

function setName() {
  // 'onChange' event on name input text field [HTML]
  const name = $.getElementById("myName").value;
  localStorage.setItem("name", sanitize(name, 30));
}

// Turn a "tab" on, and "close" all others
function toggleVisible(element) {
  for (elt of document.querySelectorAll("main > div")) {
    if (elt.id != element)
      elt.style.display = "none";
    else
      elt.style.display = "block";
  }
  if (element == "boardContainer") {
    // Avoid smartphone scrolling effects (TODO?)
    document.querySelector("html").style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  else {
    document.querySelector("html").style.overflow = "visible";
    document.body.style.overflow = "visible";
    // Workaround "superposed texts" effect:
    if (element == "newGame")
      setActive(false);
  }
}

let seek_vname;
function seekGame() {
  seek_vname = $.getElementById("selectVariant").value;
  if (send("seekgame",
           {vname: seek_vname, name: localStorage.getItem("name")})
  ) {
    toggleVisible("pendingSeek");
  }
}
function cancelSeek() {
  if (send("cancelseek", {vname: seek_vname}))
    toggleVisible("newGame");
}

function sendRematch(random) {
  if (send("rematch", {gid: gid, random: !!random}))
    toggleVisible("pendingRematch");
}
function cancelRematch() {
  if (send("norematch", {gid: gid}))
    toggleVisible("newGame");
}

let lastAliases = [];
function replaceAliases() {
  for (const k of lastAliases)
    delete window[k];
  for (const [k, v] of Object.entries(V.Aliases))
    window[k] = v;
  lastAliases = Object.keys(V.Aliases);
}

// Play with a friend (or not ^^)
function showNewGameForm() {
  const vname = $.getElementById("selectVariant").value;
  if (vname == "_random")
    alert("Select a variant first");
  else {
    $.getElementById("gameLink").innerHTML = "";
    $.getElementById("selectColor").selectedIndex = 0;
    toggleVisible("newGameForm");
    import(`/variants/${vname}/class.js`).then(module => {
      window.V = module.default;
      replaceAliases();
      prepareOptions();
    });
  }
}
function backToNormalSeek() {
  toggleVisible("newGame");
}

let options;
function prepareOptions() {
  options = {};
  const container = $.getElementById("gameOptions");
  container.innerHTML = "";
  if (V.Options.select) {
    V.Options.select.forEach(select => {
      const selectEl = h('select', {
        id: `var_${select.variable}`,
        onchange: (e) => { options[select.variable] = e.target.value; }
      }, select.options.map(opt =>
        h('option', {
          value: opt.value,
          selected: opt.value == select.defaut
        }, opt.label)
      ));
      container.append(
        h('div', { class: 'option-select' }, [
          h('label', { for: `var_${select.variable}` }, select.label),
          h('div', { class: 'select' }, [
            selectEl,
            h('span', { class: 'focus' })
          ])
        ])
      );
    });
  }
  if (V.Options.input) {
    V.Options.input.forEach(input => {
      const inputAttrs = {
        id: `var_${input.variable}`,
        type: input.type,
        onchange: (e) => {
          options[input.variable] =
            (input.type == "checkbox" ? e.target.checked : e.target.value);
        }
      };
      if (input.type == "checkbox" && input.defaut)
        inputAttrs.checked = true;
      else if (input.defaut)
        inputAttrs.value = input.defaut;
      container.append(
        h('div', { class: 'option-input' }, [
          h('label', { class: 'input' }, [
            h('input', inputAttrs),
            h('span', { class: 'spacer' }),
            h('span', { textContent: input.label })
          ])
        ])
      );
    });
  }
  if (V.Options.styles) {
    const wordsDiv = h('div', { class: 'words' });
    let i = 0;
    while (i < V.Options.styles.length) {
      const row = h('div', { class: 'row' });
      for (let j = i; j < i + 4 && j < V.Options.styles.length; j++) {
        const styleName = V.Options.styles[j];
        row.append(
          h('span', {
            textContent: styleName,
            onclick: (e) => {
              options[styleName] = !options[styleName];
              e.target.classList.toggle("highlight-word");
            }
          })
        );
      }
      wordsDiv.append(row);
      i += 4;
    }
    container.append(wordsDiv);
  }
}

function getGameLink() {
  const vname = $.getElementById("selectVariant").value;
  const color = $.getElementById("selectColor").value;
  for (const select of $.querySelectorAll("#gameOptions select")) {
    let value = parseInt(select.value, 10);
    if (isNaN(value)) //not an integer
      value = select.value;
    options[ select.id.split("_")[1] ] = value;
  }
  for (const input of $.querySelectorAll("#gameOptions input")) {
    const variable = input.id.split("_")[1];
    if (input.type == "number")
      options[variable] = parseInt(input.value, 10); //TODO: real numbers?
    else if (input.type == "checkbox")
      options[variable] = input.checked;
  }
  send("creategame", {
    vname: vname,
    player: {sid: sid, name: localStorage.getItem("name"), color: color},
    options: options
  });
}

function fillGameInfos(gameInfos, oppIndex) {
  fetch(`/variants/${gameInfos.vname}/rules.html`)
    .then(res => res.text())
    .then(txt => {
      const container = $.getElementById("gameInfos");
      container.innerHTML = ""; //initial cleaning

      // 1. Players infos
      const playerDiv = h('div', { class: 'players-info' }, [
        h('p', null, [
          h('span', { class: 'bold', textContent: gameInfos.vdisp }),
          h('span', { textContent: ` vs. ${gameInfos.players[oppIndex].name}` })
        ])
      ]);

      // 2. Options treatment (Filtering + Group by 4)
      const optionsInfos = h('div', { class: 'options-info' });
      const activeOptions =
        Object.entries(gameInfos.options).filter(opt => !!opt[1]);
      
      let i = 0;
      while (i < activeOptions.length) {
        const row = h('div', { class: 'row' });
        for (let j = i; j < i + 4 && j < activeOptions.length; j++) {
          const [key, val] = activeOptions[j];
          const label = (val === true ? key : `${key}:${val}`);
          row.append(h('span', { class: 'option', textContent: label + " " }));
        }
        optionsInfos.append(row);
        i += 4;
      }

      // 3. Rules (keeping innerHTML here because trusted from file rules.html)
      const rulesDiv = h('div', { class: 'rules' });
      rulesDiv.innerHTML = txt;

      // 4. Game infos button
      const btnWrap = h('div', { class: 'btn-wrap' }, [
        h('button', {
          onclick: toggleGameInfos,
          textContent: "Back to game"
        })
      ]);

      // Final assembling
      container.append(
        playerDiv,
        activeOptions.length > 0 ? optionsInfos : null,
        rulesDiv,
        btnWrap
      );
    });
}

////////////////
// Communication

let socket, gid, recoAttempt = 0;
const autoReconnectDelay = () => {
  return [100, 200, 500, 1000, 3000, 10000, 30000][Math.min(recoAttempt, 6)];
};

function send(code, data, opts) {
  opts = opts || {};
  const trySend = () => {
    if (socket.readyState == 1) {
      socket.send(JSON.stringify(Object.assign({code: code}, data)));
      if (opts.success)
        opts.success();
      return true;
    }
    return false;
  };
  const firstTry = trySend();
  if (!firstTry) {
    if (opts.retry) {
      // Retry for a few seconds (sending move)
      let sendAttempt = 1;
      const retryLoop = setInterval(
        () => {
          if (trySend() || ++sendAttempt >= 3)
            clearInterval(retryLoop);
          if (sendAttempt >= 3 && opts.error)
            opts.error();
        },
        1000
      );
    }
    else if (opts.error)
      opts.error();
  }
  return firstTry;
}

function copyClipboard(msg) {
  navigator.clipboard.writeText(msg);
}
function getWhatsApp(msg) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

const tryResumeGame = () => {
  recoAttempt = 0;
  // If a game is found, resume it:
  if (localStorage.getItem("gid")) {
    gid = localStorage.getItem("gid");
    send("getgame",
         {gid: gid},
         {
           retry: true,
           error: () => alert("Cannot load game: no connection")
         });
  }
  else {
    // If URL indicates "play with a friend", start game:
    const hashIdx = document.URL.indexOf('#');
    if (hashIdx >= 0) {
      const urlParts = $.URL.split('#');
      gid = urlParts[1];
      localStorage.setItem("gid", gid);
      history.replaceState(null, '', urlParts[0]); //hide game ID
      send("joingame",
           {gid: gid, name: localStorage.getItem("name")},
           {
             retry: true,
             error: () => alert("Cannot load game: no connection")
           });
    }
  }
};

const messageCenter = (msg) => {
  const obj = JSON.parse(msg.data);
  switch (obj.code) {
    // Start new game:
    case "gamestart": {
      if (document.hidden)
        notifyMe("game");
      gid = obj.gid;
      initializeGame(obj);
      break;
    }
    // Game vs. friend just created on server: share link now
    case "gamecreated": {
      const link = `${Params.http_server}/#${obj.gid}`;
      const container = $.getElementById("gameLink");
      container.innerHTML = ""; //emptying
      container.append(
        h('p', null, [
          h('a', { href: getWhatsApp(link), textContent: "WhatsApp" }),
          " / ",
          h('span', {
            onclick: () => copyClipboard(link),
            textContent: "ToClipboard",
            //style: "cursor:pointer; text-decoration:underline"
          })
        ]),
        h('p', { textContent: link })
      );
      break;
    }
    // Game vs. friend joined after 1 minute (try again!)
    case "jointoolate":
      alert("Game no longer available");
      break;
    // Get infos of a running game (already launched)
    case "gameinfo":
      initializeGame(obj);
      break;
    // Tried to resume a game which is now gone:
    case "nogame":
      localStorage.removeItem("gid");
      break;
    // Receive opponent's move:
    case "newmove":
      // Basic check: was it really opponent's turn?
      if (vr.turn == playerColor)
        break;
      if (document.hidden)
        notifyMe("move");
      // TODO: moves not sanitized (most likely: won't "fix"...)
      vr.playReceivedMove(obj.moves, () => {
        if (vr.getCurrentScore(obj.moves) != "*") {
          localStorage.removeItem("gid");
          setTimeout( () => toggleVisible("gameStopped"), 2000 );
        }
        else
          toggleTurnIndicator(true);
      });
      break;
    // Opponent stopped game (draw, abort, resign...)
    case "gameover":
      toggleVisible("gameStopped");
      localStorage.removeItem("gid");
      break;
    // Opponent cancelled rematch:
    case "closerematch":
      toggleVisible("newGame");
      break;
    case "filechange":
      // TODO?: could be more subtle
      setTimeout(() => location.reload(), 100);
      break;
  }
};

const handleError = (err) => {
  if (err.code === "ECONNREFUSED") {
    removeAllListeners();
    alert("Server refused connection. Please reload page later");
  }
  socket.close();
};

const handleClose = () => {
  setTimeout(() => {
    removeAllListeners();
    connectToWSS();
  }, autoReconnectDelay());
};

function removeAllListeners() {
  socket.removeEventListener("open", tryResumeGame);
  socket.removeEventListener("message", messageCenter);
  socket.removeEventListener("error", handleError);
  socket.removeEventListener("close", handleClose);
}

function connectToWSS() {
  socket =
    new WebSocket(`${Params.socket_server}${Params.socket_path}?sid=${sid}`);
  socket.addEventListener("open", tryResumeGame);
  socket.addEventListener("message", messageCenter);
  socket.addEventListener("error", handleError);
  socket.addEventListener("close", handleClose);
  recoAttempt++;
}
connectToWSS();

///////////
// Playing

function toggleTurnIndicator(myTurn) {
  let indicator =
    $.getElementById("boardContainer").querySelector(".chessboard");
  if (myTurn)
    indicator.style.outline = "thick solid green";
  else
    indicator.style.outline = "thick solid lightgrey";
}

function notifyMe(code) {
  const doNotify = () => {
    // NOTE: empty body (TODO?)
    new Notification("New " + code, { vibrate: [200, 100, 200] });
    new Audio("/assets/new_" + code + ".mp3").play();
  }
  if (Notification.permission === "granted")
    doNotify();
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted")
        doNotify();
    });
  }
}

let curMoves = [],
    lastFen;
const afterPlay = (move_s, newTurn, ops) => {
  if (ops.send) {
    // Pack into one moves array, then send (if turn changed)
    if (Array.isArray(move_s))
      // Array of simple moves (e.g. Chakart)
      Array.prototype.push.apply(curMoves, move_s);
    else
      // Usual case
      curMoves.push(move_s);
    if (newTurn != playerColor) {
      send("newmove",
           {gid: gid, moves: curMoves, fen: vr.getFen()},
           {
             retry: true,
             error: () => alert("Move not sent: reload page")
           }
      );
    }
  }
  if (ops.res && newTurn != playerColor) {
    toggleTurnIndicator(false); //now all moves are sent and animated
    const result = vr.getCurrentScore(curMoves);
    curMoves = [];
    if (result != "*") {
      setTimeout(() => {
        toggleVisible("gameStopped");
        send("gameover", {gid: gid});
      }, 2000);
    }
  }
};

let vr = null, playerColor, lastVname = undefined;
function initializeGame(obj) {
  const options = obj.options || {};

  // 1. Dynamic loading of variant js module
  import(`/variants/${obj.vname}/class.js`).then(module => {
    window.V = module.default;

    // Export aliases in global scope (used by variants classes)
    replaceAliases();

    // 2. Dynamic management of CSS (Unload old / Load new)
    if (lastVname !== obj.vname) {
      if (lastVname) {
        const oldCss = $.getElementById(`${lastVname}_css`);
        if (oldCss)
          oldCss.remove();
      }
      $.head.append(
        h('link', {
          id: `${obj.vname}_css`,
          rel: 'stylesheet',
          href: `/variants/${obj.vname}/style.css`
        })
      );
      lastVname = obj.vname;
    }

    playerColor = (sid == obj.players[0].sid ? 'w' : 'b');

    // 3. Building Board Container
    const container = $.getElementById("boardContainer");
    container.innerHTML = ""; // On vide proprement l'ancien plateau

    // Create SVG icons with a string, inserted securely.
    const infoIcon = h('div', { id: 'upLeftInfos', onclick: toggleGameInfos });
    infoIcon.innerHTML = `<svg viewBox="0.5 0.5 100 100"><path d="M50.5,0.5c-27.614,0-50,22.386-50,50c0,27.614,22.386,50,50,50s50-22.386,50-50C100.5,22.886,78.114,0.5,50.5,0.5z M60.5,85.5h-20v-40h20V85.5z M50.5,35.5c-5.523,0-10-4.477-10-10s4.477-10,10-10c5.522,0,10,4.477,10,10S56.022,35.5,50.5,35.5z"/></svg>`;

    const stopIcon = h('div', { id: 'upRightStop', onclick: confirmStopGame });
    stopIcon.innerHTML = `<svg viewBox="0 0 533.333 533.333"><path d="M528.468,428.468c-0.002-0.002-0.004-0.004-0.006-0.005L366.667,266.666l161.795-161.797c0.002-0.002,0.004-0.003,0.006-0.005c1.741-1.742,3.001-3.778,3.809-5.946c2.211-5.925,0.95-12.855-3.814-17.62l-76.431-76.43 c-4.765-4.763-11.694-6.024-17.619-3.812c-2.167,0.807-4.203,2.066-5.946,3.807L266.667,166.666 L104.87,4.869c-5.945-3.807-92.993-1.156-81.3,4.869 L4.869,81.3c-4.764,4.765-6.024,11.694-3.813,17.619l161.797,161.796L4.869,428.464c3.813,17.619,81.3,528.464,98.92,532.277c161.796-161.797l161.795,161.797c5.927,2.212,17.619-3.813l76.43-76.432c3.815-17.62 C531.469,432.246,528.468,428.468z"/></svg>`;

    const board = h('div', { class: 'chessboard' });

    container.append(infoIcon, stopIcon, board);

    // 4. Initialize game engine (vr)
    if (vr)
      vr.removeListeners();

    vr = new V({
      seed: obj.seed,
      fen: obj.fen,
      element: "boardContainer",
      color: playerColor,
      afterPlay: afterPlay,
      options: options
    });

    // 5. Handling game state
    const gameCreation = !obj.fen;
    if (gameCreation) {
      send("setfen", { gid: obj.gid, fen: vr.getFen() });
      localStorage.setItem("gid", obj.gid);
    }

    // 6. Update variant's informations (vdisp)
    const variantOption = Array.from($.getElementById("selectVariant").options)
                               .find(opt => opt.value === obj.vname);
    obj.vdisp = variantOption ? variantOption.text : obj.vname;

    const playerIndex = (playerColor == "w" ? 0 : 1);
    fillGameInfos(obj, 1 - playerIndex);

    // 7. Final output
    if (obj.players[playerIndex].randvar && gameCreation) {
      toggleVisible("gameInfos");
    }
    else
      toggleVisible("boardContainer");

    toggleTurnIndicator(vr.turn == playerColor);
  });
}

function confirmStopGame() {
  if (confirm("Stop game?") && send("gameover", {gid: gid, relay: true})) {
    localStorage.removeItem("gid");
    toggleVisible("gameStopped");
  }
}

function toggleGameInfos() {
  if ($.getElementById("gameInfos").style.display == "none")
    toggleVisible("gameInfos");
  else
    toggleVisible("boardContainer");
}

$.body.addEventListener("keydown", (e) => {
  if (!localStorage.getItem("gid"))
    return;
  if (e.keyCode == 27)
    confirmStopGame();
  else if (e.keyCode == 32) {
    e.preventDefault();
    toggleGameInfos();
  }
});
