module.exports = {
    handleShot: function(game, shooterId, r, c) {
        if (game.winner || game.turn !== game.players[shooterId] || game.phase !== 'playing') return;

        const targetId = Object.keys(game.players).find(id => id !== shooterId);
        const targetBoard = game.secretBoards[targetId];
        const shooterTrackingBoard = game.trackingBoards[shooterId];

        // 0 = empty, 1 = ship, 2 = miss, 3 = hit
        if (shooterTrackingBoard[r][c] !== 0) return; // Already shot here!

        if (targetBoard[r][c] === 1) {
            // HIT!
            targetBoard[r][c] = 3;
            shooterTrackingBoard[r][c] = 3;
            game.health[targetId]--;
            // You get to go again if you hit!
        } else {
            // MISS!
            targetBoard[r][c] = 2;
            shooterTrackingBoard[r][c] = 2;
            // Turn passes
            game.turn = game.turn === 'Player 1' ? 'Player 2' : 'Player 1';
        }

        if (game.health[targetId] <= 0) {
            game.winner = game.players[shooterId];
        }
    }
};