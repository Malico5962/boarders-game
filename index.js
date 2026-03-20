require('dotenv').config(); 
const express = require('express'); const http = require('http'); const { Server } = require('socket.io'); const path = require('path'); const bcrypt = require('bcryptjs'); const mongoose = require('mongoose'); 

const stttLogic = require('./games/superTicTacToe'); const c4Logic = require('./games/connect4'); const dabLogic = require('./games/dotsAndBoxes'); const bsLogic = require('./games/battleship'); 
const miniChessLogic = require('./games/miniChess'); const rankLogic = require('./games/rank'); const c8Logic = require('./games/crazyEights'); const rummyLogic = require('./games/rummy'); const tttLogic = require('./games/ticTacToe');

const app = express(); const server = http.createServer(app); const io = new Server(server);
app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅ Connected to MongoDB permanently!');
    updateLeaderboardAndAwards(); 
}).catch(err => console.error('❌ MongoDB Connection Error:', err));

// NEW: Added 'icon_early_access' to defaults!
const defaultInventory = ['piece_red', 'piece_blue', 'cardBack_red', 'banner_dynamic_lb', 'icon_early_access'];
const defaultEquipped = { border: 'none', banner: 'none', piece: { primary: 'piece_red', secondary: 'piece_blue' }, cardBack: 'cardBack_red', emoji: 'none', winAnim: 'none', icon: 'icon_early_access' };

// NEW: Added 'stats' to userSchema to track game wins!
const userSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, rank: { type: Number, default: 100 }, bucks: { type: Number, default: 0 }, profilePic: { type: String, default: '' }, description: { type: String, default: 'I love Boarders!' }, isAnonymous: { type: Boolean, default: false }, inventory: { type: [String], default: defaultInventory }, equipped: { type: Object, default: defaultEquipped }, stats: { type: Object, default: {} }, createdAt: { type: Date, default: Date.now } });
const User = mongoose.model('User', userSchema);

const feedbackSchema = new mongoose.Schema({ username: String, type: String, message: String, createdAt: { type: Date, default: Date.now } });
const Feedback = mongoose.model('Feedback', feedbackSchema);

let matchmakingQueue = []; const activeGames = {}; let onlinePlayersCount = 0; const privateRooms = {}; 

async function getLbPos(username) {
    if (username === 'Admin') return null;
    const top = await User.find({ username: { $ne: 'Admin' } }).sort({ rank: -1 }).limit(10);
    const idx = top.findIndex(u => u.username === username);
    return idx !== -1 ? idx + 1 : null;
}

// NEW: Award LB Icons along with the Banners!
async function updateLeaderboardAndAwards() {
    try {
        const topUsers = await User.find({ username: { $ne: 'Admin' } }).sort({ rank: -1 }).limit(10);
        for (let i = 0; i < topUsers.length; i++) {
            let user = topUsers[i];
            let changed = false;
            const awardItem = (itemId) => { if (!user.inventory.includes(itemId)) { user.inventory.push(itemId); changed = true; } };

            awardItem('banner_top10_vet'); awardItem('icon_top10_vet');
            if (i === 0) { awardItem('banner_gold_champ'); awardItem('icon_gold_champ'); }
            if (i === 1) { awardItem('banner_silver_champ'); awardItem('icon_silver_champ'); }
            if (i === 2) { awardItem('banner_bronze_champ'); awardItem('icon_bronze_champ'); }

            if (changed) await user.save();
        }
    } catch (e) { console.error("Leaderboard award error:", e); }
}

const turnTimers = {};
function startTurnTimer(roomName) {
    const game = activeGames[roomName]; if (!game) return;
    if (turnTimers[roomName]) clearTimeout(turnTimers[roomName]);
    turnTimers[roomName] = setTimeout(() => {
        const currentGame = activeGames[roomName]; if (!currentGame || currentGame.winner) return;
        let failingPlayerId = null;
        if (currentGame.gameType === 'Battleship' && currentGame.phase === 'setup') { failingPlayerId = Object.keys(currentGame.ready).find(id => !currentGame.ready[id]);
        } else { failingPlayerId = Object.keys(currentGame.players).find(id => currentGame.players[id] === currentGame.turn); }
        if (failingPlayerId) { const winningPlayerId = Object.keys(currentGame.players).find(id => id !== failingPlayerId); handleGameEnd(roomName, winningPlayerId, failingPlayerId, true, true); }
    }, 60000); 
}

app.post('/register', async (req, res) => { 
    try { 
        const { username, password } = req.body; 
        if (await User.findOne({ username })) return res.status(400).json({ error: 'Username taken' }); 
        const hashedPassword = await bcrypt.hash(password, 10); const defaultPfp = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`; 
        const newUser = new User({ username, password: hashedPassword, rank: 100, bucks: 0, profilePic: defaultPfp, inventory: defaultInventory, equipped: defaultEquipped, stats: {} }); 
        await newUser.save(); await updateLeaderboardAndAwards();
        const lbPosition = await getLbPos(newUser.username);
        res.json({ message: 'Success!', user: newUser, lbPosition }); 
    } catch (err) { res.status(500).json({ error: 'Server Error' }); } 
});

app.post('/login', async (req, res) => { 
    try { 
        const { username, password } = req.body; const user = await User.findOne({ username }); 
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' }); 
        
        // Auto-patch old accounts to have the new stats and icon systems!
        let changed = false;
        if (!user.inventory.includes('banner_dynamic_lb')) { user.inventory.push('banner_dynamic_lb'); changed = true; }
        if (!user.inventory.includes('icon_early_access')) { user.inventory.push('icon_early_access'); changed = true; }
        if (!user.equipped.icon) { user.equipped.icon = 'icon_early_access'; user.markModified('equipped'); changed = true; }
        if (!user.stats) { user.stats = {}; changed = true; }
        if (user.equipped && typeof user.equipped.piece === 'string') { user.equipped = { border: user.equipped.border || 'none', banner: user.equipped.banner || 'none', piece: { primary: user.equipped.piece || 'piece_red', secondary: 'piece_blue' }, cardBack: user.equipped.cardBack || 'cardBack_red', emoji: user.equipped.emoji || 'none', winAnim: user.equipped.winAnim || 'none', icon: user.equipped.icon || 'icon_early_access' }; user.inventory = [...new Set([...user.inventory, ...defaultInventory])]; changed = true; }
        
        if (user.username === 'Admin') { user.bucks = 999999; changed = true; }
        if (changed) await user.save();
        
        const lbPosition = await getLbPos(user.username);
        res.json({ message: 'Success!', user, lbPosition }); 
    } catch (err) { res.status(500).json({ error: 'Server Error' }); } 
});

app.post('/update-profile', async (req, res) => { 
    try { 
        const { currentUsername, newUsername, newPassword, profilePic, description, isAnonymous } = req.body; const user = await User.findOne({ username: currentUsername }); 
        if (!user) return res.status(404).json({ error: 'User not found' }); 
        if (newUsername && newUsername !== currentUsername) { const exists = await User.findOne({ username: newUsername }); if (exists) return res.status(400).json({ error: 'New username already taken' }); user.username = newUsername; } 
        if (newPassword) user.password = await bcrypt.hash(newPassword, 10); if (profilePic !== undefined) user.profilePic = profilePic; if (description !== undefined) user.description = description; if (isAnonymous !== undefined) user.isAnonymous = isAnonymous; 
        await user.save(); 
        const lbPosition = await getLbPos(user.username);
        res.json({ message: 'Profile updated!', user, lbPosition }); 
    } catch (err) { res.status(500).json({ error: 'Server Error' }); } 
});

app.delete('/delete-account', async (req, res) => {
    try { const { username, password } = req.body; if(username === 'Admin') return res.status(403).json({ error: 'Cannot delete Admin account.'}); const user = await User.findOne({ username }); if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid password.' }); await User.deleteOne({ username }); await updateLeaderboardAndAwards(); res.json({ message: 'Account successfully deleted.' }); } catch (e) { res.status(500).json({ error: 'Server Error' }); }
});

app.get('/leaderboard', async (req, res) => { 
    try { res.json(await User.find({ username: { $ne: 'Admin' } }, 'username rank bucks profilePic equipped').sort({ rank: -1 }).limit(10)); } 
    catch (err) { res.status(500).json({ error: 'Server Error' }); } 
});

// FIX: Ensure lbPosition is returned on Buy!
app.post('/shop/buy', async (req, res) => { 
    try { 
        const { username, itemId, cost } = req.body; const user = await User.findOne({ username }); 
        if (!user) return res.status(404).json({ error: 'User not found' }); if (user.inventory.includes(itemId)) return res.status(400).json({ error: 'Already owned' }); if (user.bucks < cost) return res.status(400).json({ error: 'Not enough Bucks' }); 
        user.bucks -= cost; user.inventory.push(itemId); await user.save(); 
        const lbPosition = await getLbPos(user.username);
        res.json({ message: 'Purchase successful!', user, lbPosition }); 
    } catch (err) { res.status(500).json({ error: 'Server Error' }); } 
});

// FIX: Ensure lbPosition is returned on Equip! (Fixes "Unranked" glitch)
app.post('/shop/equip', async (req, res) => { 
    try { 
        const { username, type, slot, itemId } = req.body; const user = await User.findOne({ username }); 
        if (!user) return res.status(404).json({ error: 'User not found' }); if (itemId !== 'none' && !user.inventory.includes(itemId)) return res.status(400).json({ error: 'You do not own this item.' }); 
        if (type === 'piece') { if (!user.equipped.piece) user.equipped.piece = { primary: 'piece_red', secondary: 'piece_blue' }; user.equipped.piece[slot] = itemId; } else { user.equipped[type] = itemId; } 
        user.markModified('equipped'); await user.save(); 
        const lbPosition = await getLbPos(user.username);
        res.json({ message: 'Equipped!', user, lbPosition }); 
    } catch (err) { res.status(500).json({ error: 'Server Error' }); } 
});

app.post('/send-feedback', async (req, res) => { try { const { username, type, message } = req.body; if (!message || message.trim() === '') return res.status(400).json({ error: "Message cannot be empty." }); const newFeedback = new Feedback({ username, type, message }); await newFeedback.save(); res.json({ message: 'Feedback successfully submitted!' }); } catch (error) { res.status(500).json({ error: 'Failed to save feedback.' }); } });
app.get('/admin/feedback', async (req, res) => { try { if (req.query.username !== 'Admin') return res.status(403).json({ error: 'Unauthorized' }); res.json(await Feedback.find().sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ error: 'Failed to fetch feedback.' }); } });
app.delete('/admin/feedback/:id', async (req, res) => { try { if (req.body.username !== 'Admin') return res.status(403).json({ error: 'Unauthorized' }); await Feedback.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (error) { res.status(500).json({ error: 'Failed to delete.' }); } });
app.get('/admin/users', async (req, res) => { try { if (req.query.username !== 'Admin') return res.status(403).json({ error: 'Unauthorized' }); res.json(await User.find({ username: { $ne: 'Admin' } }, 'username rank bucks createdAt').sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ error: 'Failed to fetch players.' }); } });
app.delete('/admin/user/:username', async (req, res) => { try { if (req.body.adminName !== 'Admin') return res.status(403).json({ error: 'Unauthorized' }); await User.deleteOne({ username: req.params.username }); res.json({ success: true }); } catch (error) { res.status(500).json({ error: 'Failed to delete user.' }); } });

async function handleGameEnd(roomName, winnerId, loserId, isQuit = false, isAfk = false) { 
    const game = activeGames[roomName]; if (!game) return; if (turnTimers[roomName]) { clearTimeout(turnTimers[roomName]); delete turnTimers[roomName]; } 
    let newWinnerRank = 100, newLoserRank = 100, newWinnerBucks = 0; let pointsWon = 0, pointsLost = 0; 
    let winnerData = { username: game.playerUsernames ? game.playerUsernames[winnerId] : 'Winner', pfp: `https://api.dicebear.com/7.x/bottts/svg?seed=${winnerId}`, isAnon: false, equipped: defaultEquipped }; let loserData = { username: game.playerUsernames ? game.playerUsernames[loserId] : 'Loser', pfp: `https://api.dicebear.com/7.x/bottts/svg?seed=${loserId}`, isAnon: false, equipped: defaultEquipped }; 
    
    if (winnerId && loserId) { 
        if (isQuit) { pointsWon = 25; pointsLost = 60; } else { const rankResults = rankLogic.calculatePoints(game, winnerId, loserId); pointsWon = rankResults.pointsWon; pointsLost = rankResults.pointsLost; } 
        try { 
            const winnerUser = await User.findOne({ username: game.playerUsernames[winnerId] }); const loserUser = await User.findOne({ username: game.playerUsernames[loserId] }); 
            if (winnerUser) { 
                winnerUser.rank = (Number(winnerUser.rank) ?? 100) + pointsWon; 
                winnerUser.bucks = (Number(winnerUser.bucks) ?? 0) + 5 + (game.pool || 0); 
                
                // NEW: Win Tracking and 10-Win Icon Awards!
                winnerUser.stats = winnerUser.stats || {};
                winnerUser.stats[game.gameType] = (winnerUser.stats[game.gameType] || 0) + 1;
                winnerUser.markModified('stats');
                
                if (winnerUser.stats[game.gameType] === 10) {
                    const iconId = `icon_win_${game.gameType.replace(/\s+/g, '')}`;
                    if (!winnerUser.inventory.includes(iconId)) winnerUser.inventory.push(iconId);
                }

                await winnerUser.save(); newWinnerRank = winnerUser.rank; newWinnerBucks = winnerUser.bucks; winnerData = { username: winnerUser.username, pfp: winnerUser.profilePic, isAnon: winnerUser.isAnonymous, equipped: winnerUser.equipped || defaultEquipped }; 
            } 
            if (loserUser) { loserUser.rank = Math.max(0, (Number(loserUser.rank) ?? 100) - pointsLost); await loserUser.save(); newLoserRank = loserUser.rank; loserData = { username: loserUser.username, pfp: loserUser.profilePic, isAnon: loserUser.isAnonymous, equipped: loserUser.equipped || defaultEquipped }; } 
            await updateLeaderboardAndAwards(); 
        } catch (err) { console.error("DB Error", err); } 
    } 
    
    winnerData.lbPosition = await getLbPos(winnerData.username); loserData.lbPosition = await getLbPos(loserData.username);
    const isPrivate = game.privateCode != null; 
    if (!isPrivate) { if (winnerData?.isAnon) winnerData = { username: 'Anonymous', pfp: 'https://api.dicebear.com/7.x/identicon/svg?seed=Anon', equipped: defaultEquipped }; if (loserData?.isAnon) loserData = { username: 'Anonymous', pfp: 'https://api.dicebear.com/7.x/identicon/svg?seed=Anon', equipped: defaultEquipped }; } 
    const poolWinnings = game.pool && !isQuit && winnerId ? game.pool : 0; 
    io.to(roomName).emit('gameOverScreen', { winnerId, loserId, isQuit, isAfk, isTie: !winnerId && !loserId, newWinnerRank, newLoserRank, newWinnerBucks, winnerData, loserData, pointsWon, pointsLost, rummyScores: game.rummyScores, poolWinnings }); 
    delete activeGames[roomName]; 
}

async function initializeGame(roomName, chosenGame, player1, player2, privateCode = null) { 
    activeGames[roomName] = { roomName, gameType: chosenGame, playerUsernames: { [player1.id]: player1.username, [player2.id]: player2.username }, winner: null, pool: 0, pendingAllocation: 0 }; 
    io.to(roomName).emit('matchFound', { message: 'Match starting!', game: chosenGame }); 
    let u1 = null, u2 = null; try { u1 = await User.findOne({ username: player1.username }); u2 = await User.findOne({ username: player2.username }); } catch (e) { } 
    
    const getPlayerData = async (user, fallbackName) => { 
        if (!privateCode && user?.isAnonymous) return { username: 'Anonymous', rank: '???', bucks: 0, pfp: 'https://api.dicebear.com/7.x/identicon/svg?seed=Anon', equipped: defaultEquipped, lbPosition: null }; 
        const lbPos = await getLbPos(user?.username);
        return { username: user?.username || fallbackName, rank: user?.rank ?? 100, bucks: user?.bucks ?? 0, pfp: user?.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackName}`, equipped: { ...defaultEquipped, ...user?.equipped }, lbPosition: lbPos }; 
    }; 
    
    const p1Data = await getPlayerData(u1, player1.username); const p2Data = await getPlayerData(u2, player2.username); 
    setTimeout(() => { 
        const game = activeGames[roomName]; if (!game) return; 
        let safeGameState = { roomName, gameType: chosenGame, isPrivate: !!privateCode, privateCode, playerData: { [player1.id]: p1Data, [player2.id]: p2Data } }; 
        if (chosenGame === 'Super Tic-Tac-Toe') { game.players = { [player1.id]: 'X', [player2.id]: 'O' }; game.board = Array(9).fill(null).map(() => Array(9).fill(null)); game.macroBoard = Array(9).fill(null); game.turn = 'X'; game.nextBoard = -1; safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.macroBoard = game.macroBoard; safeGameState.turn = game.turn; safeGameState.nextBoard = game.nextBoard; } 
        else if (chosenGame === 'Connect 4') { game.players = { [player1.id]: 'Red', [player2.id]: 'Yellow' }; game.board = Array(6).fill(null).map(() => Array(7).fill(null)); game.turn = 'Red'; safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.turn = game.turn; } 
        else if (chosenGame === 'Dots and Boxes') { game.players = { [player1.id]: 'Red', [player2.id]: 'Blue' }; game.hLines = Array(4).fill(null).map(() => Array(3).fill(null)); game.vLines = Array(3).fill(null).map(() => Array(4).fill(null)); game.boxes = Array(3).fill(null).map(() => Array(3).fill(null)); game.scores = { 'Red': 0, 'Blue': 0 }; game.turn = 'Red'; safeGameState.players = game.players; safeGameState.hLines = game.hLines; safeGameState.vLines = game.vLines; safeGameState.boxes = game.boxes; safeGameState.scores = game.scores; safeGameState.turn = game.turn; } 
        else if (chosenGame === 'Battleship') { game.players = { [player1.id]: 'Player 1', [player2.id]: 'Player 2' }; game.phase = 'setup'; game.ready = { [player1.id]: false, [player2.id]: false }; game.secretBoards = { [player1.id]: null, [player2.id]: null }; game.trackingBoards = { [player1.id]: Array(10).fill(null).map(()=>Array(10).fill(0)), [player2.id]: Array(10).fill(null).map(()=>Array(10).fill(0)) }; game.health = { [player1.id]: 17, [player2.id]: 17 }; game.turn = 'Player 1'; safeGameState.players = game.players; safeGameState.phase = game.phase; } 
        else if (chosenGame === 'Crazy Eights') { game.players = { [player1.id]: 'Player 1', [player2.id]: 'Player 2' }; game.turn = 'Player 1'; game.activeSuit = null; const suits = ['♥', '♦', '♣', '♠']; const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']; game.deck = []; suits.forEach(s => values.forEach(v => game.deck.push({suit: s, val: v}))); game.deck.sort(() => Math.random() - 0.5); game.hands = { [player1.id]: game.deck.splice(0, 4), [player2.id]: game.deck.splice(0, 4) }; game.discardPile = [game.deck.pop()]; while(game.discardPile[0].val === '8') { game.deck.unshift(game.discardPile.pop()); game.discardPile = [game.deck.pop()]; } safeGameState.players = game.players; safeGameState.turn = game.turn; } 
        else if (chosenGame === 'Rummy') { game.players = { [player1.id]: 'Player 1', [player2.id]: 'Player 2' }; game.turn = 'Player 1'; game.phase = 'draw'; game.melds = []; const suits = ['♥', '♦', '♣', '♠']; const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']; game.deck = []; suits.forEach(s => values.forEach(v => game.deck.push({suit: s, val: v}))); game.deck.sort(() => Math.random() - 0.5); game.hands = { [player1.id]: game.deck.splice(0, 3), [player2.id]: game.deck.splice(0, 3) }; game.discardPile = [game.deck.pop()]; safeGameState.players = game.players; safeGameState.turn = game.turn; } 
        else if (chosenGame === 'Endless Tic-Tac-Toe') { game.players = { [player1.id]: 'X', [player2.id]: 'O' }; game.board = Array(3).fill(null).map(() => Array(3).fill(null)); game.history = { 'X': [], 'O': [] }; game.turn = 'X'; safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.history = game.history; safeGameState.turn = game.turn; } 
        else if (chosenGame === 'Mini Chess') { game.players = { [player1.id]: 'Player 1', [player2.id]: 'Player 2' }; game.turn = 'Player 1'; game.board = Array(4).fill(null).map(() => Array(8).fill(0)); game.board[0][0] = 14; game.board[1][0] = 12; game.board[2][0] = 11; game.board[3][0] = 13; for(let r=0; r<4; r++) game.board[r][1] = 15; game.board[0][7] = 24; game.board[1][7] = 22; game.board[2][7] = 21; game.board[3][7] = 23; for(let r=0; r<4; r++) game.board[r][6] = 25; safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.turn = game.turn; } 
        io.to(roomName).emit('startGame', safeGameState); 
        if (chosenGame === 'Crazy Eights') broadcastCrazyEightsState(roomName); if (chosenGame === 'Rummy') broadcastRummyState(roomName); startTurnTimer(roomName); 
    }, 5000); 
}
function broadcastRummyState(roomName) { const game = activeGames[roomName]; if (!game) return; Object.keys(game.players).forEach(pId => { const opponentId = Object.keys(game.players).find(id => id !== pId); io.to(pId).emit('updateRummy', { turn: game.turn, phase: game.phase, myHand: game.hands[pId], opponentHandCount: game.hands[opponentId].length, discardPile: game.discardPile, deckCount: game.deck.length, melds: game.melds }); }); }
function broadcastCrazyEightsState(roomName) { const game = activeGames[roomName]; if (!game) return; Object.keys(game.players).forEach(pId => { const opponentId = Object.keys(game.players).find(id => id !== pId); io.to(pId).emit('updateCrazyEights', { turn: game.turn, activeSuit: game.activeSuit, myHand: game.hands[pId], opponentHandCount: game.hands[opponentId].length, topCard: game.discardPile[game.discardPile.length - 1], deckCount: game.deck.length }); }); }

io.on('connection', (socket) => {
    onlinePlayersCount++; io.emit('onlineCount', onlinePlayersCount);
    
    socket.on('joinQueue', (username) => { 
        socket.username = username; 
        if (username !== 'Testing' && username !== 'Admin') {
            if (matchmakingQueue.some(p => p.username === username)) return socket.emit('queueError', 'You are already in the matchmaking queue!'); 
            const inGame = Object.values(activeGames).some(g => g.playerUsernames && Object.values(g.playerUsernames).includes(username)); 
            if (inGame) return socket.emit('queueError', 'You are already in an active game!'); 
        }
        matchmakingQueue = matchmakingQueue.filter(p => p.id !== socket.id); matchmakingQueue.push(socket); 
        if (matchmakingQueue.length >= 2) { const player1 = matchmakingQueue.shift(); const player2 = matchmakingQueue.shift(); const minigames = ['Super Tic-Tac-Toe', 'Connect 4', 'Dots and Boxes', 'Battleship', 'Mini Chess', 'Crazy Eights', 'Rummy', 'Endless Tic-Tac-Toe']; const roomName = `room_${Date.now()}_${player1.id}_${player2.id}`; player1.join(roomName); player2.join(roomName); initializeGame(roomName, minigames[Math.floor(Math.random() * minigames.length)], player1, player2, null); } 
    });
    
    socket.on('createPrivateRoom', ({ username, code }) => { if (privateRooms[code]) return socket.emit('privateError', 'Code already exists!'); socket.username = username; privateRooms[code] = { host: socket.id, players: [socket], messages: [] }; socket.join(`private_${code}`); socket.emit('privateRoomJoined', { code, isHost: true, players: [username], messages: [] }); });
    
    socket.on('joinPrivateRoom', ({ username, code }) => { 
        const room = privateRooms[code]; if (!room) return socket.emit('privateError', 'Room not found!'); if (room.players.length >= 2) return socket.emit('privateError', 'Room is full!'); 
        if (username !== 'Testing' && username !== 'Admin') {
            const inGame = Object.values(activeGames).some(g => g.playerUsernames && Object.values(g.playerUsernames).includes(username)); 
            if (inGame || room.players.some(p => p.username === username)) return socket.emit('privateError', 'You are already in this room or an active game!'); 
        }
        socket.username = username; room.players.push(socket); socket.join(`private_${code}`); const playerNames = room.players.map(p => p.username); socket.emit('privateRoomJoined', { code, isHost: false, players: playerNames, messages: room.messages }); io.to(`private_${code}`).emit('updateLobbyPlayers', playerNames); 
    });
    
    socket.on('sendPrivateChat', ({ code, message, username }) => { const room = privateRooms[code]; if (room) { const msgObj = { username, text: message }; room.messages.push(msgObj); io.to(`private_${code}`).emit('updatePrivateChat', msgObj); } });
    socket.on('startPrivateGame', ({ code, gameSelection }) => { const room = privateRooms[code]; if (room && room.host === socket.id && room.players.length === 2) { const player1 = room.players[0]; const player2 = room.players[1]; const roomName = `room_${Date.now()}_${player1.id}_${player2.id}`; player1.join(roomName); player2.join(roomName); let chosenGame = gameSelection === 'Random' ? ['Super Tic-Tac-Toe', 'Connect 4', 'Dots and Boxes', 'Battleship', 'Mini Chess', 'Crazy Eights', 'Rummy', 'Endless Tic-Tac-Toe'][Math.floor(Math.random() * 8)] : gameSelection; initializeGame(roomName, chosenGame, player1, player2, code); } });
    socket.on('sendInGameChat', ({ roomName, message, username }) => { io.to(roomName).emit('receiveInGameChat', { username, message }); });
    socket.on('sendEmoji', ({ roomName, emoji }) => { io.to(roomName).emit('receiveEmoji', { senderId: socket.id, emoji }); });
    socket.on('requestAllocation', ({ roomName, amount }) => { const game = activeGames[roomName]; if (game) { game.pendingAllocation = amount; const opponentId = Object.keys(game.players).find(id => id !== socket.id); io.to(opponentId).emit('allocationRequested', amount); } });
    socket.on('respondAllocation', async ({ roomName, accept }) => { const game = activeGames[roomName]; if (!game) return; if (accept) { try { const p1Id = Object.keys(game.players)[0]; const p2Id = Object.keys(game.players)[1]; const u1 = await User.findOne({ username: game.playerUsernames[p1Id] }); const u2 = await User.findOne({ username: game.playerUsernames[p2Id] }); if (u1 && u2 && u1.bucks >= game.pendingAllocation && u2.bucks >= game.pendingAllocation) { u1.bucks -= game.pendingAllocation; u2.bucks -= game.pendingAllocation; await u1.save(); await u2.save(); game.pool += (game.pendingAllocation * 2); io.to(roomName).emit('allocationAccepted', { newPool: game.pool, amountAdded: game.pendingAllocation }); } else { io.to(roomName).emit('allocationDenied'); } } catch(e) { console.error(e); } } else { const opponentId = Object.keys(game.players).find(id => id !== socket.id); io.to(opponentId).emit('allocationDenied'); } game.pendingAllocation = 0; });
    socket.on('makeMove', ({ roomName, macroIndex, microIndex }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Super Tic-Tac-Toe') { stttLogic.handleMove(game, socket.id, macroIndex, microIndex); io.to(roomName).emit('updateBoard', game); if (game.winner) { setTimeout(() => { handleGameEnd(roomName, game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] === game.winner), game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] !== game.winner), false); }, 2500); } else { startTurnTimer(roomName); } } });
    socket.on('makeC4Move', ({ roomName, col }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Connect 4') { c4Logic.handleMove(game, socket.id, col); io.to(roomName).emit('updateC4Board', game); if (game.winner) { setTimeout(() => { handleGameEnd(roomName, game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] === game.winner), game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] !== game.winner), false); }, 2500); } else { startTurnTimer(roomName); } } });
    socket.on('makeDABMove', ({ roomName, type, r, c }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Dots and Boxes') { dabLogic.handleMove(game, socket.id, type, r, c); io.to(roomName).emit('updateDABBoard', game); if (game.winner) handleGameEnd(roomName, game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] === game.winner), game.winner === 'Tie' ? null : Object.keys(game.players).find(id => game.players[id] !== game.winner), false); else startTurnTimer(roomName); } });
    socket.on('submitBattleshipBoard', ({ roomName, board }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Battleship' && game.phase === 'setup') { game.secretBoards[socket.id] = board; game.ready[socket.id] = true; if (Object.values(game.ready).every(r => r === true)) { game.phase = 'playing'; io.to(roomName).emit('battleshipStartPlaying', { turn: game.turn }); startTurnTimer(roomName); } else { socket.emit('battleshipWaiting'); } } });
    socket.on('makeBattleshipMove', ({ roomName, r, c }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Battleship' && game.phase === 'playing') { bsLogic.handleShot(game, socket.id, r, c); Object.keys(game.players).forEach(pId => { io.to(pId).emit('updateBattleshipBoard', { turn: game.turn, myBoard: game.secretBoards[pId], trackingBoard: game.trackingBoards[pId] }); }); if (game.winner) { io.to(roomName).emit('revealBattleship', game.secretBoards); const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 3500); } else { startTurnTimer(roomName); } } });
    socket.on('makeC8Play', ({ roomName, cardIndex, declaredSuit }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Crazy Eights') { c8Logic.handlePlay(game, socket.id, cardIndex, declaredSuit); broadcastCrazyEightsState(roomName); if (game.winner) { const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 2000); } else { startTurnTimer(roomName); } } });
    socket.on('makeC8Draw', ({ roomName }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Crazy Eights') { c8Logic.handleDraw(game, socket.id); broadcastCrazyEightsState(roomName); startTurnTimer(roomName); } });
    socket.on('makeRummyDraw', ({ roomName, source, index }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Rummy') { rummyLogic.handleDraw(game, socket.id, source, index); broadcastRummyState(roomName); startTurnTimer(roomName); } });
    socket.on('makeRummyMeld', ({ roomName, cardIndices }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Rummy') { rummyLogic.handleMeld(game, socket.id, cardIndices); broadcastRummyState(roomName); if (game.winner) { const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 2000); } else { startTurnTimer(roomName); } } });
    socket.on('makeRummyLayOff', ({ roomName, cardIndex, meldId }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Rummy') { rummyLogic.handleLayOff(game, socket.id, cardIndex, meldId); broadcastRummyState(roomName); if (game.winner) { const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 2000); } else { startTurnTimer(roomName); } } });
    socket.on('makeRummyDiscard', ({ roomName, cardIndex }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Rummy') { rummyLogic.handleDiscard(game, socket.id, cardIndex); broadcastRummyState(roomName); if (game.winner) { const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 2000); } else { startTurnTimer(roomName); } } });
    socket.on('makeTTTEndlessMove', ({ roomName, r, c }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Endless Tic-Tac-Toe') { tttLogic.handleMove(game, socket.id, r, c); io.to(roomName).emit('updateTTTEndlessBoard', game); if (game.winner) { const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 2500); } else { startTurnTimer(roomName); } } });
    socket.on('makeChessMove', ({ roomName, fromR, fromC, toR, toC }) => { const game = activeGames[roomName]; if (game && game.gameType === 'Mini Chess') { miniChessLogic.handleMove(game, socket.id, fromR, fromC, toR, toC); io.to(roomName).emit('updateChessBoard', game); if (game.winner) { const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner); setTimeout(() => { handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false); }, 2500); } else { startTurnTimer(roomName); } } });

    socket.on('quitGame', () => { const gameEntry = Object.entries(activeGames).find(([_, g]) => g.playerUsernames && g.playerUsernames[socket.id]); if (gameEntry) { const opponentId = Object.keys(gameEntry[1].playerUsernames).find(id => id !== socket.id); handleGameEnd(gameEntry[0], opponentId, socket.id, true); } });
    socket.on('disconnect', () => { onlinePlayersCount--; io.emit('onlineCount', onlinePlayersCount); matchmakingQueue = matchmakingQueue.filter(p => p.id !== socket.id); for (const code in privateRooms) { const room = privateRooms[code]; if (room.players.find(p => p.id === socket.id)) { io.to(`private_${code}`).emit('privateError', 'A player disconnected.'); delete privateRooms[code]; } } const gameEntry = Object.entries(activeGames).find(([_, g]) => g.playerUsernames && g.playerUsernames[socket.id]); if (gameEntry) { const opponentId = Object.keys(gameEntry[1].playerUsernames).find(id => id !== socket.id); handleGameEnd(gameEntry[0], opponentId, socket.id, true); } });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running!'));