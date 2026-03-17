function checkWin(board) {
    const lines = [
        [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]], // Rows
        [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]], // Cols
        [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]] // Diagonals
    ];
    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
            return { winner: board[a[0]][a[1]], line: line };
        }
    }
    return null;
}

module.exports = {
    handleMove: function(game, playerId, r, c) {
        let symbol = game.players[playerId];
        if (game.winner || game.turn !== symbol) return;
        if (game.board[r][c] !== null) return; // Cell is already occupied

        // 1. Add the new piece to the board and memory queue
        game.board[r][c] = symbol;
        game.history[symbol].push({r, c});

        // 2. If this makes 4 pieces, delete the oldest one instantly
        if (game.history[symbol].length > 3) {
            let oldest = game.history[symbol].shift(); // Removes the first item in the array
            game.board[oldest.r][oldest.c] = null; // Clears the cell
        }

        // 3. Check if that move resulted in a win
        let winData = checkWin(game.board);
        if (winData) {
            game.winner = winData.winner;
            game.winLine = winData.line;
        } else {
            // Pass turn
            game.turn = game.turn === 'X' ? 'O' : 'X';
        }
    }
};