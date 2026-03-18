// public/buckpool.js

let currentPool = 0;
let maxAllocation = 0;
let myCurrentBucks = 0;
let oppCurrentBucks = 0;

// 1. Inject the Side Menu UI dynamically
function injectSideMenuUI() {
    const sideMenuHTML = `
        <button id="toggleSideMenuBtn" style="display: none; position: fixed; top: 20px; right: 20px; z-index: 1000; font-size: 1.5rem; padding: 10px 15px; background: var(--accent); box-shadow: 0 6px 0 #e19000; border-radius: 15px;">💬 Menu</button>
        
        <div id="gameSideMenu" style="position: fixed; top: 0; right: -400px; width: 350px; height: 100vh; background: var(--bg-glass); backdrop-filter: blur(15px); border-left: 2px solid rgba(255,255,255,0.6); box-shadow: -10px 0 30px rgba(0,0,0,0.15); transition: right 0.3s ease; z-index: 999; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box;">
            
            <h2 style="margin-top: 60px; font-size: 2rem;">Match Menu</h2>
            
            <div style="background: white; padding: 15px; border-radius: 20px; border: 2px solid #dfe6e9; margin-bottom: 20px;">
                <h3 style="margin-top:0; color: var(--secondary);">Buck Pool: <span id="poolDisplay" style="color: #2ed573;">0</span> 💵</h3>
                <p style="margin: 5px 0; font-size: 0.9rem; font-weight: 900; color: #636e72;">
                    You: <span id="myBucksDisplay">0</span> | Opponent: <span id="oppBucksDisplay">0</span>
                </p>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
                    <input type="number" id="allocateInput" min="1" max="100" placeholder="Amt" style="width: 50%; margin: 0; padding: 10px;">
                    <button id="requestAllocateBtn" style="width: 50%; margin: 0; padding: 10px; font-size: 1rem; background: #2ed573; box-shadow: 0 4px 0 #27ae60;">Add to Pool</button>
                </div>
                <p id="allocateStatus" style="font-size: 0.9rem; font-weight: 900; color: var(--primary); margin: 10px 0 0 0;"></p>
            </div>

            <div style="flex-grow: 1; display: flex; flex-direction: column; background: white; border-radius: 20px; border: 2px solid #dfe6e9; padding: 15px; overflow: hidden;">
                <h3 style="margin-top:0; color: var(--text);">In-Game Chat</h3>
                <div id="inGameChatBox" style="flex-grow: 1; overflow-y: auto; text-align: left; margin-bottom: 10px; font-size: 0.95rem;"></div>
                <div style="display: flex; gap: 5px;">
                    <input type="text" id="inGameChatInput" placeholder="Aa" style="width: 70%; margin: 0; padding: 10px;">
                    <button id="sendInGameChatBtn" style="width: 30%; margin: 0; padding: 10px; font-size: 1rem;">Send</button>
                </div>
            </div>
        </div>

        <div id="allocation-request-modal" class="modal-overlay" style="z-index: 2000;">
            <div class="modal-content">
                <h2 style="font-size: 2rem;">Buck Request!</h2>
                <p style="font-size: 1.2rem; font-weight: 900; color: var(--text);">Your opponent wants to add <span id="requestAmountDisplay" style="color: #2ed573; font-size: 1.5rem;">0</span> Bucks to the winner's pool.</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="acceptAllocateBtn" style="width: 50%; background: #2ed573; box-shadow: 0 8px 0 #27ae60;">Accept</button>
                    <button id="denyAllocateBtn" style="width: 50%; background: #ff4757; box-shadow: 0 8px 0 #ff1e33;">Deny</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', sideMenuHTML);
}

// Initialize the UI elements immediately
injectSideMenuUI();

// 2. Setup Logic & Listeners
let isMenuOpen = false;
let pendingRequestAmount = 0;

document.getElementById('toggleSideMenuBtn').addEventListener('click', () => {
    isMenuOpen = !isMenuOpen;
    document.getElementById('gameSideMenu').style.right = isMenuOpen ? '0px' : '-400px';
});

// Called from app.js when a game starts
window.initBuckPool = function(myBucks, oppBucks) {
    currentPool = 0;
    myCurrentBucks = myBucks;
    oppCurrentBucks = oppBucks;
    
    // Limit is 100, OR the lowest balance between the two players
    maxAllocation = Math.min(myBucks, oppBucks, 100);
    
    document.getElementById('myBucksDisplay').innerText = myCurrentBucks;
    document.getElementById('oppBucksDisplay').innerText = oppCurrentBucks;
    document.getElementById('poolDisplay').innerText = currentPool;
    document.getElementById('allocateStatus').innerText = '';
    document.getElementById('inGameChatBox').innerHTML = '<div style="color: #a4b0be; font-style: italic;">Match started. GLHF!</div>';
    
    document.getElementById('toggleSideMenuBtn').style.display = 'block';
};

// Hide the menu when game ends
window.hideBuckPool = function() {
    isMenuOpen = false;
    document.getElementById('gameSideMenu').style.right = '-400px';
    document.getElementById('toggleSideMenuBtn').style.display = 'none';
};

// 3. Button Listeners
document.getElementById('requestAllocateBtn').addEventListener('click', () => {
    const amt = parseInt(document.getElementById('allocateInput').value);
    if (isNaN(amt) || amt <= 0) return;
    
    if (amt > maxAllocation) {
        document.getElementById('allocateStatus').innerText = `Limit is ${maxAllocation} Bucks!`;
        return;
    }

    // Send request to server
    socket.emit('requestAllocation', { roomName: currentRoom, amount: amt });
    document.getElementById('allocateStatus').innerText = "Request sent... Waiting for response.";
    document.getElementById('allocateInput').value = '';
});

document.getElementById('acceptAllocateBtn').addEventListener('click', () => {
    document.getElementById('allocation-request-modal').style.display = 'none';
    socket.emit('respondAllocation', { roomName: currentRoom, accept: true, amount: pendingRequestAmount });
});

document.getElementById('denyAllocateBtn').addEventListener('click', () => {
    document.getElementById('allocation-request-modal').style.display = 'none';
    socket.emit('respondAllocation', { roomName: currentRoom, accept: false });
});

// In-Game Chat
document.getElementById('sendInGameChatBtn').addEventListener('click', () => {
    const msg = document.getElementById('inGameChatInput').value;
    if (msg && currentRoom) {
        socket.emit('sendInGameChat', { roomName: currentRoom, message: msg, username: myUsername });
        document.getElementById('inGameChatInput').value = '';
    }
});

document.getElementById('inGameChatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('sendInGameChatBtn').click();
});

// 4. Socket Listeners
socket.on('allocationRequested', (amount) => {
    pendingRequestAmount = amount;
    document.getElementById('requestAmountDisplay').innerText = amount;
    document.getElementById('allocation-request-modal').style.display = 'flex';
});

socket.on('allocationDenied', () => {
    document.getElementById('allocateStatus').innerText = "Opponent denied your request.";
    setTimeout(() => { document.getElementById('allocateStatus').innerText = ""; }, 3000);
});

socket.on('allocationAccepted', (data) => {
    currentPool = data.newPool;
    myCurrentBucks -= data.amountAdded;
    oppCurrentBucks -= data.amountAdded;
    maxAllocation = Math.min(myCurrentBucks, oppCurrentBucks, 100);

    document.getElementById('poolDisplay').innerText = currentPool;
    document.getElementById('myBucksDisplay').innerText = myCurrentBucks;
    document.getElementById('oppBucksDisplay').innerText = oppCurrentBucks;
    document.getElementById('allocateStatus').innerText = "Added to pool!";
    setTimeout(() => { document.getElementById('allocateStatus').innerText = ""; }, 3000);
});

socket.on('receiveInGameChat', (data) => {
    const chatBox = document.getElementById('inGameChatBox');
    chatBox.innerHTML += `<div style="margin: 5px 0;"><strong style="color: ${data.username === myUsername ? 'var(--primary)' : 'var(--secondary)'};">${data.username}:</strong> ${data.message}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
});