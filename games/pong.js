function initPong(io, roomName, activeGames, onGameEnd) {
    const game = activeGames[roomName];
    const playerIds = Object.keys(game.players);
    game.player1Id = playerIds[0];
    game.player2Id = playerIds[1];

    game.pongState = {
        p1y: 50, p2y: 50, p1Dir: 0, p2Dir: 0, 
        bx: 50, by: 50, vx: 0, vy: 0, 
        strikes1: 0, strikes2: 0, countdown: 3
    };

    let count = 3;
    const countInterval = setInterval(() => {
        if (!activeGames[roomName]) return clearInterval(countInterval);
        count--;
        if (count > 0) {
            game.pongState.countdown = count;
        } else if (count === 0) {
            game.pongState.countdown = 'GO!';
            resetBall(game.pongState, Math.random() > 0.5 ? 1 : -1);
        } else {
            game.pongState.countdown = null;
            clearInterval(countInterval);
        }
        io.to(roomName).emit('pongUpdate', game.pongState);
    }, 1000);

    game.pongInterval = setInterval(() => {
        if (!activeGames[roomName]) return clearInterval(game.pongInterval);
        const s = game.pongState;

        s.p1y = Math.max(10, Math.min(90, s.p1y + s.p1Dir * 1.5));
        s.p2y = Math.max(10, Math.min(90, s.p2y + s.p2Dir * 1.5));

        s.bx += s.vx; 
        s.by += s.vy;

        if (s.by <= 2 || s.by >= 98) s.vy *= -1;

        if (s.bx <= 7 && s.bx >= 5 && Math.abs(s.by - s.p1y) <= 12) {
            s.vx = Math.abs(s.vx) + 0.05; s.vy += (s.by - s.p1y) * 0.05; 
        }
        if (s.bx >= 93 && s.bx <= 95 && Math.abs(s.by - s.p2y) <= 12) {
            s.vx = -(Math.abs(s.vx) + 0.05); s.vy += (s.by - s.p2y) * 0.05; 
        }

        if (s.bx < 0) { 
            s.strikes1++; 
            if (s.strikes1 < 3) pauseAndResetBall(s, 1, game, io, roomName); 
        } else if (s.bx > 100) { 
            s.strikes2++; 
            if (s.strikes2 < 3) pauseAndResetBall(s, -1, game, io, roomName); 
        }

        if (s.strikes1 >= 3 || s.strikes2 >= 3) {
            clearInterval(game.pongInterval);
            clearInterval(countInterval);
            const winnerId = s.strikes1 >= 3 ? game.player2Id : game.player1Id;
            const loserId = s.strikes1 >= 3 ? game.player1Id : game.player2Id;
            onGameEnd(roomName, winnerId, loserId);
        } else {
            io.to(roomName).emit('pongUpdate', s);
        }
    }, 1000 / 60); 
}

function pauseAndResetBall(s, direction, game, io, roomName) {
    s.bx = 50; s.by = 50; s.vx = 0; s.vy = 0;
    s.countdown = 'Ready?';
    io.to(roomName).emit('pongUpdate', s);
    setTimeout(() => { if (game.pongState) { s.countdown = null; resetBall(s, direction); } }, 1500);
}

function resetBall(s, direction) {
    s.bx = 50; s.by = 50; 
    s.vx = 0.4 * direction; 
    s.vy = (Math.random() * 0.8 - 0.4); 
}

function handlePaddleState(game, playerId, direction) {
    if (game.player1Id === playerId) game.pongState.p1Dir = direction;
    else if (game.player2Id === playerId) game.pongState.p2Dir = direction;
}

module.exports = { initPong, handlePaddleState };