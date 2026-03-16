const STATS_KEY = 'boarders_local_stats';

// Grabs the stats from memory, or creates a blank slate if the player is new
function initStats() {
    let stats = localStorage.getItem(STATS_KEY);
    if (!stats) {
        stats = {
            totalWins: 0,
            totalLosses: 0,
            totalTies: 0,
            games: {} // Will hold specific games like { 'Connect 4': { wins: 1, losses: 0 } }
        };
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }
    return JSON.parse(localStorage.getItem(STATS_KEY));
}

// Called automatically when a game ends
function recordGameResult(gameType, isWinner, isTie) {
    if (!gameType) return; // Safety check
    
    let stats = initStats();

    // If this is the first time playing this specific game, set it up!
    if (!stats.games[gameType]) {
        stats.games[gameType] = { wins: 0, losses: 0, ties: 0 };
    }

    if (isTie) {
        stats.totalTies++;
        stats.games[gameType].ties++;
    } else if (isWinner) {
        stats.totalWins++;
        stats.games[gameType].wins++;
    } else {
        stats.totalLosses++;
        stats.games[gameType].losses++;
    }

    // Save it back to the computer
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Builds the HTML to display the stats in the modal
function renderStatsUI() {
    const stats = initStats();
    const container = document.getElementById('stats-content');
    if (!container) return;

    let html = `
        <div style="display: flex; justify-content: space-around; margin-bottom: 20px; background: #f1f2f6; padding: 15px; border-radius: 20px;">
            <div><h3 style="margin:0; color: var(--secondary); font-size: 2rem;">${stats.totalWins}</h3><span style="font-weight:900; color: var(--text);">Wins</span></div>
            <div><h3 style="margin:0; color: var(--primary); font-size: 2rem;">${stats.totalLosses}</h3><span style="font-weight:900; color: var(--text);">Losses</span></div>
            <div><h3 style="margin:0; color: #a4b0be; font-size: 2rem;">${stats.totalTies}</h3><span style="font-weight:900; color: var(--text);">Ties</span></div>
        </div>
        <hr style="border: 2px solid #f1f2f6; margin: 20px 0; border-radius: 2px;">
        <div style="text-align: left;">
    `;

    const gameNames = Object.keys(stats.games);
    if (gameNames.length === 0) {
        html += `<p style="text-align:center; color: #a4b0be; font-weight:900; font-size: 1.2rem;">Play some games to see your stats here!</p>`;
    } else {
        gameNames.forEach(game => {
            const gStats = stats.games[game];
            html += `
                <div style="margin-bottom: 15px; background: white; padding: 15px; border-radius: 15px; border: 2px solid #dfe6e9; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 5px 10px rgba(0,0,0,0.02);">
                    <span style="font-weight: 900; font-size: 1.2rem; color: var(--text);">${game}</span>
                    <span style="font-weight: 900; font-size: 1.1rem; background: #f1f2f6; padding: 5px 15px; border-radius: 10px;">
                        <span style="color:var(--secondary);">${gStats.wins}W</span> <span style="color:#a4b0be; margin: 0 5px;">-</span> 
                        <span style="color:var(--primary);">${gStats.losses}L</span>
                    </span>
                </div>
            `;
        });
    }

    html += `</div>`;
    container.innerHTML = html;
}

// Make these available to app.js
window.recordGameResult = recordGameResult;
window.renderStatsUI = renderStatsUI;