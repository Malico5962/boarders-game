module.exports = {
    handleMove: function(game, shooterId, fromR, fromC, toR, toC) {
        if (game.winner || game.turn !== game.players[shooterId]) return;

        const piece = game.board[fromR][fromC];
        const isRed = game.turn === 'Red';
        
        // 1 = Red, 2 = Black, 3 = Red King, 4 = Black King
        if (isRed && piece !== 1 && piece !== 3) return;
        if (!isRed && piece !== 2 && piece !== 4) return;
        if (game.board[toR][toC] !== 0) return; // Target must be empty

        const rowDiff = toR - fromR;
        const colDiff = toC - fromC;
        const isKing = piece === 3 || piece === 4;

        if (!isKing) {
            if (isRed && rowDiff < 0) return; // Red moves down
            if (!isRed && rowDiff > 0) return; // Black moves up
        }

        const isSimpleMove = Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1;
        const isJump = Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2;

        let validMove = false;

        if (isSimpleMove) {
            validMove = true;
        } else if (isJump) {
            const midR = fromR + rowDiff / 2;
            const midC = fromC + colDiff / 2;
            const midPiece = game.board[midR][midC];
            
            const isEnemy = isRed ? (midPiece === 2 || midPiece === 4) : (midPiece === 1 || midPiece === 3);
            if (isEnemy) {
                validMove = true;
                game.board[midR][midC] = 0; // Capture!
                if (isRed) game.blackCount--; else game.redCount--;
            }
        }

        if (!validMove) return;

        // Move piece
        game.board[toR][toC] = piece;
        game.board[fromR][fromC] = 0;

        // King promotion
        if (isRed && toR === 7 && piece === 1) game.board[toR][toC] = 3;
        if (!isRed && toR === 0 && piece === 2) game.board[toR][toC] = 4;

        // Pass Turn
        game.turn = isRed ? 'Black' : 'Red';

        // Win conditions
        if (game.redCount === 0) game.winner = 'Black';
        if (game.blackCount === 0) game.winner = 'Red';
    }
};