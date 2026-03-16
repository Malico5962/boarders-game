module.exports = {
    handlePlay: function(game, playerId, cardIndex, declaredSuit) {
        if (game.winner || game.turn !== game.players[playerId]) return;

        let hand = game.hands[playerId];
        let card = hand[cardIndex];
        if (!card) return;

        let topCard = game.discardPile[game.discardPile.length - 1];
        let currentSuit = game.activeSuit || topCard.suit;

        // Valid if: It's an 8, matches the current suit, or matches the top card's value
        let isValid = card.val === '8' || card.suit === currentSuit || card.val === topCard.val;

        if (isValid) {
            hand.splice(cardIndex, 1); // Remove from hand
            game.discardPile.push(card); // Add to discard
            
            // If it's an 8, set the active suit. Otherwise, clear it.
            game.activeSuit = card.val === '8' ? declaredSuit : null;

            if (hand.length === 0) {
                game.winner = game.players[playerId];
            } else {
                game.turn = game.turn === 'Player 1' ? 'Player 2' : 'Player 1';
            }
        }
    },

    handleDraw: function(game, playerId) {
        if (game.winner || game.turn !== game.players[playerId]) return;

        // Reshuffle discard pile into deck if empty
        if (game.deck.length === 0) {
            let topCard = game.discardPile.pop();
            game.deck = game.discardPile.sort(() => Math.random() - 0.5);
            game.discardPile = [topCard];
        }

        if (game.deck.length > 0) {
            let card = game.deck.pop();
            game.hands[playerId].push(card);
        }
        
        // For fast-paced web play: Drawing a card ends your turn
        game.turn = game.turn === 'Player 1' ? 'Player 2' : 'Player 1';
    }
};