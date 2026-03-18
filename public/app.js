const socket = io();

const authSection = document.getElementById('auth-section'); const gameSection = document.getElementById('game-section'); const playSection = document.getElementById('play-section');
const usernameInput = document.getElementById('usernameInput'); const passwordInput = document.getElementById('passwordInput'); const authError = document.getElementById('auth-error');
const playerNameDisplay = document.getElementById('playerNameDisplay'); const playerRankDisplay = document.getElementById('playerRankDisplay');
const findMatchBtn = document.getElementById('findMatchBtn'); const statusDiv = document.getElementById('status'); 
const roleDisplay = document.getElementById('player-role-display'); const turnDisplay = document.getElementById('turn-display');

const stttContainer = document.getElementById('sttt-container'); const stttBoard = document.getElementById('sttt-board');
const tttContainer = document.getElementById('ttt-container'); const tttBoard = document.getElementById('ttt-board');
const c4Container = document.getElementById('c4-container'); const c4Board = document.getElementById('c4-board');
const dabContainer = document.getElementById('dab-container'); const dabBoard = document.getElementById('dab-board');
const bsContainer = document.getElementById('bs-container'); const bsMyBoard = document.getElementById('bs-my-board'); const bsTrackingBoard = document.getElementById('bs-tracking-board');

const mcContainer = document.getElementById('mc-container'); const mcBoard = document.getElementById('mc-board');
let mcSelected = null; let lastChessGame = null;
const chessIcons = { 1: '♚\uFE0E', 2: '♛\uFE0E', 3: '♝\uFE0E', 4: '♜\uFE0E', 5: '♟\uFE0E' };

// COSMETIC HELPERS
const COLOR_MAP = { red: '#ff4757', orange: '#ffa502', yellow: '#eccc68', green: '#2ed573', blue: '#1e90ff', purple: '#a29bfe', none: null };
window.p1Color = 'var(--primary)'; window.p2Color = 'var(--secondary)';

function getChessPlayerClient(piece) { if (piece >= 11 && piece <= 15) return 'Player 1'; if (piece >= 21 && piece <= 25) return 'Player 2'; return null; }
function checkLineOfSightClient(board, fromR, fromC, toR, toC) { let rStep = toR === fromR ? 0 : (toR - fromR) / Math.abs(toR - fromR); let cStep = toC === fromC ? 0 : (toC - fromC) / Math.abs(toC - fromC); let r = fromR + rStep; let c = fromC + cStep; while (r !== toR || c !== toC) { if (board[r][c] !== 0) return false; r += rStep; c += cStep; } return true; }
function isValidChessMoveClient(board, player, fromR, fromC, toR, toC) { if (fromR === toR && fromC === toC) return false; let piece = board[fromR][fromC]; let target = board[toR][toC]; if (target !== 0 && getChessPlayerClient(target) === player) return false; let dr = toR - fromR; let dc = toC - fromC; let adr = Math.abs(dr); let adc = Math.abs(dc); let type = piece % 10; if (type === 1) return adr <= 1 && adc <= 1; if (type === 2) return (adr === adc || adr === 0 || adc === 0) && checkLineOfSightClient(board, fromR, fromC, toR, toC); if (type === 3) return (adr === adc) && checkLineOfSightClient(board, fromR, fromC, toR, toC); if (type === 4) return (adr === 0 || adc === 0) && checkLineOfSightClient(board, fromR, fromC, toR, toC); if (type === 5) { let dir = player === 'Player 1' ? 1 : -1; if (dc === dir && adr === 0 && target === 0) return true; if (dc === dir && adr === 1 && target !== 0) return true; return false; } return false; }

const c8Container = document.getElementById('c8-container'); const c8OppHand = document.getElementById('c8-opp-hand'); const c8MyHand = document.getElementById('c8-my-hand'); const c8Discard = document.getElementById('c8-discard'); const c8Deck = document.getElementById('c8-deck'); const c8ActiveSuit = document.getElementById('c8-active-suit');
const rmContainer = document.getElementById('rm-container'); const rmOppHand = document.getElementById('rm-opp-hand'); const rmMyHand = document.getElementById('rm-my-hand'); const rmDiscardPile = document.getElementById('rm-discard-pile'); const rmDeck = document.getElementById('rm-deck'); const rmMeldArea = document.getElementById('rm-meld-area');

let currentRoom = null, mySymbol = null, currentGameType = null, myUsername = null, myUserObj = null; 
let myPrivateCode = null; let isLobbyHost = false; let isPrivateGame = false;
let localBattleshipBoard = Array(10).fill(null).map(() => Array(10).fill(0));
let pendingC8CardIndex = null; let lastTopCardStr = ""; 
let rummySelectedIndices = []; let rummySelectedMeldId = null;

socket.on('onlineCount', (count) => { document.getElementById('online-counter').innerText = `🟢 Players Online: ${count}`; });
window.onload = () => { const savedUser = localStorage.getItem('boarders_account'); if (savedUser) { const { username, password } = JSON.parse(savedUser); usernameInput.value = username; passwordInput.value = password; handleAuth('login'); } };

async function handleAuth(action) {
    const username = usernameInput.value, password = passwordInput.value; if (!username || !password) return authError.innerText = "Enter username and password.";
    const res = await fetch(`/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok) { myUserObj = data.user; localStorage.setItem('boarders_account', JSON.stringify({ username, password })); myUsername = myUserObj.username; authSection.style.display = 'none'; gameSection.style.display = 'block'; updateDashboardUI(); } else { localStorage.removeItem('boarders_account'); authError.innerText = data.error; }
}

function updateDashboardUI() {
    playerNameDisplay.innerText = myUserObj.username; playerRankDisplay.innerText = myUserObj.rank;
    document.getElementById('playerBucksDisplay').innerText = myUserObj.bucks || 0; 
    
    // Apply Dashboard Cosmetics
    const dashPfp = document.getElementById('dashPfpDisplay');
    dashPfp.src = myUserObj.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUserObj.username}`;
    
    const borderEq = myUserObj.equipped?.border?.replace('border_', '') || 'none';
    const bannerEq = myUserObj.equipped?.banner?.replace('banner_', '') || 'none';
    
    dashPfp.style.borderColor = COLOR_MAP[borderEq] || 'white';
    document.querySelector('.dash-profile-top').style.background = COLOR_MAP[bannerEq] ? `${COLOR_MAP[bannerEq]}40` : 'rgba(255,255,255,0.5)'; // Add transparency

    document.getElementById('playerDescDisplay').innerText = `"${myUserObj.description}"`;
}

document.getElementById('registerBtn').addEventListener('click', () => handleAuth('register')); document.getElementById('loginBtn').addEventListener('click', () => handleAuth('login')); document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('boarders_account'); location.reload(); });

document.getElementById('openAccountBtn').addEventListener('click', () => { document.getElementById('setUsername').value = myUserObj.username; document.getElementById('setPassword').value = ''; document.getElementById('setProfilePic').value = myUserObj.profilePic.includes('api.dicebear.com') ? '' : myUserObj.profilePic; document.getElementById('setDesc').value = myUserObj.description; document.getElementById('setAnon').checked = myUserObj.isAnonymous; document.getElementById('settingsPfpPreview').src = myUserObj.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUserObj.username}`; document.getElementById('account-modal').style.display = 'flex'; });
document.getElementById('setProfilePic').addEventListener('input', (e) => { document.getElementById('settingsPfpPreview').src = e.target.value || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUserObj.username}`; });
document.getElementById('closeAccountBtn').addEventListener('click', () => document.getElementById('account-modal').style.display = 'none');

document.getElementById('saveAccountBtn').addEventListener('click', async () => {
    const newUsername = document.getElementById('setUsername').value; const newPassword = document.getElementById('setPassword').value; let profilePic = document.getElementById('setProfilePic').value; if (!profilePic.trim()) profilePic = `https://api.dicebear.com/7.x/bottts/svg?seed=${newUsername || myUserObj.username}`;
    const res = await fetch('/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentUsername: myUserObj.username, newUsername: newUsername || undefined, newPassword: newPassword || undefined, profilePic, description: document.getElementById('setDesc').value, isAnonymous: document.getElementById('setAnon').checked }) });
    const data = await res.json();
    if (res.ok) { myUserObj = data.user; myUsername = myUserObj.username; localStorage.setItem('boarders_account', JSON.stringify({ username: myUserObj.username, password: newPassword || JSON.parse(localStorage.getItem('boarders_account')).password })); updateDashboardUI(); document.getElementById('account-modal').style.display = 'none'; } else { document.getElementById('account-error').innerText = data.error; }
});

document.getElementById('viewLeaderboardBtn').addEventListener('click', async () => { document.getElementById('leaderboard-modal').style.display = 'flex'; const res = await fetch('/leaderboard'); const data = await res.json(); document.getElementById('leaderboard-content').innerHTML = data.map((u, i) => `<div class="leaderboard-item"><div class="lb-left"><span style="font-weight: 900; margin-right: 15px; color: var(--secondary);">#${i+1}</span><img src="${u.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}"><span>${u.username}</span></div><span style="color:var(--primary);">${u.rank} ⭐</span></div>`).join(''); }); 
document.getElementById('closeLeaderboardBtn').addEventListener('click', () => { document.getElementById('leaderboard-modal').style.display = 'none'; });
document.getElementById('viewStatsBtn').addEventListener('click', () => { if (window.renderStatsUI) window.renderStatsUI(); document.getElementById('stats-modal').style.display = 'flex'; });
document.getElementById('closeStatsBtn').addEventListener('click', () => { document.getElementById('stats-modal').style.display = 'none'; });
document.getElementById('howToPlayBtn').addEventListener('click', () => { if (window.renderHowToPlay) window.renderHowToPlay(); document.getElementById('howtoplay-modal').style.display = 'flex'; });
document.getElementById('closeHowToPlayBtn').addEventListener('click', () => { document.getElementById('howtoplay-modal').style.display = 'none'; });

document.getElementById('openShopBtn').addEventListener('click', () => { if (window.renderShop) window.renderShop(); document.getElementById('shop-modal').style.display = 'flex'; });
document.getElementById('openLockerBtn').addEventListener('click', () => { if (window.renderLocker) window.renderLocker(); document.getElementById('locker-modal').style.display = 'flex'; });

findMatchBtn.addEventListener('click', () => { socket.emit('joinQueue', myUsername); statusDiv.innerText = 'Searching for a match... ⏳'; findMatchBtn.disabled = true; }); 
document.getElementById('quitBtn').addEventListener('click', () => { socket.emit('quitGame'); });

socket.on('matchFound', (data) => { 
    document.getElementById('private-lobby-modal').style.display = 'none'; statusDiv.innerText = `Match found! 🎯`; gameSection.classList.add('fade-out'); 
    const rScreen = document.getElementById('roulette-screen'); const rStrip = document.getElementById('roulette-strip');
    const gamesList = ['Super Tic-Tac-Toe', 'Endless Tic-Tac-Toe', 'Connect 4', 'Dots and Boxes', 'Battleship', 'Mini Chess', 'Crazy Eights', 'Rummy'];
    let stripHTML = ''; for(let i=0; i<30; i++) { stripHTML += `<div class="roulette-item">${gamesList[Math.floor(Math.random() * gamesList.length)]}</div>`; }
    stripHTML += `<div class="roulette-item" style="color: var(--primary);">${data.game}</div>`;
    rStrip.innerHTML = stripHTML; rScreen.style.display = 'flex';
    rStrip.style.transition = 'none'; rStrip.style.transform = 'translateY(0)'; 
    setTimeout(() => { rStrip.style.transition = 'transform 3.5s cubic-bezier(0.15, 0.85, 0.3, 1)'; rStrip.style.transform = `translateY(-${30 * 120}px)`; }, 50);
});

document.getElementById('privateGameMenuBtn').addEventListener('click', () => document.getElementById('private-menu-modal').style.display = 'flex'); document.getElementById('closePrivateMenuBtn').addEventListener('click', () => document.getElementById('private-menu-modal').style.display = 'none'); document.getElementById('hostBtn').addEventListener('click', () => { document.getElementById('private-menu-modal').style.display = 'none'; document.getElementById('host-modal').style.display = 'flex'; }); document.getElementById('cancelHostBtn').addEventListener('click', () => document.getElementById('host-modal').style.display = 'none'); document.getElementById('joinBtn').addEventListener('click', () => { document.getElementById('private-menu-modal').style.display = 'none'; document.getElementById('join-modal').style.display = 'flex'; }); document.getElementById('cancelJoinBtn').addEventListener('click', () => document.getElementById('join-modal').style.display = 'none');
document.getElementById('confirmHostBtn').addEventListener('click', () => { const code = document.getElementById('hostCodeInput').value; if (code.length !== 4) return document.getElementById('host-error').innerText = "Code must be 4 characters."; document.getElementById('host-error').innerText = ""; socket.emit('createPrivateRoom', { username: myUsername, code }); }); document.getElementById('confirmJoinBtn').addEventListener('click', () => { const code = document.getElementById('joinCodeInput').value; if (code.length !== 4) return document.getElementById('join-error').innerText = "Code must be 4 characters."; document.getElementById('join-error').innerText = ""; socket.emit('joinPrivateRoom', { username: myUsername, code }); });
socket.on('privateError', (msg) => { alert(msg); location.reload(); }); 
socket.on('privateRoomJoined', (data) => { document.getElementById('host-modal').style.display = 'none'; document.getElementById('join-modal').style.display = 'none'; document.getElementById('private-lobby-modal').style.display = 'flex'; myPrivateCode = data.code; isLobbyHost = data.isHost; document.getElementById('lobbyCodeDisplay').innerText = data.code; document.getElementById('lobbyPlayersDisplay').innerText = data.players.join(' & '); document.getElementById('chat-box').innerHTML = '<div class="chat-msg"><i>Welcome to the private lobby!</i></div>'; if (isLobbyHost) document.getElementById('hostControls').style.display = 'block'; });
socket.on('updateLobbyPlayers', (players) => { document.getElementById('lobbyPlayersDisplay').innerText = players.join(' & '); if (players.length === 2 && isLobbyHost) { const startBtn = document.getElementById('startPrivateBtn'); startBtn.disabled = false; startBtn.innerText = "Start Game! 🚀"; } });
document.getElementById('sendChatBtn').addEventListener('click', () => { const text = document.getElementById('chatInput').value; if (text && myPrivateCode) { socket.emit('sendPrivateChat', { code: myPrivateCode, message: text, username: myUsername }); document.getElementById('chatInput').value = ''; } }); socket.on('updatePrivateChat', (msg) => { const chatBox = document.getElementById('chat-box'); chatBox.innerHTML += `<div class="chat-msg"><span>${msg.username}:</span> ${msg.text}</div>`; chatBox.scrollTop = chatBox.scrollHeight; });
document.getElementById('startPrivateBtn').addEventListener('click', () => { socket.emit('startPrivateGame', { code: myPrivateCode, gameSelection: document.getElementById('gameSelector').value }); }); document.getElementById('leaveLobbyBtn').addEventListener('click', () => location.reload());

// Generate Grids
for (let i = 0; i < 9; i++) { const macroCell = document.createElement('div'); macroCell.className = 'macro-cell'; macroCell.id = `macro-${i}`; for (let j = 0; j < 9; j++) { const microCell = document.createElement('div'); microCell.className = 'micro-cell'; microCell.id = `micro-${i}-${j}`; microCell.onclick = () => { if (currentGameType === 'Super Tic-Tac-Toe') socket.emit('makeMove', { roomName: currentRoom, macroIndex: i, microIndex: j }); }; macroCell.appendChild(microCell); } stttBoard.appendChild(macroCell); }
for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const cell = document.createElement('div'); cell.className = 'ttt-cell'; cell.id = `ttt-${r}-${c}`; cell.onclick = () => { if (currentGameType === 'Endless Tic-Tac-Toe') socket.emit('makeTTTEndlessMove', { roomName: currentRoom, r, c }); }; tttBoard.appendChild(cell); } }
for (let r = 0; r < 6; r++) { for (let c = 0; c < 7; c++) { const cell = document.createElement('div'); cell.className = 'c4-cell'; cell.id = `c4-${r}-${c}`; cell.onclick = () => { if (currentGameType === 'Connect 4') socket.emit('makeC4Move', { roomName: currentRoom, col: c }); }; c4Board.appendChild(cell); } }
for (let r = 0; r < 7; r++) { for (let c = 0; c < 7; c++) { const div = document.createElement('div'); if (r % 2 === 0 && c % 2 === 0) div.className = 'dab-dot'; else if (r % 2 === 0 && c % 2 !== 0) { div.className = 'dab-hline'; const hRow = r / 2; const hCol = Math.floor(c / 2); div.id = `h-${hRow}-${hCol}`; div.onclick = () => { if (currentGameType === 'Dots and Boxes') socket.emit('makeDABMove', { roomName: currentRoom, type: 'h', r: hRow, c: hCol }); }; } else if (r % 2 !== 0 && c % 2 === 0) { div.className = 'dab-vline'; const vRow = Math.floor(r / 2); const vCol = c / 2; div.id = `v-${vRow}-${vCol}`; div.onclick = () => { if (currentGameType === 'Dots and Boxes') socket.emit('makeDABMove', { roomName: currentRoom, type: 'v', r: vRow, c: vCol }); }; } else { div.className = 'dab-box'; div.id = `box-${Math.floor(r / 2)}-${Math.floor(c / 2)}`; } dabBoard.appendChild(div); } }
for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const myCell = document.createElement('div'); myCell.className = 'bs-cell'; myCell.id = `bs-my-${r}-${c}`; bsMyBoard.appendChild(myCell); const targetCell = document.createElement('div'); targetCell.className = 'bs-cell'; targetCell.id = `bs-target-${r}-${c}`; targetCell.onclick = () => { if (currentGameType === 'Battleship') socket.emit('makeBattleshipMove', { roomName: currentRoom, r, c }); }; bsTrackingBoard.appendChild(targetCell); } }

// NEW: MINI CHESS BOARD GENERATION (4x8)
for (let r = 0; r < 4; r++) { 
    for (let c = 0; c < 8; c++) { 
        const cell = document.createElement('div'); 
        cell.id = `mc-${r}-${c}`; 
        cell.className = `mc-cell ${(r + c) % 2 === 0 ? 'mc-light' : 'mc-dark'}`; 
        cell.onclick = () => { 
            if (currentGameType !== 'Mini Chess' || !lastChessGame || lastChessGame.turn !== mySymbol) return;
            const piece = lastChessGame.board[r][c];
            const isMyPiece = (mySymbol === 'Player 1' && piece >= 11 && piece <= 15) || (mySymbol === 'Player 2' && piece >= 21 && piece <= 25);
            
            if (mcSelected) {
                if (isMyPiece) { 
                    mcSelected = {r, c}; updateChessUI(lastChessGame); 
                } else { 
                    if (isValidChessMoveClient(lastChessGame.board, mySymbol, mcSelected.r, mcSelected.c, r, c)) {
                        socket.emit('makeChessMove', { roomName: currentRoom, fromR: mcSelected.r, fromC: mcSelected.c, toR: r, toC: c }); 
                    }
                    mcSelected = null;
                    updateChessUI(lastChessGame); 
                }
            } else {
                if (isMyPiece) { mcSelected = {r, c}; updateChessUI(lastChessGame); }
            }
        }; 
        mcBoard.appendChild(cell); 
    } 
}

socket.on('startGame', (gameState) => {
    currentRoom = gameState.roomName; currentGameType = gameState.gameType; mySymbol = gameState.players[socket.id]; isPrivateGame = gameState.isPrivate; 
    
    const p1Data = gameState.playerData[Object.keys(gameState.players)[0]]; const p2Data = gameState.playerData[Object.keys(gameState.players)[1]];
    
    // EXTRACT AND APPLY IN-GAME COSMETICS
    window.p1Color = COLOR_MAP[p1Data.equipped?.piece?.replace('piece_', '')] || 'var(--primary)';
    window.p2Color = COLOR_MAP[p2Data.equipped?.piece?.replace('piece_', '')] || 'var(--secondary)';
    
    const p1Border = COLOR_MAP[p1Data.equipped?.border?.replace('border_', '')] || 'var(--primary)';
    const p2Border = COLOR_MAP[p2Data.equipped?.border?.replace('border_', '')] || 'var(--secondary)';
    const p1Banner = COLOR_MAP[p1Data.equipped?.banner?.replace('banner_', '')] || '#f1f2f6';
    const p2Banner = COLOR_MAP[p2Data.equipped?.banner?.replace('banner_', '')] || '#f1f2f6';

    document.getElementById('p1-pfp').style.borderColor = p1Border;
    document.getElementById('p2-pfp').style.borderColor = p2Border;
    document.getElementById('p1-info').style.background = p1Banner === '#f1f2f6' ? p1Banner : `${p1Banner}40`;
    document.getElementById('p2-info').style.background = p2Banner === '#f1f2f6' ? p2Banner : `${p2Banner}40`;

    document.getElementById('p1-name').innerText = p1Data.username; document.getElementById('p1-rank').innerText = `${p1Data.rank}⭐`; document.getElementById('p1-pfp').src = p1Data.pfp;
    document.getElementById('p2-name').innerText = p2Data.username; document.getElementById('p2-rank').innerText = `${p2Data.rank}⭐`; document.getElementById('p2-pfp').src = p2Data.pfp;

    if (currentGameType === 'Connect 4') roleDisplay.innerHTML = `You are playing as: <strong>${mySymbol === 'Red' ? '🔴 Red' : '🟡 Yellow'}</strong>`;
    else if (currentGameType === 'Dots and Boxes') roleDisplay.innerHTML = `You are playing as: <strong>${mySymbol === 'Red' ? '🔴 Red' : '🔵 Blue'}</strong>`;
    else if (currentGameType === 'Super Tic-Tac-Toe' || currentGameType === 'Endless Tic-Tac-Toe') roleDisplay.innerHTML = `You are playing as: <strong style="color: ${mySymbol === 'X' ? window.p1Color : window.p2Color};">${mySymbol}</strong>`;
    else if (currentGameType === 'Battleship') roleDisplay.innerHTML = `You are Commander <strong>${mySymbol}</strong>`;
    else if (currentGameType === 'Mini Chess') roleDisplay.innerHTML = `You are <strong>${mySymbol === 'Player 1' ? '🔴 Player 1' : '🔵 Player 2'}</strong>`;
    else if (currentGameType === 'Crazy Eights' || currentGameType === 'Rummy') roleDisplay.innerHTML = `You are <strong>${mySymbol}</strong>`;

    document.getElementById('roulette-screen').style.display = 'none'; 
    gameSection.style.display = 'none'; gameSection.classList.remove('fade-out'); playSection.style.display = 'block'; playSection.classList.add('fade-in');
    
    stttContainer.style.display = 'none'; tttContainer.style.display = 'none'; c4Container.style.display = 'none'; dabContainer.style.display = 'none'; bsContainer.style.display = 'none'; mcContainer.style.display = 'none'; c8Container.style.display = 'none'; rmContainer.style.display = 'none';

    if (currentGameType === 'Super Tic-Tac-Toe') { stttContainer.style.display = 'block'; updateSTTTUI(gameState); } 
    else if (currentGameType === 'Endless Tic-Tac-Toe') { tttContainer.style.display = 'block'; updateTTTEndlessUI(gameState); } 
    else if (currentGameType === 'Connect 4') { c4Container.style.display = 'block'; updateC4UI(gameState); } 
    else if (currentGameType === 'Dots and Boxes') { dabContainer.style.display = 'block'; updateDABUI(gameState); }
    else if (currentGameType === 'Mini Chess') { mcContainer.style.display = 'block'; mcSelected = null; updateChessUI(gameState); }
    else if (currentGameType === 'Battleship') { bsContainer.style.display = 'block'; document.getElementById('bs-setup-menu').style.display = 'block'; document.getElementById('bs-randomize-btn').click(); turnDisplay.innerText = "Arrange your fleet!"; turnDisplay.style.color = "var(--text)"; }
    else if (currentGameType === 'Crazy Eights') { c8Container.style.display = 'flex'; turnDisplay.innerText = "Dealing cards..."; }
    else if (currentGameType === 'Rummy') { rmContainer.style.display = 'flex'; turnDisplay.innerText = "Dealing cards..."; }
});

socket.on('updateTTTEndlessBoard', updateTTTEndlessUI);
function updateTTTEndlessUI(game) {
    turnDisplay.innerText = game.turn === mySymbol ? "🎯 Your Turn!" : "⏳ Opponent's Turn...";
    turnDisplay.style.color = game.turn === mySymbol ? (mySymbol === 'X' ? window.p1Color : window.p2Color) : "var(--secondary)";

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const cell = document.getElementById(`ttt-${r}-${c}`);
            cell.innerHTML = '';
            cell.className = 'ttt-cell'; 
            if (game.board[r][c]) {
                const color = game.board[r][c] === 'X' ? window.p1Color : window.p2Color;
                cell.innerHTML = `<span style="color: ${color}; animation: drawMark 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">${game.board[r][c]}</span>`;
            }
        }
    }

    if (game.history['X'].length === 3) { let oldestX = game.history['X'][0]; const span = document.getElementById(`ttt-${oldestX.r}-${oldestX.c}`).querySelector('span'); if (span) span.classList.add('flicker-piece'); }
    if (game.history['O'].length === 3) { let oldestO = game.history['O'][0]; const span = document.getElementById(`ttt-${oldestO.r}-${oldestO.c}`).querySelector('span'); if (span) span.classList.add('flicker-piece'); }
    if (game.winLine) { game.winLine.forEach(([r, c]) => { document.getElementById(`ttt-${r}-${c}`).classList.add('sttt-win-pulse'); }); }
}

function randomizeBattleship() { localBattleshipBoard = Array(10).fill(null).map(() => Array(10).fill(0)); const ships = [5, 4, 3, 3, 2]; for (let shipLen of ships) { let placed = false; while (!placed) { const isHoriz = Math.random() > 0.5; const r = Math.floor(Math.random() * (isHoriz ? 10 : 10 - shipLen)); const c = Math.floor(Math.random() * (isHoriz ? 10 - shipLen : 10)); let canPlace = true; for (let i = 0; i < shipLen; i++) { if (isHoriz && localBattleshipBoard[r][c + i] !== 0) canPlace = false; if (!isHoriz && localBattleshipBoard[r + i][c] !== 0) canPlace = false; } if (canPlace) { for (let i = 0; i < shipLen; i++) { if (isHoriz) localBattleshipBoard[r][c + i] = 1; else localBattleshipBoard[r + i][c] = 1; } placed = true; } } } drawLocalBattleship(); }
function drawLocalBattleship() { for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const cell = document.getElementById(`bs-my-${r}-${c}`); cell.className = localBattleshipBoard[r][c] === 1 ? 'bs-cell bs-ship' : 'bs-cell'; } } }
document.getElementById('bs-randomize-btn').addEventListener('click', randomizeBattleship); document.getElementById('bs-ready-btn').addEventListener('click', () => { document.getElementById('bs-setup-menu').style.display = 'none'; socket.emit('submitBattleshipBoard', { roomName: currentRoom, board: localBattleshipBoard }); });
socket.on('battleshipWaiting', () => { turnDisplay.innerText = "Waiting for opponent to ready up..."; turnDisplay.style.color = "var(--secondary)"; }); socket.on('battleshipStartPlaying', (data) => { turnDisplay.innerText = data.turn === mySymbol ? "🎯 Your Turn to Fire!" : "⏳ Incoming Fire..."; turnDisplay.style.color = data.turn === mySymbol ? window.p1Color : "var(--secondary)"; });
socket.on('updateBattleshipBoard', (data) => { turnDisplay.innerText = data.turn === mySymbol ? "🎯 Your Turn to Fire!" : "⏳ Incoming Fire..."; turnDisplay.style.color = data.turn === mySymbol ? window.p1Color : "var(--secondary)"; for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const myCell = document.getElementById(`bs-my-${r}-${c}`); if (data.myBoard[r][c] === 1) myCell.className = 'bs-cell bs-ship'; else if (data.myBoard[r][c] === 2) { myCell.className = 'bs-cell bs-miss'; myCell.innerText = '•'; } else if (data.myBoard[r][c] === 3) { myCell.className = 'bs-cell bs-hit'; myCell.innerText = 'X'; } const targetCell = document.getElementById(`bs-target-${r}-${c}`); if (data.trackingBoard[r][c] === 0) { targetCell.className = 'bs-cell'; targetCell.innerText = ''; } else if (data.trackingBoard[r][c] === 2) { targetCell.className = 'bs-cell bs-miss'; targetCell.innerText = '•'; } else if (data.trackingBoard[r][c] === 3) { targetCell.className = 'bs-cell bs-hit'; targetCell.innerText = 'X'; } } } });
socket.on('revealBattleship', (secretBoards) => { const opponentId = Object.keys(secretBoards).find(id => id !== socket.id); const opponentBoard = secretBoards[opponentId]; for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const targetCell = document.getElementById(`bs-target-${r}-${c}`); if (opponentBoard[r][c] === 1 && !targetCell.classList.contains('bs-hit')) { targetCell.className = 'bs-cell bs-ship-revealed'; targetCell.innerText = '🚢'; } } } });

socket.on('updateBoard', updateSTTTUI);
function updateSTTTUI(game) { 
    turnDisplay.innerText = game.turn === mySymbol ? "🎯 Your Turn!" : "⏳ Opponent's Turn..."; turnDisplay.style.color = game.turn === mySymbol ? (mySymbol === 'X' ? window.p1Color : window.p2Color) : "var(--secondary)"; 
    document.querySelectorAll('.macro-cell').forEach(c => { c.classList.remove('sttt-win-pulse'); c.classList.remove('highlight-active'); c.classList.remove('highlight-waiting'); });

    for (let i = 0; i < 9; i++) { 
        const macroDiv = document.getElementById(`macro-${i}`); 
        if (game.macroBoard[i]) { 
            const winnerColor = game.macroBoard[i] === 'X' ? window.p1Color : window.p2Color;
            if (!macroDiv.innerHTML.includes('macro-winner')) { macroDiv.innerHTML = `<div class="macro-winner" style="color: ${winnerColor}">${game.macroBoard[i] === 'Tie' ? '-' : game.macroBoard[i]}</div>`; macroDiv.className = 'macro-cell disabled'; } 
            continue; 
        } 
        if (!game.winner && (game.nextBoard === -1 || game.nextBoard === i)) macroDiv.classList.add(game.turn === mySymbol ? 'highlight-active' : 'highlight-waiting'); else macroDiv.classList.add('disabled');
        for (let j = 0; j < 9; j++) { const microDiv = document.getElementById(`micro-${i}-${j}`); if (microDiv) { const cellValue = game.board[i][j]; if (cellValue && microDiv.innerHTML === '') { const color = cellValue === 'X' ? window.p1Color : window.p2Color; microDiv.innerHTML = `<span style="color: ${color}; animation: drawMark 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">${cellValue}</span>`; } } } 
    } 
    if (game.winLine) { game.winLine.forEach(i => { document.getElementById(`macro-${i}`).classList.add('sttt-win-pulse'); }); }
}

socket.on('updateC4Board', (game) => { 
    turnDisplay.innerText = game.turn === mySymbol ? "🔴 Your Turn!" : "🟡 Opponent's Turn..."; 
    turnDisplay.style.color = game.turn === mySymbol ? (mySymbol==='Red'?window.p1Color:window.p2Color) : (mySymbol==='Red'?window.p2Color:window.p1Color); 
    document.querySelectorAll('.c4-cell').forEach(c => c.classList.remove('c4-win-pulse')); 
    for (let r = 0; r < 6; r++) { 
        for (let c = 0; c < 7; c++) { 
            const cell = document.getElementById(`c4-${r}-${c}`); 
            if (game.board[r][c] === 'Red' && !cell.hasAttribute('data-filled')) { 
                cell.setAttribute('data-filled', 'true'); cell.style.background = `radial-gradient(circle at 30% 30%, #fff, ${window.p1Color})`; cell.style.boxShadow = `0 6px 12px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.3)`; cell.style.border = 'none'; cell.style.animation = 'slideDown 0.4s ease-in forwards';
            } else if (game.board[r][c] === 'Yellow' && !cell.hasAttribute('data-filled')) { 
                cell.setAttribute('data-filled', 'true'); cell.style.background = `radial-gradient(circle at 30% 30%, #fff, ${window.p2Color})`; cell.style.boxShadow = `0 6px 12px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.3)`; cell.style.border = 'none'; cell.style.animation = 'slideDown 0.4s ease-in forwards';
            } 
        } 
    } 
    if (game.winLine) { game.winLine.forEach(([r, c]) => { document.getElementById(`c4-${r}-${c}`).classList.add('c4-win-pulse'); }); } 
});

socket.on('updateDABBoard', (game) => { 
    turnDisplay.innerText = game.turn === mySymbol ? (mySymbol==='Red'?'🔴 Your Turn!':'🔵 Your Turn!') : "⏳ Opponent's Turn..."; 
    turnDisplay.style.color = game.turn === mySymbol ? (mySymbol==='Red'?window.p1Color:window.p2Color) : (mySymbol==='Red'?window.p2Color:window.p1Color); 
    document.getElementById('dab-score-red').innerText = game.scores['Red']; document.getElementById('dab-score-blue').innerText = game.scores['Blue']; 
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 3; c++) { const hLine = document.getElementById(`h-${r}-${c}`); if (game.hLines[r][c] === 'Red') { hLine.style.background = window.p1Color; hLine.style.boxShadow = `0 0 10px ${window.p1Color}`; hLine.style.cursor = 'default'; } else if (game.hLines[r][c] === 'Blue') { hLine.style.background = window.p2Color; hLine.style.boxShadow = `0 0 10px ${window.p2Color}`; hLine.style.cursor = 'default'; } } } 
    for (let r = 0; r < 3; r++) { for (let c = 0; c < 4; c++) { const vLine = document.getElementById(`v-${r}-${c}`); if (game.vLines[r][c] === 'Red') { vLine.style.background = window.p1Color; vLine.style.boxShadow = `0 0 10px ${window.p1Color}`; vLine.style.cursor = 'default'; } else if (game.vLines[r][c] === 'Blue') { vLine.style.background = window.p2Color; vLine.style.boxShadow = `0 0 10px ${window.p2Color}`; vLine.style.cursor = 'default'; } } } 
    for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const box = document.getElementById(`box-${r}-${c}`); if (game.boxes[r][c] === 'Red') { box.style.background = window.p1Color + '25'; box.style.color = window.p1Color; box.innerText = 'R'; box.style.transform = 'scale(0.9)'; box.style.borderRadius = '10px'; } else if (game.boxes[r][c] === 'Blue') { box.style.background = window.p2Color + '25'; box.style.color = window.p2Color; box.innerText = 'B'; box.style.transform = 'scale(0.9)'; box.style.borderRadius = '10px'; } } } 
});

socket.on('updateChessBoard', updateChessUI); 
function updateChessUI(game) { 
    lastChessGame = game; 
    turnDisplay.innerText = game.turn === mySymbol ? "🎯 Your Turn!" : "⏳ Opponent's Turn..."; 
    turnDisplay.style.color = game.turn === mySymbol ? (mySymbol === 'Player 1' ? window.p1Color : window.p2Color) : "var(--secondary)"; 
    if (game.turn !== mySymbol) mcSelected = null; 
    
    for (let r = 0; r < 4; r++) { 
        for (let c = 0; c < 8; c++) { 
            const cell = document.getElementById(`mc-${r}-${c}`); 
            cell.innerHTML = ''; 
            cell.classList.remove('mc-selected'); 
            const p = game.board[r][c]; 
            
            if (p !== 0) { 
                const pieceDiv = document.createElement('div'); 
                pieceDiv.className = 'mc-piece';
                const pColor = p >= 20 ? window.p2Color : window.p1Color;
                pieceDiv.style.color = 'transparent';
                pieceDiv.style.textShadow = `0 0 0 ${pColor}, 0 4px 6px rgba(0,0,0,0.3)`; 
                pieceDiv.innerText = chessIcons[p % 10]; 
                cell.appendChild(pieceDiv); 
            } 
            
            if (mcSelected) {
                if (mcSelected.r === r && mcSelected.c === c) {
                    cell.classList.add('mc-selected'); 
                } else if (isValidChessMoveClient(game.board, mySymbol, mcSelected.r, mcSelected.c, r, c)) {
                    const dot = document.createElement('div');
                    dot.className = p !== 0 ? 'mc-dot-attack' : 'mc-dot';
                    cell.appendChild(dot);
                }
            }
        } 
    } 
}

c8Deck.onclick = () => { if (currentGameType === 'Crazy Eights') socket.emit('makeC8Draw', { roomName: currentRoom }); };
window.selectC8Suit = function(suit) { document.getElementById('c8-suit-modal').style.display = 'none'; socket.emit('makeC8Play', { roomName: currentRoom, cardIndex: pendingC8CardIndex, declaredSuit: suit }); pendingC8CardIndex = null; }

socket.on('updateCrazyEights', (data) => {
    turnDisplay.innerText = data.turn === mySymbol ? "🎯 Your Turn!" : "⏳ Opponent's Turn..."; turnDisplay.style.color = data.turn === mySymbol ? "var(--primary)" : "var(--secondary)";
    document.getElementById('c8-opp-count').innerText = data.opponentHandCount;
    c8OppHand.innerHTML = ''; for(let i=0; i<data.opponentHandCount; i++) c8OppHand.innerHTML += `<div class="c8-card c8-hidden"></div>`;
    c8MyHand.innerHTML = '';
    data.myHand.forEach((card, index) => {
        let colorClass = (card.suit === '♥' || card.suit === '♦') ? 'c8-red' : 'c8-black';
        let cardDiv = document.createElement('div'); cardDiv.className = `c8-card ${colorClass}`; cardDiv.innerHTML = `<div>${card.val}</div><div>${card.suit}</div>`;
        cardDiv.onclick = () => {
            if (data.turn !== mySymbol) return;
            if (card.val === '8') { pendingC8CardIndex = index; document.getElementById('c8-suit-modal').style.display = 'flex'; } else { socket.emit('makeC8Play', { roomName: currentRoom, cardIndex: index, declaredSuit: null }); }
        }; c8MyHand.appendChild(cardDiv);
    });

    if (data.topCard) {
        let colorClass = (data.topCard.suit === '♥' || data.topCard.suit === '♦') ? 'c8-red' : 'c8-black'; let cardStr = `${data.topCard.val}${data.topCard.suit}`;
        c8Discard.innerHTML = `<div>${data.topCard.val}</div><div>${data.topCard.suit}</div>`;
        if (lastTopCardStr !== cardStr) { c8Discard.className = `c8-card ${colorClass}`; void c8Discard.offsetWidth; c8Discard.classList.add('drop-anim'); lastTopCardStr = cardStr; } else { c8Discard.className = `c8-card ${colorClass} drop-anim`; }
    }
    if (data.activeSuit) { c8ActiveSuit.innerText = data.activeSuit; c8ActiveSuit.className = (data.activeSuit === '♥' || data.activeSuit === '♦') ? 'c8-red' : 'c8-black'; } else { c8ActiveSuit.innerText = ''; }
});

rmDeck.onclick = () => { if (currentGameType === 'Rummy') socket.emit('makeRummyDraw', { roomName: currentRoom, source: 'deck' }); };
document.getElementById('rm-meld-btn').onclick = () => { if (currentGameType === 'Rummy' && rummySelectedIndices.length >= 3) { socket.emit('makeRummyMeld', { roomName: currentRoom, cardIndices: rummySelectedIndices }); rummySelectedIndices = []; } };
document.getElementById('rm-layoff-btn').onclick = () => { if (currentGameType === 'Rummy' && rummySelectedIndices.length === 1 && rummySelectedMeldId) { socket.emit('makeRummyLayOff', { roomName: currentRoom, cardIndex: rummySelectedIndices[0], meldId: rummySelectedMeldId }); rummySelectedIndices = []; rummySelectedMeldId = null; } };
document.getElementById('rm-discard-btn').onclick = () => { if (currentGameType === 'Rummy' && rummySelectedIndices.length === 1) { socket.emit('makeRummyDiscard', { roomName: currentRoom, cardIndex: rummySelectedIndices[0] }); rummySelectedIndices = []; rummySelectedMeldId = null; } };

socket.on('updateRummy', (data) => {
    if (data.turn === mySymbol) { turnDisplay.innerText = data.phase === 'draw' ? "📥 Your Turn - Draw a Card" : "🎯 Your Turn - Meld or Discard"; turnDisplay.style.color = data.phase === 'draw' ? "var(--accent)" : "var(--primary)"; } else { turnDisplay.innerText = "⏳ Opponent's Turn..."; turnDisplay.style.color = "var(--secondary)"; }

    const isMyPlayPhase = data.turn === mySymbol && data.phase === 'play';
    document.getElementById('rm-meld-btn').disabled = !isMyPlayPhase; document.getElementById('rm-layoff-btn').disabled = !isMyPlayPhase; document.getElementById('rm-discard-btn').disabled = !isMyPlayPhase;

    document.getElementById('rm-opp-count').innerText = data.opponentHandCount;
    rmOppHand.innerHTML = ''; for(let i=0; i<data.opponentHandCount; i++) rmOppHand.innerHTML += `<div class="rm-card rm-hidden"></div>`;

    rmMyHand.innerHTML = '';
    data.myHand.forEach((card, index) => {
        let colorClass = (card.suit === '♥' || card.suit === '♦') ? 'c8-red' : 'c8-black';
        let cardDiv = document.createElement('div'); cardDiv.className = `rm-card ${colorClass} ${rummySelectedIndices.includes(index) ? 'selected' : ''}`; cardDiv.innerHTML = `<div>${card.val}</div><div>${card.suit}</div>`;
        cardDiv.onclick = () => {
            if (!isMyPlayPhase) return;
            if (rummySelectedIndices.includes(index)) { rummySelectedIndices = rummySelectedIndices.filter(i => i !== index); cardDiv.classList.remove('selected'); } else { rummySelectedIndices.push(index); cardDiv.classList.add('selected'); }
        }; rmMyHand.appendChild(cardDiv);
    });

    rmDiscardPile.innerHTML = '';
    data.discardPile.forEach((card, index) => {
        let colorClass = (card.suit === '♥' || card.suit === '♦') ? 'c8-red' : 'c8-black';
        let cardDiv = document.createElement('div'); cardDiv.className = `rm-card rm-discard-card ${colorClass}`; cardDiv.style.left = `${index * 25}px`; cardDiv.innerHTML = `<div>${card.val}</div><div>${card.suit}</div>`;
        cardDiv.onclick = () => { if (data.turn === mySymbol && data.phase === 'draw') socket.emit('makeRummyDraw', { roomName: currentRoom, source: 'discard', index: index }); }; rmDiscardPile.appendChild(cardDiv);
    });

    rmMeldArea.innerHTML = '';
    data.melds.forEach(meld => {
        let meldDiv = document.createElement('div'); meldDiv.className = `rm-meld ${rummySelectedMeldId === meld.id ? 'selected' : ''}`;
        meld.cards.forEach(card => { let colorClass = (card.suit === '♥' || card.suit === '♦') ? 'c8-red' : 'c8-black'; meldDiv.innerHTML += `<div class="rm-card ${colorClass}"><div>${card.val}</div><div>${card.suit}</div></div>`; });
        meldDiv.onclick = () => { if (!isMyPlayPhase) return; rummySelectedMeldId = meld.id; document.querySelectorAll('.rm-meld').forEach(m => m.classList.remove('selected')); meldDiv.classList.add('selected'); }; rmMeldArea.appendChild(meldDiv);
    });
});

document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') { document.getElementById('howtoplay-modal').style.display = 'none'; document.getElementById('stats-modal').style.display = 'none'; document.getElementById('leaderboard-modal').style.display = 'none'; document.getElementById('private-menu-modal').style.display = 'none'; document.getElementById('host-modal').style.display = 'none'; document.getElementById('join-modal').style.display = 'none'; document.getElementById('account-modal').style.display = 'none'; document.getElementById('shop-modal').style.display = 'none'; document.getElementById('locker-modal').style.display = 'none'; document.getElementById('returnToResultsBtn').click(); }
    if (e.key === 'Enter') { const active = document.activeElement; if (active === document.getElementById('chatInput')) document.getElementById('sendChatBtn').click(); else if (active === document.getElementById('hostCodeInput')) document.getElementById('confirmHostBtn').click(); else if (active === document.getElementById('joinCodeInput')) document.getElementById('confirmJoinBtn').click(); else if (active === document.getElementById('usernameInput') || active === document.getElementById('passwordInput')) document.getElementById('loginBtn').click(); }
}); 

socket.on('gameOverScreen', (data) => { 
    const amIWinner = data.winnerId === socket.id; const amILoser = data.loserId === socket.id; 
    if (currentGameType && (amIWinner || amILoser || data.isTie)) { if (window.recordGameResult) window.recordGameResult(currentGameType, amIWinner, data.isTie); }
    currentGameType = null; const title = document.getElementById('go-title'); const msg = document.getElementById('go-message'); const points = document.getElementById('go-points'); const modal = document.getElementById('game-over-modal'); const playersContainer = document.getElementById('go-players-container'); 
    
    if (amIWinner && data.newWinnerBucks !== undefined) { myUserObj.bucks = data.newWinnerBucks; }

    const rummyScoresDiv = document.getElementById('go-rummy-scores');
    if (data.rummyScores && !data.isQuit) { rummyScoresDiv.style.display = 'block'; rummyScoresDiv.innerHTML = `Final Match Scores:<br>Player 1: ${data.rummyScores['Player 1']} pts | Player 2: ${data.rummyScores['Player 2']} pts`; } else { rummyScoresDiv.style.display = 'none'; }

    if (data.isTie) { title.innerText = "It's a Tie! 🤝"; title.className = "win-text"; msg.innerText = "Good game!"; points.innerText = "+0 Points"; points.className = ""; playersContainer.style.display = 'none';
    } else { 
        playersContainer.style.display = 'flex'; title.innerText = amIWinner ? "Victory! 🏆" : "Defeat! 💀"; title.className = amIWinner ? "win-text" : "lose-text"; msg.innerText = data.isQuit ? (amIWinner ? "Your opponent fled!" : "You quit the game!") : (amIWinner ? "You crushed them!" : "Better luck next time."); points.innerText = amIWinner ? `+${data.pointsWon} Points\n+5 Bucks 💵` : `-${data.pointsLost} Points`; points.className = amIWinner ? "win-text" : "lose-text"; 
        if (amIWinner) { playerRankDisplay.innerText = data.newWinnerRank; myUserObj.rank = data.newWinnerRank; } else { playerRankDisplay.innerText = data.newLoserRank; myUserObj.rank = data.newLoserRank; }
        
        // GameOver PFP Cosmetics
        const wBorder = COLOR_MAP[data.winnerData.equipped?.border?.replace('border_', '')] || 'var(--secondary)';
        const lBorder = COLOR_MAP[data.loserData.equipped?.border?.replace('border_', '')] || 'var(--primary)';
        
        document.getElementById('go-winner-pfp').src = data.winnerData.pfp; document.getElementById('go-winner-pfp').style.borderColor = wBorder; document.getElementById('go-winner-name').innerText = data.winnerData.username; document.getElementById('go-winner-rank').innerText = `${data.newWinnerRank}⭐`;
        document.getElementById('go-loser-pfp').src = data.loserData.pfp; document.getElementById('go-loser-pfp').style.borderColor = lBorder; document.getElementById('go-loser-name').innerText = data.loserData.username; document.getElementById('go-loser-rank').innerText = `${data.newLoserRank}⭐`;
    } modal.style.display = 'flex'; 
});

document.getElementById('viewBoardBtn').addEventListener('click', () => { document.getElementById('game-over-modal').classList.add('peek-mode'); document.getElementById('returnToResultsBtn').style.display = 'block'; });
document.getElementById('returnToResultsBtn').addEventListener('click', () => { document.getElementById('game-over-modal').classList.remove('peek-mode'); document.getElementById('returnToResultsBtn').style.display = 'none'; });

function resetBoardUI() {
    stttBoard.innerHTML = ''; for (let i = 0; i < 9; i++) { const macroCell = document.createElement('div'); macroCell.className = 'macro-cell'; macroCell.id = `macro-${i}`; for (let j = 0; j < 9; j++) { const microCell = document.createElement('div'); microCell.className = 'micro-cell'; microCell.id = `micro-${i}-${j}`; microCell.onclick = () => { if (currentGameType === 'Super Tic-Tac-Toe') socket.emit('makeMove', { roomName: currentRoom, macroIndex: i, microIndex: j }); }; macroCell.appendChild(microCell); } stttBoard.appendChild(macroCell); }
    tttBoard.innerHTML = ''; for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const cell = document.createElement('div'); cell.className = 'ttt-cell'; cell.id = `ttt-${r}-${c}`; cell.onclick = () => { if (currentGameType === 'Endless Tic-Tac-Toe') socket.emit('makeTTTEndlessMove', { roomName: currentRoom, r, c }); }; tttBoard.appendChild(cell); } }
    for (let r = 0; r < 6; r++) { for (let c = 0; c < 7; c++) { const cell = document.getElementById(`c4-${r}-${c}`); cell.className = 'c4-cell'; cell.removeAttribute('data-filled'); cell.removeAttribute('style'); } }
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 3; c++) { const h = document.getElementById(`h-${r}-${c}`); if(h) { h.className = 'dab-hline'; h.removeAttribute('style'); } } } for (let r = 0; r < 3; r++) { for (let c = 0; c < 4; c++) { const v = document.getElementById(`v-${r}-${c}`); if(v) { v.className = 'dab-vline'; v.removeAttribute('style'); } } } for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const b = document.getElementById(`box-${r}-${c}`); if(b) { b.className = 'dab-box'; b.innerText = ''; b.removeAttribute('style'); } } } document.getElementById('dab-score-red').innerText = '0'; document.getElementById('dab-score-blue').innerText = '0';
    for (let r = 0; r < 10; r++) { for (let c = 0; c < 10; c++) { const m = document.getElementById(`bs-my-${r}-${c}`); if(m) { m.className = 'bs-cell'; m.innerText = ''; } const t = document.getElementById(`bs-target-${r}-${c}`); if(t) { t.className = 'bs-cell'; t.innerText = ''; } } }
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 8; c++) { const cell = document.getElementById(`mc-${r}-${c}`); if(cell) { cell.innerHTML = ''; cell.classList.remove('mc-selected'); } } }
    c8MyHand.innerHTML = ''; c8OppHand.innerHTML = ''; c8Discard.innerHTML = ''; c8ActiveSuit.innerText = ''; document.getElementById('c8-suit-modal').style.display = 'none'; lastTopCardStr = ""; 
    rmMyHand.innerHTML = ''; rmOppHand.innerHTML = ''; rmDiscardPile.innerHTML = ''; rmMeldArea.innerHTML = ''; rummySelectedIndices = []; rummySelectedMeldId = null;
    document.getElementById('game-over-modal').classList.remove('peek-mode'); document.getElementById('returnToResultsBtn').style.display = 'none'; document.getElementById('roulette-screen').style.display = 'none';
}

document.getElementById('returnLobbyBtn').addEventListener('click', () => { 
    document.getElementById('game-over-modal').style.display = 'none'; playSection.style.display = 'none'; playSection.classList.remove('fade-in'); resetBoardUI(); 
    if (isPrivateGame) { document.getElementById('private-lobby-modal').style.display = 'flex'; } else { statusDiv.innerText = "Ready to play?"; findMatchBtn.disabled = false; gameSection.style.display = 'block'; gameSection.classList.add('fade-in'); updateDashboardUI(); } 
});