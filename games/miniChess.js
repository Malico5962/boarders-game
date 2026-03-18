function getPlayer(piece) {
    if (piece >= 11 && piece <= 15) return 'Player 1';
    if (piece >= 21 && piece <= 25) return 'Player 2';
    return null;
}

function checkLineOfSight(board, fromR, fromC, toR, toC) {
    let rStep = toR === fromR ? 0 : (toR - fromR) / Math.abs(toR - fromR);
    let cStep = toC === fromC ? 0 : (toC - fromC) / Math.abs(toC - fromC);
    let r = fromR + rStep;
    let c = fromC + cStep;
    
    while (r !== toR || c !== toC) {
        if (board[r][c] !== 0) return false;
        r += rStep;
        c += cStep;
    }
    return true;
}

function isValidMove(board, player, fromR, fromC, toR, toC) {
    let piece = board[fromR][fromC];
    let target = board[toR][toC];

    if (target !== 0 && getPlayer(target) === player) return false; 

    let dr = toR - fromR;
    let dc = toC - fromC;
    let adr = Math.abs(dr);
    let adc = Math.abs(dc);

    let type = piece % 10; 

    if (type === 1) return adr <= 1 && adc <= 1; // King
    if (type === 2) { // Queen
        if (adr !== adc && adr !== 0 && adc !== 0) return false;
        return checkLineOfSight(board, fromR, fromC, toR, toC);
    }
    if (type === 3) { // Bishop
        if (adr !== adc) return false;
        return checkLineOfSight(board, fromR, fromC, toR, toC);
    }
    if (type === 4) { // Rook
        if (adr !== 0 && adc !== 0) return false;
        return checkLineOfSight(board, fromR, fromC, toR, toC);
    }
    if (type === 5) { // Pawn
        let dir = player === 'Player 1' ? 1 : -1; 
        if (dc === dir && adr === 0 && target === 0) return true; // Forward
        if (dc === dir && adr === 1 && target !== 0) return true; // Diagonal capture
        return false;
    }
    return false;
}

module.exports = {
    handleMove: function(game, playerId, fromR, fromC, toR, toC) {
        let player = game.players[playerId];
        if (game.winner || game.turn !== player) return;
        
        let piece = game.board[fromR][fromC];
        if (getPlayer(piece) !== player) return;

        if (isValidMove(game.board, player, fromR, fromC, toR, toC)) {
            let target = game.board[toR][toC];
            
            game.board[toR][toC] = piece;
            game.board[fromR][fromC] = 0;

            // UPDATED: Pawn Promotion at the 4x8 boundaries!
            if (piece % 10 === 5) {
                if ((player === 'Player 1' && toC === 7) || (player === 'Player 2' && toC === 0)) {
                    game.board[toR][toC] = player === 'Player 1' ? 12 : 22; 
                }
            }

            if (target !== 0 && target % 10 === 1) {
                game.winner = player;
            } else {
                game.turn = player === 'Player 1' ? 'Player 2' : 'Player 1';
            }
        }
    }
};