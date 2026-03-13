module.exports = {
    handleMove: function(game, playerId, type, r, c) {
        if (game.winner || game.turn !== game.players[playerId]) return;

        // Check if line already drawn
        if (type === 'h' && game.hLines[r][c] !== null) return;
        if (type === 'v' && game.vLines[r][c] !== null) return;

        // Draw line
        if (type === 'h') game.hLines[r][c] = game.turn;
        if (type === 'v') game.vLines[r][c] = game.turn;

        let boxCompleted = false;
        
        // Helper to check if a box just got closed
        const checkBox = (row, col) => {
            if (row < 0 || row >= 3 || col < 0 || col >= 3) return false;
            if (game.boxes[row][col] !== null) return false; 
            
            const top = game.hLines[row][col] !== null;
            const bottom = game.hLines[row+1][col] !== null;
            const left = game.vLines[row][col] !== null;
            const right = game.vLines[row][col+1] !== null;

            if (top && bottom && left && right) {
                game.boxes[row][col] = game.turn;
                game.scores[game.turn]++;
                return true;
            }
            return false;
        };

        // Check adjacent boxes based on line type
        if (type === 'h') {
            if (checkBox(r - 1, c)) boxCompleted = true;
            if (checkBox(r, c)) boxCompleted = true;
        } else {
            if (checkBox(r, c - 1)) boxCompleted = true;
            if (checkBox(r, c)) boxCompleted = true;
        }

        // If you close a box, you get to go again! Otherwise, turn passes.
        if (!boxCompleted) {
            game.turn = game.turn === 'Red' ? 'Blue' : 'Red';
        }

        // Win condition
        if (game.scores['Red'] + game.scores['Blue'] === 9) {
            if (game.scores['Red'] > game.scores['Blue']) game.winner = 'Red';
            else if (game.scores['Blue'] > game.scores['Red']) game.winner = 'Blue';
            else game.winner = 'Tie';
        }
    }
};