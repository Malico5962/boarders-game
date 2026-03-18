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

            } else if (game.gameType === 'Mini Chess') {
                let winnerMaterial = 0; let loserMaterial = 0;
                // FIXED: 4x8 bounds
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 8; c++) {
                        let p = game.board[r][c];
                        if (p === 0) continue;
                        let val = p % 10;
                        let score = val === 5 ? 1 : val === 3 ? 3 : val === 4 ? 5 : val === 2 ? 9 : 0;
                        
                        if ((p >= 11 && p <= 15 && winnerSymbol === 'Player 1') || 
                            (p >= 21 && p <= 25 && winnerSymbol === 'Player 2')) {
                            winnerMaterial += score;
                        } else {
                            loserMaterial += score;
                        }
                    }
                }
                pointsWon = 40 + Math.min(35, Math.floor(winnerMaterial * 1.5)); 
                pointsLost = 75 - Math.min(35, Math.floor(loserMaterial * 1.5)); 

            } else if (game.gameType === 'Battleship') {
                let winnerHealth = game.health[winnerId]; 
                let loserHits = 17 - winnerHealth; 
                pointsWon = 40 + Math.round((winnerHealth / 17) * 35); 
                pointsLost = 75 - Math.round((loserHits / 16) * 35); 

            } else if (game.gameType === 'Connect 4') {
                let piecesPlaced = 0;
                game.board.forEach(row => row.forEach(cell => { if(cell) piecesPlaced++; }));
                pointsWon = 40 + Math.round(((42 - piecesPlaced) / 42) * 35); 
                pointsLost = 50 + Math.round((piecesPlaced / 42) * 25); 
            
            } else if (game.gameType === 'Crazy Eights') {
                let loserHandSize = game.hands[loserId].length; 
                pointsWon = 40 + Math.min(35, loserHandSize * 5); 
                pointsLost = 75 - Math.min(35, Math.max(0, 7 - loserHandSize) * 5); 
                
            } else if (game.gameType === 'Rummy') {
                let diff = Math.abs((game.rummyScores?.['Player 1'] || 0) - (game.rummyScores?.['Player 2'] || 0));
                pointsWon = 40 + Math.min(35, diff);
                pointsLost = 40 + Math.min(35, diff);
            
            } else {
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