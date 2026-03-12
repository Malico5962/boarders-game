function checkWin(board) {
  const rows = 6, cols = 7;
  for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
          let player = board[r][c];
          if (!player) continue;
          
          if (c + 3 < cols && player === board[r][c+1] && player === board[r][c+2] && player === board[r][c+3]) return player;
          if (r + 3 < rows && player === board[r+1][c] && player === board[r+2][c] && player === board[r+3][c]) return player;
          if (r + 3 < rows && c + 3 < cols && player === board[r+1][c+1] && player === board[r+2][c+2] && player === board[r+3][c+3]) return player;
          if (r + 3 < rows && c - 3 >= 0 && player === board[r+1][c-1] && player === board[r+2][c-2] && player === board[r+3][c-3]) return player;
      }
  }
  return null;
}

function handleMove(game, playerId, col) {
  if (!game || game.winner) return;
  
  const playerColor = game.players[playerId];
  if (playerColor !== game.turn) return; 

  let placedRow = -1;
  for (let r = 5; r >= 0; r--) {
      if (!game.board[r][col]) {
          game.board[r][col] = playerColor;
          placedRow = r;
          break;
      }
  }
  
  if (placedRow === -1) return; 

  const win = checkWin(game.board);
  if (win) {
      game.winner = win;
  } else if (game.board[0].every(c => c !== null)) {
      game.winner = 'Tie'; 
  } else {
      game.turn = game.turn === 'Red' ? 'Yellow' : 'Red'; 
  }
}

module.exports = { handleMove };