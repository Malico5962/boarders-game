module.exports = {
    handleMove: function(game, playerId, col) {
        if (game.winner || game.turn !== game.players[playerId]) return;

        let placedRow = -1;
        // Drop physics: Find lowest empty row in column
        for (let r = 5; r >= 0; r--) {
            if (!game.board[r][col]) {
                game.board[r][col] = game.turn;
                placedRow = r;
                break;
            }
        }
        if (placedRow === -1) return; // Column is full

        // Check for Win AND record the winning line coordinates
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]; // Right, Down, Diag Right, Diag Left
        for (let [dr, dc] of directions) {
            let count = 1;
            let line = [[placedRow, col]];
            
            // Check positive direction
            for (let i = 1; i <= 3; i++) {
                const nr = placedRow + dr * i, nc = col + dc * i;
                if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && game.board[nr][nc] === game.turn) {
                    count++; line.push([nr, nc]);
                } else break;
            }
            // Check negative direction
            for (let i = 1; i <= 3; i++) {
                const nr = placedRow - dr * i, nc = col - dc * i;
                if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && game.board[nr][nc] === game.turn) {
                    count++; line.push([nr, nc]);
                } else break;
            }
            
            if (count >= 4) {
                game.winner = game.turn;
                game.winLine = line; // Save the winning chips!
                return;
            }
        }

        // Check for tie
        if (game.board[0].every(c => c !== null)) game.winner = 'Tie';
        else game.turn = game.turn === 'Red' ? 'Yellow' : 'Red'; // Pass turn
    }
};