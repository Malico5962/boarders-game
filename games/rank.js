module.exports = {
    calculatePoints: function(game, winnerId, loserId) {
        let pointsWon = 50;
        let pointsLost = 50;

        try {
            const winnerSymbol = game.players[winnerId];
            const loserSymbol = game.players[loserId];

            if (game.gameType === 'Super Tic-Tac-Toe') {
                let loserMacro = 0;
                let loserMicro = 0;
                
                // Tally up the loser's total board control
                game.macroBoard.forEach(b => { if (b === loserSymbol) loserMacro++; });
                game.board.forEach(macro => {
                    macro.forEach(micro => { if (micro === loserSymbol) loserMicro++; });
                });

                // Up to 75 points for a shutout (loser got 0 macro boards)
                pointsWon = 45 + ((9 - loserMacro) * 3); 
                // Mitigate loss for capturing micro cells and macro boards
                pointsLost = 75 - (loserMacro * 12) - Math.floor(loserMicro / 2); 
                
            } else if (game.gameType === 'Dots and Boxes') {
                let wScore = game.scores[winnerSymbol];
                let lScore = game.scores[loserSymbol];
                let diff = wScore - lScore;
                
                // Max out around 75 for a complete stomp
                pointsWon = 45 + Math.min(30, diff * 2); 
                pointsLost = 75 - Math.min(35, lScore * 2.5); 

            } else if (game.gameType === 'Checkers') {
                let wPower = 0, lPower = 0;
                
                // Scan the board to calculate "Army Power" (Normal = 1, King = 2)
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        let p = game.board[r][c];
                        if (p === 1) winnerSymbol === 'Red' ? wPower++ : lPower++;
                        if (p === 3) winnerSymbol === 'Red' ? wPower+=2 : lPower+=2;
                        if (p === 2) winnerSymbol === 'Black' ? wPower++ : lPower++;
                        if (p === 4) winnerSymbol === 'Black' ? wPower+=2 : lPower+=2;
                    }
                }
                
                // Base 40, plus up to 35 points based on army health
                pointsWon = 40 + Math.min(35, Math.floor(wPower * 1.5)); 
                pointsLost = 75 - Math.min(35, Math.floor(lPower * 2.5)); 

            } else if (game.gameType === 'Battleship') {
                let winnerHealth = game.health[winnerId]; // 1 to 17
                let loserHits = 17 - winnerHealth; // How many times the loser hit the winner
                
                // Flawless win (17 health) = 75 points. 1 health = 42 points.
                pointsWon = 40 + Math.round((winnerHealth / 17) * 35); 
                // 0 hits landed = -75 points. 16 hits landed = -40 points.
                pointsLost = 75 - Math.round((loserHits / 16) * 35); 

            } else if (game.gameType === 'Connect 4') {
                let loserThreats = 0;
                let piecesPlaced = 0;

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

                // Fewer pieces placed = faster win = more points! (Max 42 pieces total)
                pointsWon = 40 + Math.round(((42 - piecesPlaced) / 35) * 35); 
                
                // Mitigate loss for setting up traps and making the game last
                pointsLost = 75 - (loserThreats * 5) - Math.floor(piecesPlaced / 2); 
            }

            // STRICT CLAMPS: Minimum +/- 25, Maximum +/- 75 to keep economy balanced
            pointsWon = Math.max(25, Math.min(75, Math.round(pointsWon)));
            pointsLost = Math.max(25, Math.min(75, Math.round(pointsLost)));

        } catch (e) {
            console.error("Rank calculation error, falling back to base points.", e);
            pointsWon = 50; pointsLost = 50;
        }

        return { pointsWon, pointsLost };
    }
};