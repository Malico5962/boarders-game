module.exports = {
    calculatePoints: function(game, winnerId, loserId) {
        let pointsWon = 50;
        let pointsLost = 50;

        try {
            const winnerSymbol = game.players[winnerId];
            const loserSymbol = game.players[loserId];

            if (game.gameType === 'Super Tic-Tac-Toe') {
                let loserMacro = 0; let loserMicro = 0;
                game.macroBoard.forEach(b => { if (b === loserSymbol) loserMacro++; });
                game.board.forEach(macro => { macro.forEach(micro => { if (micro === loserSymbol) loserMicro++; }); });
                pointsWon = 45 + ((9 - loserMacro) * 3); 
                pointsLost = 75 - (loserMacro * 12) - Math.floor(loserMicro / 2); 
                
            } else if (game.gameType === 'Dots and Boxes') {
                let diff = game.scores[winnerSymbol] - game.scores[loserSymbol];
                pointsWon = 45 + Math.min(30, diff * 2); 
                pointsLost = 75 - Math.min(35, game.scores[loserSymbol] * 2.5); 

            } else if (game.gameType === 'Checkers') {
                let wPower = 0, lPower = 0;
                // NEW: Scanning 4 rows instead of 8
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 8; c++) {
                        let p = game.board[r][c];
                        if (p === 1) winnerSymbol === 'Red' ? wPower++ : lPower++;
                        if (p === 3) winnerSymbol === 'Red' ? wPower+=2 : lPower+=2;
                        if (p === 2) winnerSymbol === 'Black' ? wPower++ : lPower++;
                        if (p === 4) winnerSymbol === 'Black' ? wPower+=2 : lPower+=2;
                    }
                }
                pointsWon = 40 + Math.min(35, Math.floor(wPower * 4.5)); 
                pointsLost = 75 - Math.min(35, Math.floor(lPower * 5.5)); 

            } else if (game.gameType === 'Battleship') {
                let winnerHealth = game.health[winnerId]; 
                let loserHits = 17 - winnerHealth; 
                pointsWon = 40 + Math.round((winnerHealth / 17) * 35); 
                pointsLost = 75 - Math.round((loserHits / 16) * 35); 

            } else if (game.gameType === 'Connect 4') {
                let loserThreats = 0; let piecesPlaced = 0;
                const dirs = [[0,1], [1,0], [1,1], [1,-1]];
                for (let r = 0; r < 6; r++) {
                    for (let c = 0; c < 7; c++) {
                        if (game.board[r][c]) piecesPlaced++;
                        for (let [dr, dc] of dirs) {
                            let lCount = 0; let nullCount = 0; let validWindow = true;
                            for(let i = 0; i < 4; i++) {
                                let nr = r + dr*i, nc = c + dc*i;
                                if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7) {
                                    if (game.board[nr][nc] === loserSymbol) lCount++;
                                    else if (game.board[nr][nc] === null) nullCount++;
                                } else { validWindow = false; break; }
                            }
                            if (validWindow && lCount === 3 && nullCount === 1) loserThreats++;
                        }
                    }
                }
                loserThreats = Math.floor(loserThreats / 2);
                pointsWon = 40 + Math.round(((42 - piecesPlaced) / 35) * 35); 
                pointsLost = 75 - (loserThreats * 5) - Math.floor(piecesPlaced / 2); 
            
            } else if (game.gameType === 'Crazy Eights') {
                let loserHandSize = game.hands[loserId].length; 
                pointsWon = 40 + Math.min(35, loserHandSize * 5); 
                pointsLost = 75 - Math.min(35, Math.max(0, 7 - loserHandSize) * 5); 
                
            } else if (game.gameType === 'Rummy') {
                let diff = game.rummyScores[winnerSymbol] - game.rummyScores[loserSymbol];
                pointsWon = 40 + Math.min(35, diff);
                pointsLost = 75 - Math.min(35, Math.max(0, game.rummyScores[loserSymbol]));
            
            } else if (game.gameType === 'Endless Tic-Tac-Toe') {
                pointsWon = 40; 
                pointsLost = 40; 
            }

            pointsWon = Math.max(25, Math.min(75, Math.round(pointsWon)));
            pointsLost = Math.max(25, Math.min(75, Math.round(pointsLost)));

        } catch (e) {
            console.error("Rank calculation error, falling back to base points.", e);
            pointsWon = 50; pointsLost = 50;
        }

        return { pointsWon, pointsLost };
    }
};