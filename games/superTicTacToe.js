module.exports = {
    handleMove: function(game, playerId, macroIndex, microIndex) {
        if (game.winner || game.turn !== game.players[playerId]) return;
        if (game.nextBoard !== -1 && game.nextBoard !== macroIndex && game.macroBoard[game.nextBoard] === null) return;
        if (game.macroBoard[macroIndex] !== null || game.board[macroIndex][microIndex] !== null) return;

        game.board[macroIndex][microIndex] = game.turn;

        const winLines = [
            [0,1,2], [3,4,5], [6,7,8], // rows
            [0,3,6], [1,4,7], [2,5,8], // cols
            [0,4,8], [2,4,6]           // diags
        ];

        // Check micro board win
        let microWon = false;
        for (let line of winLines) {
            if (game.board[macroIndex][line[0]] &&
                game.board[macroIndex][line[0]] === game.board[macroIndex][line[1]] &&
                game.board[macroIndex][line[0]] === game.board[macroIndex][line[2]]) {
                game.macroBoard[macroIndex] = game.turn;
                microWon = true;
                break;
            }
        }
        if (!microWon && !game.board[macroIndex].includes(null)) game.macroBoard[macroIndex] = 'Tie';

        // Check macro board win
        for (let line of winLines) {
            if (game.macroBoard[line[0]] && game.macroBoard[line[0]] !== 'Tie' &&
                game.macroBoard[line[0]] === game.macroBoard[line[1]] &&
                game.macroBoard[line[0]] === game.macroBoard[line[2]]) {
                game.winner = game.turn;
                game.winLine = line; // Save the winning line for the animation!
                break;
            }
        }
        if (!game.winner && !game.macroBoard.includes(null)) game.winner = 'Tie';

        game.nextBoard = game.macroBoard[microIndex] !== null ? -1 : microIndex;
        if (!game.winner) game.turn = game.turn === 'X' ? 'O' : 'X';
    }
};