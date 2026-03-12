require('dotenv').config(); // This loads your secret .env file!
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose'); // This talks to MongoDB!

const stttLogic = require('./games/superTicTacToe');
const pongLogic = require('./games/pong');
const c4Logic = require('./games/connect4'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. DATABASE SETUP (MongoDB)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB permanently!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Create a Blueprint (Schema) for our Users
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rank: { type: Number, default: 100 }
});

const User = mongoose.model('User', userSchema);

// Memory trackers for live games (these don't go in the database)
let matchmakingQueue = [];
const activeGames = {}; 
let onlinePlayersCount = 0;


// ==========================================
// 2. AUTH & LEADERBOARD ROUTES
// ==========================================
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check the actual database to see if they exist
        const existingUser = await User.findOne({ username: username });
        if (existingUser) return res.status(400).json({ error: 'Username taken' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save to the database!
        const newUser = new User({ username, password: hashedPassword, rank: 100 });
        await newUser.save();
        
        res.json({ message: 'Success!', user: { username: newUser.username, rank: newUser.rank } });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Ask the database for the user
        const user = await User.findOne({ username: username });
        if (!user) return res.status(400).json({ error: 'User not found' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });
        
        res.json({ message: 'Success!', user: { username: user.username, rank: user.rank } });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

app.get('/leaderboard', async (req, res) => {
    try {
        // Ask the database for the top 10 users, sorted by rank
        const topUsers = await User.find({}, 'username rank').sort({ rank: -1 }).limit(10);
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});


// ==========================================
// 3. THE POINT SYSTEM
// ==========================================
// We have to make this "async" because talking to the database takes a few milliseconds
async function handleGameEnd(roomName, winnerId, loserId, isQuit = false) {
    const game = activeGames[roomName];
    if (!game) return;

    let newWinnerRank = 100, newLoserRank = 100;

    if (winnerId && loserId) {
        try {
            // Pull the actual users out of the database
            const winnerUser = await User.findOne({ username: game.playerUsernames[winnerId] });
            const loserUser = await User.findOne({ username: game.playerUsernames[loserId] });

            if (winnerUser) { 
                winnerUser.rank += 50; 
                await winnerUser.save(); // Save their new score permanently!
                newWinnerRank = winnerUser.rank; 
            }
            if (loserUser) { 
                loserUser.rank = Math.max(0, loserUser.rank - 50); 
                await loserUser.save(); // Save their new score permanently!
                newLoserRank = loserUser.rank; 
            }
        } catch (err) {
            console.error("Error updating ranks in database:", err);
        }
    }

    io.to(roomName).emit('gameOverScreen', { winnerId, loserId, isQuit, isTie: !winnerId && !loserId, newWinnerRank, newLoserRank });
    delete activeGames[roomName];
}


// ==========================================
// 4. MAIN MULTIPLAYER LOGIC
// ==========================================
io.on('connection', (socket) => {
    onlinePlayersCount++;
    io.emit('onlineCount', onlinePlayersCount);

    socket.on('joinQueue', (username) => {
        socket.username = username;
        matchmakingQueue.push(socket);

        if (matchmakingQueue.length >= 2) {
            const player1 = matchmakingQueue.shift();
            const player2 = matchmakingQueue.shift();
            const roomName = `room_${player1.id}_${player2.id}`;
            player1.join(roomName); player2.join(roomName);

            const minigames = ['Super Tic-Tac-Toe', 'Pong', 'Connect 4'];
            const chosenGame = minigames[Math.floor(Math.random() * minigames.length)];

            activeGames[roomName] = {
                roomName: roomName,
                gameType: chosenGame,
                playerUsernames: { [player1.id]: player1.username, [player2.id]: player2.username },
                winner: null
            };

            io.to(roomName).emit('matchFound', { message: 'Match found!', game: chosenGame });

            setTimeout(() => {
                const game = activeGames[roomName];
                if (!game) return; 

                let safeGameState = {
                    roomName: game.roomName, gameType: game.gameType,
                    opponentNames: { [player1.id]: player2.username, [player2.id]: player1.username }
                };

                if (chosenGame === 'Super Tic-Tac-Toe') {
                    game.players = { [player1.id]: 'X', [player2.id]: 'O' };
                    game.board = Array(9).fill(null).map(() => Array(9).fill(null));
                    game.macroBoard = Array(9).fill(null);
                    game.turn = 'X'; game.nextBoard = -1;
                    
                    safeGameState.players = game.players; safeGameState.board = game.board;
                    safeGameState.macroBoard = game.macroBoard; safeGameState.turn = game.turn; safeGameState.nextBoard = game.nextBoard;
                
                } else if (chosenGame === 'Connect 4') {
                    game.players = { [player1.id]: 'Red', [player2.id]: 'Yellow' };
                    game.board = Array(6).fill(null).map(() => Array(7).fill(null));
                    game.turn = 'Red';
                    
                    safeGameState.players = game.players; safeGameState.board = game.board; safeGameState.turn = game.turn;
                
                } else if (chosenGame === 'Pong') {
                    game.players = { [player1.id]: 'Left', [player2.id]: 'Right' };
                    safeGameState.players = game.players;
                    pongLogic.initPong(io, roomName, activeGames, handleGameEnd);
                }
                
                io.to(roomName).emit('startGame', safeGameState);
            }, 5000);
        }
    });

    socket.on('makeMove', ({ roomName, macroIndex, microIndex }) => {
        const game = activeGames[roomName];
        if (game && game.gameType === 'Super Tic-Tac-Toe') {
            stttLogic.handleMove(game, socket.id, macroIndex, microIndex);
            io.to(roomName).emit('updateBoard', game);
            
            if (game.winner) {
                if (game.winner === 'Tie') handleGameEnd(roomName, null, null, false);
                else {
                    const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner);
                    handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false);
                }
            }
        }
    });

    socket.on('makeC4Move', ({ roomName, col }) => {
        const game = activeGames[roomName];
        if (game && game.gameType === 'Connect 4') {
            c4Logic.handleMove(game, socket.id, col);
            io.to(roomName).emit('updateC4Board', game);

            if (game.winner) {
                if (game.winner === 'Tie') handleGameEnd(roomName, null, null, false);
                else {
                    const winnerId = Object.keys(game.players).find(id => game.players[id] === game.winner);
                    handleGameEnd(roomName, winnerId, Object.keys(game.players).find(id => id !== winnerId), false);
                }
            }
        }
    });

    socket.on('paddleState', ({ roomName, direction }) => {
        const game = activeGames[roomName];
        if (game && game.gameType === 'Pong') pongLogic.handlePaddleState(game, socket.id, direction);
    });

    socket.on('quitGame', () => {
        const gameEntry = Object.entries(activeGames).find(([_, g]) => g.players[socket.id]);
        if (gameEntry) {
            const [roomName, game] = gameEntry;
            const loserId = socket.id;
            const winnerId = Object.keys(game.players).find(id => id !== loserId);
            handleGameEnd(roomName, winnerId, loserId, true);
        }
    });

    socket.on('disconnect', () => {
        onlinePlayersCount--;
        io.emit('onlineCount', onlinePlayersCount);

        matchmakingQueue = matchmakingQueue.filter(p => p.id !== socket.id);
        const gameEntry = Object.entries(activeGames).find(([_, g]) => g.players[socket.id]);
        if (gameEntry) {
            const [roomName, game] = gameEntry;
            const loserId = socket.id;
            const winnerId = Object.keys(game.players).find(id => id !== loserId);
            handleGameEnd(roomName, winnerId, loserId, true);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));