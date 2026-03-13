require('dotenv').config(); 
const express = require('express'); const http = require('http'); const { Server } = require('socket.io'); const path = require('path'); const bcrypt = require('bcryptjs'); const mongoose = require('mongoose'); 

const stttLogic = require('./games/superTicTacToe'); const c4Logic = require('./games/connect4'); const dabLogic = require('./games/dotsAndBoxes'); const bsLogic = require('./games/battleship'); const chkLogic = require('./games/checkers');

const app = express(); const server = http.createServer(app); const io = new Server(server);
app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Connected to MongoDB permanently!')).catch(err => console.error('❌ MongoDB Connection Error:', err));

const userSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, rank: { type: Number, default: 100 }, profilePic: { type: String, default: '' }, description: { type: String, default: 'I love Boarders!' }, isAnonymous: { type: Boolean, default: false } });
const User = mongoose.model('User', userSchema);

let matchmakingQueue = []; const activeGames = {}; let onlinePlayersCount = 0; const privateRooms = {}; 

app.post('/register', async (req, res) => { try { const { username, password } = req.body; if (await User.findOne({ username })) return res.status(400).json({ error: 'Username taken' }); const hashedPassword = await bcrypt.hash(password, 10); const defaultPfp = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`; const newUser = new User({ username, password: hashedPassword, rank: 100, profilePic: defaultPfp }); await newUser.save(); res.json({ message: 'Success!', user: newUser }); } catch (err) { res.status(500).json({ error: 'Server Error' }); } });
app.post('/login', async (req, res) => { try { const { username, password } = req.body; const user = await User.findOne({ username }); if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' }); res.json({ message: 'Success!', user }); } catch (err) { res.status(500).json({ error: 'Server Error' }); } });
app.post('/update-profile', async (req, res) => { try { const { currentUsername, newUsername, newPassword, profilePic, description, isAnonymous } = req.body; const user = await User.findOne({ username: currentUsername }); if (!user) return res.status(404).json({ error: 'User not found' }); if (newUsername && newUsername !== currentUsername) { const exists = await User.findOne({ username: newUsername }); if (exists) return res.status(400).json({ error: 'New username already taken' }); user.username = newUsername; } if (newPassword) user.password = await bcrypt.hash(newPassword, 10); if (profilePic !== undefined) user.profilePic = profilePic; if (description !== undefined) user.description = description; if (isAnonymous !== undefined) user.isAnonymous = isAnonymous; await user.save(); res.json({ message: 'Profile updated!', user }); } catch (err) { res.status(500).json({ error: 'Server Error' }); } });
app.get('/leaderboard', async (req, res) => { try { res.json(await User.find({}, 'username rank profilePic').sort({ rank: -1 }).limit(10)); } catch (err) { res.status(500).json({ error: 'Server Error' }); } });

async function handleGameEnd(roomName, winnerId, loserId, isQuit = false) { 
    const game = activeGames[roomName]; if (!game) return; 
    let newWinnerRank = 100, newLoserRank = 100; let winnerData = null, loserData = null;
    if (winnerId && loserId) { 
        try { const winnerUser = await User.findOne({ username: game.playerUsernames[winnerId] }); const loserUser = await User.findOne({ username: game.playerUsernames[loserId] }); if (winnerUser) { winnerUser.rank += 50; await winnerUser.save(); newWinnerRank = winnerUser.rank; winnerData = { username: winnerUser.username, pfp: winnerUser.profilePic, isAnon: winnerUser.isAnonymous }; } if (loserUser) { loserUser.rank = Math.max(0, loserUser.rank - 50); await loserUser.save(); newLoserRank = loserUser.rank; loserData = { username: loserUser.username, pfp: loserUser.profilePic, isAnon: loserUser.isAnonymous }; } } catch (err) { console.error(err); } 
    } 
    const isPrivate = game.privateCode != null;
    if (!isPrivate) { if (winnerData?.isAnon) winnerData = { username: 'Anonymous', pfp: 'https://api.dicebear.com/7.x/identicon/svg?seed=Anon' }; if (loserData?.isAnon) loserData = { username: 'Anonymous', pfp: 'https://api.dicebear.com/7.x/identicon/svg?seed=Anon' }; }
    io.to(roomName).emit('gameOverScreen', { winnerId, loserId, isQuit, isTie: !winnerId && !loserId, newWinnerRank, newLoserRank, winnerData, loserData }); delete activeGames[roomName]; 
}

async function initializeGame(roomName, chosenGame, player1, player2, privateCode = null) {
    activeGames[roomName] = { roomName, gameType: chosenGame, playerUsernames: { [player1.id]: player1.username, [player2.id]: player2.username }, winner: null }; io.to(roomName).emit('matchFound', { message: 'Match starting!', game: chosenGame });
    const u1 = await User.findOne({ username: player1.username }); const u2 = await User.findOne({ username: player2.username });
    const getPlayerData = (user, fallbackName) => { if (!privateCode && user?.isAnonymous) { return { username: 'Anonymous', rank: '???', pfp: 'https://api.dicebear.com/7.x/identicon/svg?seed=Anon' }; } return { username: user?.username || fallbackName, rank: user?.rank || 100, pfp: user?.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackName}` }; };
    const p1Data = getPlayerData(u1, player1.username); const p2Data = getPlayerData(u2, player2.username);

    setTimeout(() => {
        const game = activeGames[roomName]; if (!game) return; 
        let safeGameState = { roomName, gameType: chosenGame, isPrivate: !!privateCode, privateCode, playerData: { [player1.id]: p1Data, [player2.id]: p2Data } };

        if (chosenGame === 'Super Tic-Tac-Toe') { game.players = { [player1.id]: 'X', [player2.id]: 'O' }; game.board = Array(9).fill(null).map(() => Array(9).fill(null)); game.macroBoard = Array(9).fill(null); game.turn = 'X'; game.nextBoard = -1; safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.macroBoard = game.macroBoard; safeGameState.turn = game.turn; safeGameState.nextBoard = game.nextBoard;
        } else if (chosenGame === 'Connect 4') { game.players = { [player1.id]: 'Red', [player2.id]: 'Yellow' }; game.board = Array(6).fill(null).map(() => Array(7).fill(null)); game.turn = 'Red'; safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.turn = game.turn;
        } else if (chosenGame === 'Dots and Boxes') { game.players = { [player1.id]: 'Red', [player2.id]: 'Blue' }; game.hLines = Array(4).fill(null).map(() => Array(3).fill(null)); game.vLines = Array(3).fill(null).map(() => Array(4).fill(null)); game.boxes = Array(3).fill(null).map(() => Array(3).fill(null)); game.scores = { 'Red': 0, 'Blue': 0 }; game.turn = 'Red'; safeGameState.players = game.players; safeGameState.hLines = game.hLines; safeGameState.vLines = game.vLines; safeGameState.boxes = game.boxes; safeGameState.scores = game.scores; safeGameState.turn = game.turn;
        } else if (chosenGame === 'Battleship') { game.players = { [player1.id]: 'Player 1', [player2.id]: 'Player 2' }; game.phase = 'setup'; game.ready = { [player1.id]: false, [player2.id]: false }; game.secretBoards = { [player1.id]: null, [player2.id]: null }; game.trackingBoards = { [player1.id]: Array(10).fill(null).map(()=>Array(10).fill(0)), [player2.id]: Array(10).fill(null).map(()=>Array(10).fill(0)) }; game.health = { [player1.id]: 17, [player2.id]: 17 }; game.turn = 'Player 1'; safeGameState.players = game.players; safeGameState.phase = game.phase;
        } else if (chosenGame === 'Checkers') { game.players = { [player1.id]: 'Red', [player2.id]: 'Black' }; game.turn = 'Red'; game.redCount = 12; game.blackCount = 12; game.board = Array(8).fill(null).map(() => Array(8).fill(0)); for (let r=0; r<8; r++) { for (let c=0; c<8; c++) { if ((r+c)%2 !== 0) { if (r < 3) game.board[r][c] = 1; else if (r > 4) game.board[r][c] = 2; } } } safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.turn = game.turn; }
        
        io.to(roomName).emit('startGame', safeGameState);
    }, 5000);
}

io.on('connection', (socket) => {
    onlinePlayersCount++; io.emit('onlineCount', onlinePlayersCount);
    socket.on('joinQueue', (username) => { socket.username = username; matchmakingQueue.push(socket); if (matchmakingQueue.length >= 2) { const player1 = matchmakingQueue.shift(); const player2 = matchmakingQueue.shift(); const minigames = ['Super Tic-Tac-Toe', 'Connect 4', 'Dots and Boxes', 'Battleship', 'Checkers']; initializeGame(`room_${player1.id}_${player2.id}`, minigames[Math.floor(Math.random() * minigames.length)], player1, player2, null); player1.join(`room_${player1.id}_${player2.id}`); player2.join(`room_${player1.id}_${player2.id}`); } });
    socket.on('createPrivateRoom', ({ username, code }) => { if (privateRooms[code]) return socket.emit('privateError', 'Code already exists!'); socket.username = username; privateRooms[code] = { host: socket.id, players: [socket], messages: [] }; socket.join(`private_${code}`); socket.emit('privateRoomJoined', { code, isHost: true, players: [username], messages: [] }); });
    socket.on('joinPrivateRoom', ({ username, code }) => { const room = privateRooms[code]; if (!room) return socket.emit('privateError', 'Room not found!'); if (room.players.length >= 2) return socket.emit('privateError', 'Room is full!'); socket.username = username; room.players.push(socket); socket.join(`private_${code}`); const playerNames = room.players.map(p => p.username); socket.emit('privateRoomJoined', { code, isHost: false, players: playerNames, messages: room.messages }); io.to(`private_${code}`).emit('updateLobbyPlayers', playerNames); });
    socket.on('sendPrivateChat', ({ code, message, username }) => { const room = privateRooms[code]; if (room) { const msgObj = { username, text: message }; room.messages.push(msgObj); io.to(`private_${code}`).emit('updatePrivateChat', msgObj); } });
    socket.on('startPrivateGame', ({ code, gameSelection }) => { const room = privateRooms[code]; if (room && room.host === socket.id && room.players.length === 2) { const player1 = room.players[0]; const player2 = room.players[1]; const roomName = `room_${player1.id}_${player2.id}`; player1.join(roomName); player2.join(roomName); let chosenGame = gameSelection === 'Random' ? ['Super Tic-Tac-Toe', 'Connect 4', 'Dots and Boxes', 'Battleship', 'Checkers'][Math.floor(Math.random() * 5)] : gameSelection; initializeGame(roomName, chosenGame, player1, player2, code); } });

    // UPDATED: Added 2.5s delay to STTT Win
    socket.on('makeMove', ({ roomName, macroIndex, microIndex }) => { 
        const game = activeGames[roomName]; 
        if (game && game.gameType === 'Super Tic-Tac-Toe') { 
            stttLogic.handleMove(game, socket.id, macroIndex, microIndex); io.to(roomName).emit('updateBoard', game); 
            if (game.winner) { setTimeout(() => { handleGameEnd(roomName, game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] === game.winner), game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] !== game.winner), false); }, 2500); } 
        } 
    });
    
    socket.on('makeC4Move', ({ roomName, col }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Connect 4') { c4Logic.handleMove(game, socket.id, col); io.to(roomName).emit('updateC4Board', game); if (game.winner) { setTimeout(() => { handleGameEnd(roomName, game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] === game.winner), game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] !== game.winner), false); }, 2500); } } });
    socket.on('makeDABMove', ({ roomName, type, r, c }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Dots and Boxes') { dabLogic.handleMove(game, socket.id, type, r, c); io.to(roomName).emit('updateDABBoard', game); if (game.winner) handleGameEnd(roomName, game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] === game.winner), game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] !== game.winner), false); } });
    socket.on('makeCheckersMove', ({ roomName, fromR, fromC, toR, toC }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Checkers') { chkLogic.handleMove(game, socket.id, fromR, fromC, toR, toC); io.to(roomName).emit('updateCheckersBoard', game); if (game.winner) handleGameEnd(roomName, Object.keys(game.players).find(id => game.players[id] === game.winner), Object.keys(game.players).find(id => game.players[id] !== game.winner), false); } });
    socket.on('submitBattleshipBoard', ({ roomName, board }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Battleship' && game.phase === 'setup') { game.secretBoards[socket.id] = board; game.ready[socket.id] = true; if (Object.values(game.ready).every(r => r === true)) { game.phase = 'playing'; io.to(roomName).emit('battleshipStartPlaying', { turn: game.turn }); } else { socket.emit('battleshipWaiting'); } } });
    
    // UPDATED: Reveal Battleship boards upon win!
    socket.on('makeBattleshipMove', ({ roomName, r, c }) => { 
        const game = activeGames[roomName]; 
        if (game && game.gameType === 'Battleship' && game.phase === 'playing') { 
            bsLogic.handleShot(game, socket.id, r, c); 
            Object.keys(game.players).forEach(pId => { io.to(pId).emit('updateBattleshipBoard', { turn: game.turn, myBoard: game.secretBoards[pId], trackingBoard: game.trackingBoards[pId] }); }); 
            if (game.winner) { 
                io.to(roomName).emit('revealBattleship', game.secretBoards); // Send full boards to both!
                const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); 
                setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 3500); // Wait 3.5s so they can see the reveal!
            } 
        } 
    });

    socket.on('quitGame', () => { const gameEntry = Object.entries(activeGames).find(([_, g]) => g.players[socket.id]); if (gameEntry) handleGameEnd(gameEntry[0], Object.keys(gameEntry[1].players).find(id => id !== socket.id), socket.id, true); });
    socket.on('disconnect', () => { onlinePlayersCount--; io.emit('onlineCount', onlinePlayersCount); matchmakingQueue = matchmakingQueue.filter(p => p.id !== socket.id); for (const code in privateRooms) { const room = privateRooms[code]; if (room.players.find(p => p.id === socket.id)) { io.to(`private_${code}`).emit('privateError', 'A player disconnected.'); delete privateRooms[code]; } } const gameEntry = Object.entries(activeGames).find(([_, g]) => g.players[socket.id]); if (gameEntry) handleGameEnd(gameEntry[0], Object.keys(gameEntry[1].players).find(id => id !== socket.id), socket.id, true); });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running!'));