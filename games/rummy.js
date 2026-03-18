// We define both a Low-Ace and High-Ace order for Run validation
const lowOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const highOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getCardValue(val) {
    if (['J', 'Q', 'K'].includes(val)) return 10;
    if (val === 'A') return 1; // Keeps Ace as 1 point for scoring
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
    
    // 1. Check if they are all the same suit
    for (let c of cards) { if (c.suit !== suit) return false; }
    
    let vals = cards.map(c => c.val);

    // 2. Helper function to check if values are consecutive against a specific order array
    const checkOrder = (orderArray) => {
        let sorted = [...vals].sort((a, b) => orderArray.indexOf(a) - orderArray.indexOf(b));
        for (let i = 1; i < sorted.length; i++) {
            if (orderArray.indexOf(sorted[i]) !== orderArray.indexOf(sorted[i-1]) + 1) return false;
        }
        return true;
    };

    // 3. Valid if it's a Low-Ace run (A-2-3) OR a High-Ace run (Q-K-A)
    return checkOrder(lowOrder) || checkOrder(highOrder);
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
            
            // Re-sort the run based on the new logic
            if (targetMeld.type === 'run') {
                if (testCards.some(c => c.val === 'A') && testCards.some(c => c.val === 'K')) {
                    targetMeld.cards.sort((a, b) => highOrder.indexOf(a.val) - highOrder.indexOf(b.val));
                } else {
                    targetMeld.cards.sort((a, b) => lowOrder.indexOf(a.val) - lowOrder.indexOf(b.val));
                }
            }
            
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
            
            // NEW: Enforce a 5-card limit on the discard pile!
            if (game.discardPile.length > 5) {
                // Remove the oldest card (the one at index 0)
                let oldestCard = game.discardPile.shift(); 
                
                // Pick a random spot in the deck and insert the card
                let randomIndex = Math.floor(Math.random() * (game.deck.length + 1));
                game.deck.splice(randomIndex, 0, oldestCard);
            }
            
            if (hand.length === 0) {
                calculateScoresAndEnd(game);
            } else {
                game.turn = game.turn === 'Player 1' ? 'Player 2' : 'Player 1';
                game.phase = 'draw';
            }
        }
    }
};