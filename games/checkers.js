function getValidJumps(board, player, r, c, isKing) {
    let jumps = [];
    const dirs = isKing ? [[1,1], [1,-1], [-1,1], [-1,-1]] : (player === 'Red' ? [[1,1], [1,-1]] : [[-1,1], [-1,-1]]);
    
    let oppM = player === 'Red' ? 2 : 1;
    let oppK = player === 'Red' ? 4 : 3;

    for (let [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        let jr = r + dr * 2, jc = c + dc * 2;

        if (jr >= 0 && jr < 4 && jc >= 0 && jc < 8) { // NEW 4x8 BOUNDS
            let mid = board[nr][nc];
            if ((mid === oppM || mid === oppK) && board[jr][jc] === 0) {
                jumps.push({ r: jr, c: jc });
            }
        }
    }
    return jumps;
}

function checkWin(game) {
    if (game.redCount <= 0) game.winner = 'Black';
    else if (game.blackCount <= 0) game.winner = 'Red';
}

module.exports = {
    handleMove: function(game, playerId, fromR, fromC, toR, toC) {
        let player = game.players[playerId];
        if (game.winner || game.turn !== player) return;

        // FIXED: Force the player to move the specific piece if it is multi-jumping!
        if (game.multiJumping && (game.multiJumping.r !== fromR || game.multiJumping.c !== fromC)) return;

        let piece = game.board[fromR][fromC];
        if (piece === 0) return;
        
        let isKing = (piece === 3 || piece === 4);
        if ((player === 'Red' && piece !== 1 && piece !== 3) || (player === 'Black' && piece !== 2 && piece !== 4)) return;

        let dr = toR - fromR;
        let dc = toC - fromC;
        let isJump = Math.abs(dr) === 2 && Math.abs(dc) === 2;
        let isNormal = Math.abs(dr) === 1 && Math.abs(dc) === 1;

        if (!isKing) {
            if (player === 'Red' && dr < 0) return;
            if (player === 'Black' && dr > 0) return;
        }

        if (isNormal && !game.multiJumping && game.board[toR][toC] === 0) {
            game.board[toR][toC] = piece;
            game.board[fromR][fromC] = 0;
            
            if (player === 'Red' && toR === 3) game.board[toR][toC] = 3;
            if (player === 'Black' && toR === 0) game.board[toR][toC] = 4;

            game.turn = player === 'Red' ? 'Black' : 'Red';
            checkWin(game);
            return;
        }

        if (isJump && game.board[toR][toC] === 0) {
            let capR = fromR + dr / 2;
            let capC = fromC + dc / 2;
            let capPiece = game.board[capR][capC];
            
            let oppM = player === 'Red' ? 2 : 1;
            let oppK = player === 'Red' ? 4 : 3;

            if (capPiece === oppM || capPiece === oppK) {
                game.board[toR][toC] = piece;
                game.board[fromR][fromC] = 0;
                game.board[capR][capC] = 0;

                if (player === 'Red') game.blackCount--;
                if (player === 'Black') game.redCount--;

                let kinged = false;
                if (player === 'Red' && toR === 3 && piece === 1) { game.board[toR][toC] = 3; kinged = true; isKing = true; }
                if (player === 'Black' && toR === 0 && piece === 2) { game.board[toR][toC] = 4; kinged = true; isKing = true; }

                let moreJumps = getValidJumps(game.board, player, toR, toC, isKing);
                if (moreJumps.length > 0 && !kinged) {
                    game.multiJumping = { r: toR, c: toC }; // Keeps the turn!
                } else {
                    game.multiJumping = null; // Ends the turn
                    game.turn = player === 'Red' ? 'Black' : 'Red';
                }
                checkWin(game);
            }
        }
    }
};