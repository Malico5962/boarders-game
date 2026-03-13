const socket = io();

// UI Elements
const authSection = document.getElementById('auth-section'); const gameSection = document.getElementById('game-section'); const playSection = document.getElementById('play-section');
const usernameInput = document.getElementById('usernameInput'); const passwordInput = document.getElementById('passwordInput'); const authError = document.getElementById('auth-error');
const playerNameDisplay = document.getElementById('playerNameDisplay'); const playerRankDisplay = document.getElementById('playerRankDisplay');
const findMatchBtn = document.getElementById('findMatchBtn'); const statusDiv = document.getElementById('status'); const wheelContainer = document.getElementById('wheel-container'); const wheel = document.getElementById('wheel');
const roleDisplay = document.getElementById('player-role-display'); const turnDisplay = document.getElementById('turn-display');

// Game Boards
const stttContainer = document.getElementById('sttt-container'); const stttBoard = document.getElementById('sttt-board');
const c4Container = document.getElementById('c4-container'); const c4Board = document.getElementById('c4-board');
const dabContainer = document.getElementById('dab-container'); const dabBoard = document.getElementById('dab-board');
const pongContainer = document.getElementById('pong-container');
const bsContainer = document.getElementById('bs-container'); const bsMyBoard = document.getElementById('bs-my-board'); const bsTrackingBoard = document.getElementById('bs-tracking-board');
const chkContainer = document.getElementById('chk-container'); const chkBoard = document.getElementById('chk-board');

// State Variables
let currentRoom = null, mySymbol = null, currentGameType = null, myUsername = null, myUserObj = null; 
let myPrivateCode = null; let isLobbyHost = false; let isPrivateGame = false;
let localBattleshipBoard = Array(10).fill(null).map(() => Array(10).fill(0));
let chkSelected = null; let lastChkGame = null;

// ==========================================
// AUTH & ACCOUNT LOGIC
// ==========================================
socket.on('onlineCount', (count) => { document.getElementById('online-counter').innerText = `🟢 Players Online: ${count}`; });

window.onload = () => { 
    const savedUser = localStorage.getItem('boarders_account'); 
    if (savedUser) { 
        const { username, password } = JSON.parse(savedUser); 
        usernameInput.value = username; passwordInput.value = password; 
        handleAuth('login'); 
    } 
};

async function handleAuth(action) {
    const username = usernameInput.value, password = passwordInput.value; 
    if (!username || !password) return authError.innerText = "Enter username and password.";
    const res = await fetch(`/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok) {
        myUserObj = data.user; 
        localStorage.setItem('boarders_account', JSON.stringify({ username, password }));
        myUsername = myUserObj.username; authSection.style.display = 'none'; gameSection.style.display = 'block';
        updateDashboardUI();
    } else { 
        localStorage.removeItem('boarders_account'); authError.innerText = data.error; 
    }
}

function updateDashboardUI() {
    playerNameDisplay.innerText = myUserObj.username;
    playerRankDisplay.innerText = myUserObj.rank;
    document.getElementById('dashPfpDisplay').src = myUserObj.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUserObj.username}`;
    document.getElementById('playerDescDisplay').innerText = `"${myUserObj.description}"`;
}

document.getElementById('registerBtn').addEventListener('click', () => handleAuth('register')); 
document.getElementById('loginBtn').addEventListener('click', () => handleAuth('login')); 
document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('boarders_account'); location.reload(); });

// Account Settings Menu
document.getElementById('openAccountBtn').addEventListener('click', () => {
    document.getElementById('setUsername').value = myUserObj.username;
    document.getElementById('setPassword').value = ''; 
    document.getElementById('setProfilePic').value = myUserObj.profilePic.includes('api.dicebear.com') ? '' : myUserObj.profilePic;
    document.getElementById('setDesc').value = myUserObj.description;
    document.getElementById('setAnon').checked = myUserObj.isAnonymous;
    document.getElementById('settingsPfpPreview').src = myUserObj.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUserObj.username}`;
    document.getElementById('account-modal').style.display = 'flex';
});

document.getElementById('setProfilePic').addEventListener('input', (e) => {
    document.getElementById('settingsPfpPreview').src = e.target.value || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUserObj.username}`;
});

document.getElementById('closeAccountBtn').addEventListener('click', () => document.getElementById('account-modal').style.display = 'none');

document.getElementById('saveAccountBtn').addEventListener('click', async () => {
    const newUsername = document.getElementById('setUsername').value;
    const newPassword = document.getElementById('setPassword').value;
    let profilePic = document.getElementById('setProfilePic').value;
    if (!profilePic.trim()) profilePic = `https://api.dicebear.com/7.x/bottts/svg?seed=${newUsername || myUserObj.username}`;
    
    const res = await fetch('/update-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            currentUsername: myUserObj.username, newUsername: newUsername || undefined, 
            newPassword: newPassword || undefined, profilePic, 
            description: document.getElementById('setDesc').value, isAnonymous: document.getElementById('setAnon').checked 
        })
    });
    const data = await res.json();
    if (res.ok) {
        myUserObj = data.user; myUsername = myUserObj.username;
        localStorage.setItem('boarders_account', JSON.stringify({ username: myUserObj.username, password: newPassword || JSON.parse(localStorage.getItem('boarders_account')).password }));
        updateDashboardUI(); document.getElementById('account-modal').style.display = 'none';
    } else {
        document.getElementById('account-error').innerText = data.error;
    }
});

document.getElementById('viewLeaderboardBtn').addEventListener('click', async () => { document.getElementById('leaderboard-modal').style.display = 'flex'; const res = await fetch('/leaderboard'); const data = await res.json(); document.getElementById('leaderboard-content').innerHTML = data.map((u, i) => `<div class="leaderboard-item"><span>#${i+1} ${u.username}</span><span style="color:var(--primary);">${u.rank} ⭐</span></div>`).join(''); }); 
document.getElementById('closeLeaderboardBtn').addEventListener('click', () => { document.getElementById('leaderboard-modal').style.display = 'none'; });

// ==========================================
// MATCHMAKING & PRIVATE ROOMS
// ==========================================
findMatchBtn.addEventListener('click', () => { socket.emit('joinQueue', myUsername); statusDiv.innerText = 'Searching for a match... ⏳'; findMatchBtn.disabled = true; }); 
document.getElementById('quitBtn').addEventListener('click', () => { socket.emit('quitGame'); });
socket.on('matchFound', (data) => { document.getElementById('private-lobby-modal').style.display = 'none'; statusDiv.innerText = `Match found! 🎯`; wheelContainer.style.display = 'block'; setTimeout(() => wheel.classList.add('spinning'), 50); setTimeout(() => { wheel.classList.remove('spinning'); wheel.innerText = data.game; statusDiv.innerText = `${data.game} Selected! Get ready... 🚀`; }, 3000); });

document.getElementById('privateGameMenuBtn').addEventListener('click', () => document.getElementById('private-menu-modal').style.display = 'flex'); document.getElementById('closePrivateMenuBtn').addEventListener('click', () => document.getElementById('private-menu-modal').style.display = 'none'); document.getElementById('hostBtn').addEventListener('click', () => { document.getElementById('private-menu-modal').style.display = 'none'; document.getElementById('host-modal').style.display = 'flex'; }); document.getElementById('cancelHostBtn').addEventListener('click', () => document.getElementById('host-modal').style.display = 'none'); document.getElementById('joinBtn').addEventListener('click', () => { document.getElementById('private-menu-modal').style.display = 'none'; document.getElementById('join-modal').style.display = 'flex'; }); document.getElementById('cancelJoinBtn').addEventListener('click', () => document.getElementById('join-modal').style.display = 'none');
document.getElementById('confirmHostBtn').addEventListener('click', () => { const code = document.getElementById('hostCodeInput').value; if (code.length !== 4) return document.getElementById('host-error').innerText = "Code must be 4 characters."; document.getElementById('host-error').innerText = ""; socket.emit('createPrivateRoom', { username: myUsername, code }); }); document.getElementById('confirmJoinBtn').addEventListener('click', () => { const code = document.getElementById('joinCodeInput').value; if (code.length !== 4) return document.getElementById('join-error').innerText = "Code must be 4 characters."; document.getElementById('join-error').innerText = ""; socket.emit('joinPrivateRoom', { username: myUsername, code }); });
socket.on('privateError', (msg) => { alert(msg); location.reload(); }); 
socket.on('privateRoomJoined', (data) => { document.getElementById('host-modal').style.display = 'none'; document.getElementById('join-modal').style.display = 'none'; document.getElementById('private-lobby-modal').style.display = 'flex'; myPrivateCode = data.code; isLobbyHost = data.isHost; document.getElementById('lobbyCodeDisplay').innerText = data.code; document.getElementById('lobbyPlayersDisplay').innerText = data.players.join(' & '); document.getElementById('chat-box').innerHTML = '<div class="chat-msg"><i>Welcome to the private lobby!</i></div>'; if (isLobbyHost) document.getElementById('hostControls').style.display = 'block'; });
socket.on('updateLobbyPlayers', (players) => { document.getElementById('lobbyPlayersDisplay').innerText = players.join(' & '); if (players.length === 2 && isLobbyHost) { const startBtn = document.getElementById('startPrivateBtn'); startBtn.disabled = false; startBtn.innerText = "Start Game! 🚀"; } });
document.getElementById('sendChatBtn').addEventListener('click', () => { const text = document.getElementById('chatInput').value; if (text && myPrivateCode) { socket.emit('sendPrivateChat', { code: myPrivateCode, message: text, username: myUsername }); document.getElementById('chatInput').value = ''; } }); socket.on('updatePrivateChat', (msg) => { const chatBox = document.getElementById('chat-box'); chatBox.innerHTML += `<div class="chat-msg"><span>${msg.username}:</span> ${msg.text}</div>`; chatBox.scrollTop = chatBox.scrollHeight; });
document.getElementById('startPrivateBtn').addEventListener('click', () => { socket.emit('startPrivateGame', { code: myPrivateCode, gameSelection: document.getElementById('gameSelector').value }); }); document.getElementById('leaveLobbyBtn').addEventListener('click', () => location.reload());

// ==========================================
// GRID GENERATORS
// ==========================================
for (let i = 0; i < 9; i++) { const macroCell = document.createElement('div'); macroCell.className = 'macro-cell'; macroCell.id = `macro-${i}`; for (let j = 0; j < 9; j++) { const microCell = document.createElement('div'); microCell.className = 'micro-cell'; microCell.id = `micro-${i}-${j}`; microCell.onclick = () => { if (currentGameType === 'Super Tic-Tac-Toe') socket.emit('makeMove', { roomName: currentRoom, macroIndex: i, microIndex: j }); }; macroCell.appendChild(microCell); } stttBoard.appendChild(macroCell); }
for (let r = 0; r < 6; r++) { for (let c = 0; c < 7; c++) { const cell = document.createElement('div'); cell.className = 'c4-cell'; cell.id = `c4-${r}-${c}`; cell.onclick = () => { if (currentGameType === 'Connect 4') socket.emit('makeC4Move', { roomName: currentRoom, col: c }); }; c4Board.appendChild(cell); } }
for (let r = 0; r < 7; r++) { for (let c = 0; c < 7; c++) { const div = document.createElement('div'); if (r % 2 === 0 && c % 2 === 0) div.className = 'dab-dot'; else if (r % 2 === 0 && c % 2 !== 0) { div.className = 'dab-hline'; const hRow = r / 2; const hCol = Math.floor(c / 2); div.id = `h-${hRow}-${hCol}`; div.onclick = () => { if (currentGameType === 'Dots and Boxes') socket.emit('makeDABMove', { roomName: currentRoom, type: 'h', r: hRow, c: hCol }); }; } else if (r % 2 !== 0 && c % 2 === 0) { div.className = 'dab-vline'; const vRow = Math.floor(r / 2); const vCol = c / 2; div.id = `v-${vRow}-${vCol}`; div.onclick = () => { if (currentGameType === 'Dots and Boxes') socket.emit('makeDABMove', { roomName: currentRoom, type: 'v', r: vRow, c: vCol }); }; } else { div.className = 'dab-box'; div.id = `box-${Math.floor(r / 2)}-${Math.floor(c / 2)}`; } dabBoard.appendChild(div); } }
for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const myCell = document.createElement('div'); myCell.className = 'bs-cell'; myCell.id = `bs-my-${r}-${c}`; bsMyBoard.appendChild(myCell); const targetCell = document.createElement('div'); targetCell.className = 'bs-cell'; targetCell.id = `bs-target-${r}-${c}`; targetCell.onclick = () => { if (currentGameType === 'Battleship') socket.emit('makeBattleshipMove', { roomName: currentRoom, r, c }); }; bsTrackingBoard.appendChild(targetCell); } }
for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { const cell = document.createElement('div'); cell.id = `chk-${r}-${c}`; if ((r + c) % 2 === 0) cell.className = 'chk-cell chk-light'; else { cell.className = 'chk-cell chk-dark'; cell.onclick = () => { if (currentGameType !== 'Checkers' || !lastChkGame || lastChkGame.turn !== mySymbol) return; if (chkSelected) { if (chkSelected.r === r && chkSelected.c === c) { chkSelected = null; updateChkUI(lastChkGame); return; } socket.emit('makeCheckersMove', { roomName: currentRoom, fromR: chkSelected.r, fromC: chkSelected.c, toR: r, toC: c }); chkSelected = null; } else { const p = lastChkGame.board[r][c]; if ((mySymbol === 'Red' && (p === 1 || p === 3)) || (mySymbol === 'Black' && (p === 2 || p === 4))) { chkSelected = {r, c}; updateChkUI(lastChkGame); } } }; } chkBoard.appendChild(cell); } }

// ==========================================
// GAME START & UPDATES
// ==========================================
socket.on('startGame', (gameState) => {
    currentRoom = gameState.roomName; currentGameType = gameState.gameType; mySymbol = gameState.players[socket.id]; isPrivateGame = gameState.isPrivate; 
    
    // Rich Player Data Headers
    const p1Data = gameState.playerData[Object.keys(gameState.players)[0]];
    const p2Data = gameState.playerData[Object.keys(gameState.players)[1]];
    
    document.getElementById('p1-name').innerText = p1Data.username; document.getElementById('p1-rank').innerText = `${p1Data.rank}⭐`; document.getElementById('p1-pfp').src = p1Data.pfp;
    document.getElementById('p2-name').innerText = p2Data.username; document.getElementById('p2-rank').innerText = `${p2Data.rank}⭐`; document.getElementById('p2-pfp').src = p2Data.pfp;

    if (currentGameType === 'Connect 4' || currentGameType === 'Dots and Boxes') roleDisplay.innerHTML = `You are playing as: <strong>${mySymbol === 'Red' ? '🔴 Red' : '🔵 Blue'}</strong>`;
    else if (currentGameType === 'Checkers') roleDisplay.innerHTML = `You are playing as: <strong>${mySymbol === 'Red' ? '🔴 Red' : '⚫ Black'}</strong>`;
    else if (currentGameType === 'Super Tic-Tac-Toe') roleDisplay.innerHTML = `You are playing as: <strong style="color: ${mySymbol === 'X' ? 'var(--primary)' : 'var(--secondary)'};">${mySymbol}</strong>`;
    else if (currentGameType === 'Pong') roleDisplay.innerHTML = `You are the <strong>${mySymbol}</strong> paddle`;
    else if (currentGameType === 'Battleship') roleDisplay.innerHTML = `You are Commander <strong>${mySymbol}</strong>`;

    gameSection.classList.add('fade-out'); document.getElementById('private-lobby-modal').style.display = 'none';
    setTimeout(() => {
        gameSection.style.display = 'none'; gameSection.classList.remove('fade-out'); playSection.style.display = 'block'; playSection.classList.add('fade-in');
        stttContainer.style.display = 'none'; c4Container.style.display = 'none'; pongContainer.style.display = 'none'; dabContainer.style.display = 'none'; bsContainer.style.display = 'none'; chkContainer.style.display = 'none';

        if (currentGameType === 'Super Tic-Tac-Toe') { stttContainer.style.display = 'block'; updateSTTTUI(gameState); } 
        else if (currentGameType === 'Connect 4') { c4Container.style.display = 'block'; updateC4UI(gameState); } 
        else if (currentGameType === 'Dots and Boxes') { dabContainer.style.display = 'block'; updateDABUI(gameState); }
        else if (currentGameType === 'Checkers') { chkContainer.style.display = 'block'; chkSelected = null; updateChkUI(gameState); }
        else if (currentGameType === 'Pong') { pongContainer.style.display = 'block'; turnDisplay.innerText = "Hold UP/DOWN arrows (or W/S) to glide!"; }
        else if (currentGameType === 'Battleship') { bsContainer.style.display = 'block'; document.getElementById('bs-setup-menu').style.display = 'block'; document.getElementById('bs-randomize-btn').click(); turnDisplay.innerText = "Arrange your fleet!"; turnDisplay.style.color = "var(--text)"; }
    }, 500);
});

// Battleship Logic
function randomizeBattleship() { localBattleshipBoard = Array(10).fill(null).map(() => Array(10).fill(0)); const ships = [5, 4, 3, 3, 2]; for (let shipLen of ships) { let placed = false; while (!placed) { const isHoriz = Math.random() > 0.5; const r = Math.floor(Math.random() * (isHoriz ? 10 : 10 - shipLen)); const c = Math.floor(Math.random() * (isHoriz ? 10 - shipLen : 10)); let canPlace = true; for (let i = 0; i < shipLen; i++) { if (isHoriz && localBattleshipBoard[r][c + i] !== 0) canPlace = false; if (!isHoriz && localBattleshipBoard[r + i][c] !== 0) canPlace = false; } if (canPlace) { for (let i = 0; i < shipLen; i++) { if (isHoriz) localBattleshipBoard[r][c + i] = 1; else localBattleshipBoard[r + i][c] = 1; } placed = true; } } } drawLocalBattleship(); }
function drawLocalBattleship() { for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const cell = document.getElementById(`bs-my-${r}-${c}`); cell.className = localBattleshipBoard[r][c] === 1 ? 'bs-cell bs-ship' : 'bs-cell'; } } }
document.getElementById('bs-randomize-btn').addEventListener('click', randomizeBattleship); document.getElementById('bs-ready-btn').addEventListener('click', () => { document.getElementById('bs-setup-menu').style.display = 'none'; socket.emit('submitBattleshipBoard', { roomName: currentRoom, board: localBattleshipBoard }); });
socket.on('battleshipWaiting', () => { turnDisplay.innerText = "Waiting for opponent to ready up..."; turnDisplay.style.color = "var(--secondary)"; }); socket.on('battleshipStartPlaying', (data) => { turnDisplay.innerText = data.turn === mySymbol ? "🎯 Your Turn to Fire!" : "⏳ Incoming Fire..."; turnDisplay.style.color = data.turn === mySymbol ? "var(--primary)" : "var(--secondary)"; });
socket.on('updateBattleshipBoard', (data) => { turnDisplay.innerText = data.turn === mySymbol ? "🎯 Your Turn to Fire!" : "⏳ Incoming Fire..."; turnDisplay.style.color = data.turn === mySymbol ? "var(--primary)" : "var(--secondary)"; for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const myCell = document.getElementById(`bs-my-${r}-${c}`); if (data.myBoard[r][c] === 1) myCell.className = 'bs-cell bs-ship'; else if (data.myBoard[r][c] === 2) { myCell.className = 'bs-cell bs-miss'; myCell.innerText = '•'; } else if (data.myBoard[r][c] === 3) { myCell.className = 'bs-cell bs-hit'; myCell.innerText = 'X'; } const targetCell = document.getElementById(`bs-target-${r}-${c}`); if (data.trackingBoard[r][c] === 0) { targetCell.className = 'bs-cell'; targetCell.innerText = ''; } else if (data.trackingBoard[r][c] === 2) { targetCell.className = 'bs-cell bs-miss'; targetCell.innerText = '•'; } else if (data.trackingBoard[r][c] === 3) { targetCell.className = 'bs-cell bs-hit'; targetCell.innerText = 'X'; } } } });

// Board Updates
socket.on('updateBoard', (game) => { turnDisplay.innerText = game.turn === mySymbol ? "🎯 Your Turn!" : "⏳ Opponent's Turn..."; turnDisplay.style.color = game.turn === mySymbol ? "var(--primary)" : "var(--secondary)"; for (let i = 0; i < 9; i++) { const macroDiv = document.getElementById(`macro-${i}`); if (game.macroBoard[i]) { const winnerClass = game.macroBoard[i] === 'X' ? 'winner-x' : 'winner-o'; if (!macroDiv.innerHTML.includes('macro-winner')) { macroDiv.innerHTML = `<div class="macro-winner ${winnerClass}">${game.macroBoard[i] === 'Tie' ? '-' : game.macroBoard[i]}</div>`; macroDiv.className = 'macro-cell disabled'; } continue; } macroDiv.className = (!game.winner && game.turn === mySymbol && (game.nextBoard === -1 || game.nextBoard === i)) ? 'macro-cell highlight' : 'macro-cell disabled'; for (let j = 0; j < 9; j++) { const microDiv = document.getElementById(`micro-${i}-${j}`); if (microDiv) { const cellValue = game.board[i][j]; if (cellValue && microDiv.innerHTML === '') microDiv.innerHTML = `<span class="${cellValue === 'X' ? 'mark-x' : 'mark-o'}">${cellValue}</span>`; } } } });
socket.on('updateC4Board', (game) => { turnDisplay.innerText = game.turn === mySymbol ? "🔴 Your Turn!" : "🟡 Opponent's Turn..."; turnDisplay.style.color = game.turn === mySymbol ? (mySymbol==='Red'?'var(--primary)':'var(--accent)') : (mySymbol==='Red'?'var(--accent)':'var(--primary)'); for (let r = 0; r < 6; r++) { for (let c = 0; c < 7; c++) { const cell = document.getElementById(`c4-${r}-${c}`); if (game.board[r][c] === 'Red' && !cell.classList.contains('c4-red')) cell.className = 'c4-cell c4-red'; else if (game.board[r][c] === 'Yellow' && !cell.classList.contains('c4-yellow')) cell.className = 'c4-cell c4-yellow'; } } });
socket.on('updateDABBoard', (game) => { turnDisplay.innerText = game.turn === mySymbol ? (mySymbol==='Red'?'🔴 Your Turn!':'🔵 Your Turn!') : "⏳ Opponent's Turn..."; turnDisplay.style.color = game.turn === mySymbol ? (mySymbol==='Red'?'var(--primary)':'var(--secondary)') : (mySymbol==='Red'?'var(--secondary)':'var(--primary)'); document.getElementById('dab-score-red').innerText = game.scores['Red']; document.getElementById('dab-score-blue').innerText = game.scores['Blue']; for (let r = 0; r < 4; r++) { for (let c = 0; c < 3; c++) { const hLine = document.getElementById(`h-${r}-${c}`); if (game.hLines[r][c] === 'Red') hLine.className = 'dab-hline dab-line-red'; else if (game.hLines[r][c] === 'Blue') hLine.className = 'dab-hline dab-line-blue'; } } for (let r = 0; r < 3; r++) { for (let c = 0; c < 4; c++) { const vLine = document.getElementById(`v-${r}-${c}`); if (game.vLines[r][c] === 'Red') vLine.className = 'dab-vline dab-line-red'; else if (game.vLines[r][c] === 'Blue') vLine.className = 'dab-vline dab-line-blue'; } } for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const box = document.getElementById(`box-${r}-${c}`); if (game.boxes[r][c] === 'Red') { box.className = 'dab-box dab-box-red'; box.innerText = 'R'; } else if (game.boxes[r][c] === 'Blue') { box.className = 'dab-box dab-box-blue'; box.innerText = 'B'; } } } });

socket.on('updateCheckersBoard', updateChkUI);
function updateChkUI(game) { lastChkGame = game; turnDisplay.innerText = game.turn === mySymbol ? "🎯 Your Turn!" : "⏳ Opponent's Turn..."; turnDisplay.style.color = game.turn === mySymbol ? "var(--primary)" : "var(--secondary)"; for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { if ((r + c) % 2 === 0) continue; const cell = document.getElementById(`chk-${r}-${c}`); cell.innerHTML = ''; const p = game.board[r][c]; if (p !== 0) { const pieceDiv = document.createElement('div'); pieceDiv.className = `chk-piece ${p === 1 || p === 3 ? 'chk-red' : 'chk-black'}`; if (chkSelected && chkSelected.r === r && chkSelected.c === c) pieceDiv.classList.add('chk-selected'); if (p === 3 || p === 4) pieceDiv.innerText = '👑'; cell.appendChild(pieceDiv); } } } }

// Keyboard Listeners
const keys = { up: false, down: false }; document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') { document.getElementById('leaderboard-modal').style.display = 'none'; document.getElementById('private-menu-modal').style.display = 'none'; document.getElementById('host-modal').style.display = 'none'; document.getElementById('join-modal').style.display = 'none'; document.getElementById('account-modal').style.display = 'none'; }
    if (e.key === 'Enter') { const active = document.activeElement; if (active === document.getElementById('chatInput')) document.getElementById('sendChatBtn').click(); else if (active === document.getElementById('hostCodeInput')) document.getElementById('confirmHostBtn').click(); else if (active === document.getElementById('joinCodeInput')) document.getElementById('confirmJoinBtn').click(); else if (active === document.getElementById('usernameInput') || active === document.getElementById('passwordInput')) document.getElementById('loginBtn').click(); }
    
    if (currentGameType !== 'Pong') return; if (['ArrowUp', 'ArrowDown', 'w', 's', ' '].includes(e.key)) e.preventDefault(); let changed = false; if ((e.key === 'ArrowUp' || e.key === 'w') && !keys.up) { keys.up = true; changed = true; } if ((e.key === 'ArrowDown' || e.key === 's') && !keys.down) { keys.down = true; changed = true; } if (changed) sendPaddleState(); 
}); 
document.addEventListener('keyup', (e) => { if (currentGameType !== 'Pong') return; let changed = false; if (e.key === 'ArrowUp' || e.key === 'w') { keys.up = false; changed = true; } if (e.key === 'ArrowDown' || e.key === 's') { keys.down = false; changed = true; } if (changed) sendPaddleState(); }); 
function sendPaddleState() { let dir = 0; if (keys.up) dir -= 1; if (keys.down) dir += 1; socket.emit('paddleState', { roomName: currentRoom, direction: dir }); }
socket.on('pongUpdate', (state) => { document.getElementById('pong-paddle1').style.top = state.p1y + '%'; document.getElementById('pong-paddle2').style.top = state.p2y + '%'; document.getElementById('pong-ball').style.left = state.bx + '%'; document.getElementById('pong-ball').style.top = state.by + '%'; document.getElementById('pong-strike1').innerText = state.strikes1; document.getElementById('pong-strike2').innerText = state.strikes2; const cd = document.getElementById('pong-countdown'); if (state.countdown) { cd.innerText = state.countdown; cd.style.display = 'block'; } else { cd.style.display = 'none'; } });

// End Game
socket.on('gameOverScreen', (data) => { currentGameType = null; keys.up = false; keys.down = false; const title = document.getElementById('go-title'); const msg = document.getElementById('go-message'); const points = document.getElementById('go-points'); const modal = document.getElementById('game-over-modal'); if (data.isTie) { title.innerText = "It's a Tie! 🤝"; title.className = "win-text"; msg.innerText = "Good game!"; points.innerText = "+0 Points"; points.className = ""; } else if (data.winnerId === socket.id) { title.innerText = "Victory! 🏆"; title.className = "win-text"; msg.innerText = data.isQuit ? "Your opponent quit out of fear!" : "You crushed them!"; points.innerText = "+50 Points"; points.className = "win-text"; playerRankDisplay.innerText = data.newWinnerRank; myUserObj.rank = data.newWinnerRank; } else { title.innerText = "Defeat! 💀"; title.className = "lose-text"; msg.innerText = data.isQuit ? "You quit the game!" : "Better luck next time."; points.innerText = "-50 Points"; points.className = "lose-text"; playerRankDisplay.innerText = data.newLoserRank; myUserObj.rank = data.newLoserRank; } modal.style.display = 'flex'; });

document.getElementById('returnLobbyBtn').addEventListener('click', () => {
    document.getElementById('game-over-modal').style.display = 'none'; playSection.style.display = 'none'; playSection.classList.remove('fade-in');
    document.getElementById('pong-strike1').innerText = "0"; document.getElementById('pong-strike2').innerText = "0";
    stttBoard.innerHTML = ''; for (let i = 0; i < 9; i++) { const macroCell = document.createElement('div'); macroCell.className = 'macro-cell'; macroCell.id = `macro-${i}`; for (let j = 0; j < 9; j++) { const microCell = document.createElement('div'); microCell.className = 'micro-cell'; microCell.id = `micro-${i}-${j}`; microCell.onclick = () => { if (currentGameType === 'Super Tic-Tac-Toe') socket.emit('makeMove', { roomName: currentRoom, macroIndex: i, microIndex: j }); }; macroCell.appendChild(microCell); } stttBoard.appendChild(macroCell); }
    for (let r = 0; r < 6; r++) { for (let c = 0; c < 7; c++) { document.getElementById(`c4-${r}-${c}`).className = 'c4-cell'; } }
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 3; c++) { const h = document.getElementById(`h-${r}-${c}`); if(h) h.className = 'dab-hline'; } } for (let r = 0; r < 3; r++) { for (let c = 0; c < 4; c++) { const v = document.getElementById(`v-${r}-${c}`); if(v) v.className = 'dab-vline'; } } for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const b = document.getElementById(`box-${r}-${c}`); if(b) { b.className = 'dab-box'; b.innerText = ''; } } } document.getElementById('dab-score-red').innerText = '0'; document.getElementById('dab-score-blue').innerText = '0';
    for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const m = document.getElementById(`bs-my-${r}-${c}`); if(m) { m.className = 'bs-cell'; m.innerText = ''; } const t = document.getElementById(`bs-target-${r}-${c}`); if(t) { t.className = 'bs-cell'; t.innerText = ''; } } }
    
    if (isPrivateGame) { document.getElementById('private-lobby-modal').style.display = 'flex'; } else { wheelContainer.style.display = 'none'; statusDiv.innerText = "Ready to play?"; findMatchBtn.disabled = false; gameSection.style.display = 'block'; gameSection.classList.add('fade-in'); updateDashboardUI(); }
});