function checkWin(board) {
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let [a,b,c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function handleMove(game, playerId, macroIndex, microIndex) {
    if (!game || game.winner) return;

    const playerSymbol = game.players[playerId];
    if (playerSymbol !== game.turn) return; 
    if (game.nextBoard !== -1 && game.nextBoard !== macroIndex) return; 
    if (game.macroBoard[macroIndex] !== null) return; 
    if (game.board[macroIndex][microIndex] !== null) return; 

    game.board[macroIndex][microIndex] = playerSymbol;

    const miniWin = checkWin(game.board[macroIndex]);
    const isMiniFull = game.board[macroIndex].every(cell => cell !== null);
    
    if (miniWin) game.macroBoard[macroIndex] = miniWin;
    else if (isMiniFull) game.macroBoard[macroIndex] = 'Tie';

    const gameWin = checkWin(game.macroBoard);
    if (gameWin) {
        game.winner = gameWin;
    } else {
        game.turn = game.turn === 'X' ? 'O' : 'X'; 
        if (game.macroBoard[microIndex] !== null) {
            game.nextBoard = -1; 
        } else {
            game.nextBoard = microIndex; 
        }
    }
}

module.exports = { handleMove };