const valOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function isSet(cards) {
    if (cards.length < 3) return false;
    const val = cards[0].val;
    const suitsUsed = new Set();
    for (let c of cards) {
        if (c.val !== val) return false;
        if (suitsUsed.has(c.suit)) return false;
        suitsUsed.add(c.suit);
    }
    return true;
}

function isRun(cards) {
    if (cards.length < 3) return false;
    const suit = cards[0].suit;
    
    // Sort cards by their rank order
    let sorted = [...cards].sort((a, b) => valOrder.indexOf(a.val) - valOrder.indexOf(b.val));
    
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].suit !== suit) return false;
        if (i > 0) {
            let prevIdx = valOrder.indexOf(sorted[i-1].val);
            let currIdx = valOrder.indexOf(sorted[i].val);
            if (currIdx !== prevIdx + 1) return false;
        }
    }
    return true;
}

module.exports = {
    handleDraw: function(game, playerId, source, depthIndex = 0) {
        // Source can be 'deck' or 'discard'
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'draw') return;

        if (source === 'deck') {
            if (game.deck.length === 0) {
                let topCard = game.discardPile.pop();
                game.deck = game.discardPile.sort(() => Math.random() - 0.5);
                game.discardPile = [topCard];
            }
            game.hands[playerId].push(game.deck.pop());
            game.phase = 'play';
        } else if (source === 'discard' && game.discardPile.length > 0) {
            // Allows grabbing multiple cards from the discard pile (from the index clicked, to the top)
            const grabbedCards = game.discardPile.splice(depthIndex);
            game.hands[playerId].push(...grabbedCards);
            game.phase = 'play';
        }
    },

    handleMeld: function(game, playerId, cardIndices) {
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'play') return;

        // Extract the selected cards from the player's hand
        let hand = game.hands[playerId];
        let selectedCards = cardIndices.map(idx => hand[idx]);

        if (isSet(selectedCards) || isRun(selectedCards)) {
            // Add to table melds
            game.melds.push({
                id: Date.now() + Math.random(),
                owner: game.players[playerId],
                type: isSet(selectedCards) ? 'set' : 'run',
                cards: selectedCards
            });

            // Remove from hand (sort indices descending so splicing doesn't shift remaining targets)
            cardIndices.sort((a, b) => b - a).forEach(idx => hand.splice(idx, 1));

            if (hand.length === 0) game.winner = game.players[playerId];
        }
    },

    handleLayOff: function(game, playerId, cardIndex, meldId) {
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'play') return;

        let hand = game.hands[playerId];
        let card = hand[cardIndex];
        let targetMeld = game.melds.find(m => m.id === meldId);

        if (!card || !targetMeld) return;

        // Temporarily add card to check if the meld remains valid
        let testCards = [...targetMeld.cards, card];
        
        if ((targetMeld.type === 'set' && isSet(testCards)) || 
            (targetMeld.type === 'run' && isRun(testCards))) {
            
            targetMeld.cards.push(card);
            // Sort runs automatically so they look pretty on the table
            if (targetMeld.type === 'run') {
                targetMeld.cards.sort((a, b) => valOrder.indexOf(a.val) - valOrder.indexOf(b.val));
            }
            hand.splice(cardIndex, 1);

            if (hand.length === 0) game.winner = game.players[playerId];
        }
    },

    handleDiscard: function(game, playerId, cardIndex) {
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'play') return;

        let hand = game.hands[playerId];
        let card = hand.splice(cardIndex, 1)[0];
        
        if (card) {
            game.discardPile.push(card);
            
            if (hand.length === 0) {
                game.winner = game.players[playerId];
            } else {
                // Pass turn to next player
                game.turn = game.turn === 'Player 1' ? 'Player 2' : 'Player 1';
                game.phase = 'draw';
            }
        }
    }
};