const gameInstructions = [
    {
        name: "Super Tic-Tac-Toe",
        icon: "❌",
        desc: "It's a game of inception! The board is made of 9 small Tic-Tac-Toe boards. <b>The catch:</b> Wherever you play in a small board determines which small board your opponent is forced to play in next! Win a small board by getting 3 in a row. Win the entire game by winning 3 small boards in a row."
    },
    {
        name: "Connect 4",
        icon: "🔴",
        desc: "A true classic. Take turns dropping your colored discs into the grid. The first player to connect 4 of their discs in a row—whether horizontally, vertically, or diagonally—wins the game!"
    },
    {
        name: "Dots and Boxes",
        icon: "🟦",
        desc: "Click the space between two dots to draw a line. If your line completes a 1x1 box, you capture it, earn a point, and get a bonus turn! The player with the most captured boxes when the grid is full wins."
    },
    {
        name: "Battleship",
        icon: "🚢",
        desc: "First, position your fleet of 5 ships secretly on your grid. Then, take turns firing at your opponent's hidden grid. A successful hit marks an 'X', while a miss marks a dot. Sink all 5 of their ships before they sink yours!"
    },
    {
        name: "Checkers",
        icon: "👑",
        desc: "Move your pieces diagonally forward. If an opponent's piece is right in front of you, jump over it to capture it! Reach the opposite end of the board to become a 'King', which allows that piece to move diagonally backward as well. Capture all opponent pieces to win."
    },
    {
        name: "Crazy Eights",
        icon: "🃏",
        desc: "Your goal is to empty your hand. On your turn, play a card that matches the top card of the discard pile by its <b>Suit</b> (e.g., Hearts) or its <b>Number</b>. '8's are wild cards that can be played at any time and let you pick a new active suit. If you don't have a match, you must draw from the deck!"
    },
    {
        name: "Rummy",
        icon: "🃏",
        desc: "Empty your hand by forming 'Melds' on the table!<br><br><b>1. Draw:</b> Start your turn by clicking the deck OR grabbing cards from the discard pile.<br><b>2. Meld:</b> Highlight cards in your hand to form a <b>Set</b> (3+ cards of the same number) or a <b>Run</b> (3+ cards in consecutive order of the same suit) and click 'Meld Selected'. You can also highlight one card and click 'Lay Off' to attach it to a meld already on the table.<br><b>3. Discard:</b> Highlight one card and click 'Discard' to end your turn."
    }
];

function renderHowToPlay() {
    const container = document.getElementById('howtoplay-content');
    if (!container) return;

    let html = '';
    gameInstructions.forEach(game => {
        html += `
            <div style="margin-bottom: 20px; background: #f1f2f6; padding: 20px; border-radius: 15px; border: 2px solid #dfe6e9;">
                <h3 style="margin-top: 0; color: var(--secondary); font-size: 1.5rem; display: flex; align-items: center; gap: 10px;">
                    ${game.icon} ${game.name}
                </h3>
                <p style="margin: 0; font-size: 1.1rem; line-height: 1.6; color: var(--text);">${game.desc}</p>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.renderHowToPlay = renderHowToPlay;