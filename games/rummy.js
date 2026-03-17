const valOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getCardValue(val) {
    if (['J', 'Q', 'K'].includes(val)) return 10;
    if (val === 'A') return 1;
    return parseInt(val);
}

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

function calculateScoresAndEnd(game) {
    let scores = { 'Player 1': 0, 'Player 2': 0 };

    // Add points for melds on the table
    game.melds.forEach(meld => {
        let meldScore = meld.cards.reduce((sum, card) => sum + getCardValue(card.val), 0);
        scores[meld.owner] += meldScore;
    });

    // Subtract points for cards left in hand
    Object.keys(game.hands).forEach(pId => {
        let playerSymbol = game.players[pId];
        let handPenalty = game.hands[pId].reduce((sum, card) => sum + getCardValue(card.val), 0);
        scores[playerSymbol] -= handPenalty;
    });

    game.rummyScores = scores;
    
    if (scores['Player 1'] > scores['Player 2']) {
        game.winner = 'Player 1';
    } else if (scores['Player 2'] > scores['Player 1']) {
        game.winner = 'Player 2';
    } else {
        game.winner = 'Tie';
    }
}

module.exports = {
    calculateScoresAndEnd,
    handleDraw: function(game, playerId, source, depthIndex = 0) {
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
            const grabbedCards = game.discardPile.splice(depthIndex);
            game.hands[playerId].push(...grabbedCards);
            game.phase = 'play';
        }
    },

    handleMeld: function(game, playerId, cardIndices) {
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'play') return;

        let hand = game.hands[playerId];
        let selectedCards = cardIndices.map(idx => hand[idx]);

        if (isSet(selectedCards) || isRun(selectedCards)) {
            game.melds.push({
                id: Date.now() + Math.random(),
                owner: game.players[playerId],
                type: isSet(selectedCards) ? 'set' : 'run',
                cards: selectedCards
            });

            cardIndices.sort((a, b) => b - a).forEach(idx => hand.splice(idx, 1));
            if (hand.length === 0) calculateScoresAndEnd(game);
        }
    },

    handleLayOff: function(game, playerId, cardIndex, meldId) {
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'play') return;

        let hand = game.hands[playerId];
        let card = hand[cardIndex];
        let targetMeld = game.melds.find(m => m.id === meldId);

        if (!card || !targetMeld) return;

        let testCards = [...targetMeld.cards, card];
        
        if ((targetMeld.type === 'set' && isSet(testCards)) || (targetMeld.type === 'run' && isRun(testCards))) {
            targetMeld.cards.push(card);
            if (targetMeld.type === 'run') targetMeld.cards.sort((a, b) => valOrder.indexOf(a.val) - valOrder.indexOf(b.val));
            hand.splice(cardIndex, 1);

            if (hand.length === 0) calculateScoresAndEnd(game);
        }
    },

    handleDiscard: function(game, playerId, cardIndex) {
        if (game.winner || game.turn !== game.players[playerId] || game.phase !== 'play') return;

        let hand = game.hands[playerId];
        let card = hand.splice(cardIndex, 1)[0];
        
        if (card) {
            game.discardPile.push(card);
            
            if (hand.length === 0) {
                calculateScoresAndEnd(game);
            } else {
                game.turn = game.turn === 'Player 1' ? 'Player 2' : 'Player 1';
                game.phase = 'draw';
            }
        }
    }
};