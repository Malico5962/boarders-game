// public/shop.js

// UPDATED: Much more vibrant/neon hex codes!
const catalogColors = {
    red: '#ff003c', orange: '#ff8800', yellow: '#ffcc00',
    green: '#00e640', blue: '#0088ff', purple: '#b000ff'
};

const SHOP_CATALOG = [];
const variants = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

variants.forEach(color => {
    const capColor = color.charAt(0).toUpperCase() + color.slice(1);
    SHOP_CATALOG.push({ id: `border_${color}`, name: `${capColor} Border`, type: 'border', cost: 20, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `banner_${color}`, name: `${capColor} Banner`, type: 'banner', cost: 50, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `piece_${color}`, name: `${capColor} Pieces`, type: 'piece', cost: 100, hex: catalogColors[color] });
});

async function handleBuyItem(itemId, cost) {
    if (!myUserObj) return;
    const res = await fetch('/shop/buy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUserObj.username, itemId, cost })
    });
    const data = await res.json();
    if (res.ok) {
        myUserObj = data.user;
        updateDashboardUI();
        renderShop(); 
        renderLocker(); 
    } else {
        alert(data.error);
    }
}

async function handleEquipItem(type, itemId) {
    if (!myUserObj) return;
    const res = await fetch('/shop/equip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUserObj.username, type, itemId })
    });
    const data = await res.json();
    if (res.ok) {
        myUserObj = data.user;
        renderLocker(); 
        updateDashboardUI(); 
    }
}

function renderShop() {
    const container = document.querySelector('#shop-modal .modal-content');
    if (!container || !myUserObj) return;

    let html = `<h2 style="font-size: 2.5rem; margin-top:0;">Shop 🛒</h2>
                <p style="font-weight:900; color: #2ed573; font-size: 1.2rem;">Your Bucks: ${myUserObj.bucks} 💵</p>
                <div style="max-height: 50vh; overflow-y: auto; text-align: left; padding-right: 10px;">`;

    ['border', 'banner', 'piece'].forEach(type => {
        html += `<h3 style="text-transform: capitalize; border-bottom: 2px solid #f1f2f6; padding-bottom: 5px;">${type}s</h3>`;
        const items = SHOP_CATALOG.filter(i => i.type === type);
        
        items.forEach(item => {
            const isOwned = myUserObj.inventory && myUserObj.inventory.includes(item.id);
            const canAfford = myUserObj.bucks >= item.cost;
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 10px 15px; border-radius: 15px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 25px; height: 25px; border-radius: 5px; background: ${item.hex};"></div>
                        <span style="font-weight: 900;">${item.name}</span>
                    </div>
                    ${isOwned 
                        ? `<span style="font-weight:900; color:#a4b0be;">Owned</span>` 
                        : `<button style="margin:0; padding: 5px 15px; font-size: 1rem; background: ${canAfford ? 'var(--accent)' : '#ced6e0'}; box-shadow: 0 4px 0 ${canAfford ? '#e19000' : '#a4b0be'};" 
                            ${canAfford ? `onclick="handleBuyItem('${item.id}', ${item.cost})"` : 'disabled'}>
                            ${item.cost} 💵
                           </button>`
                    }
                </div>
            `;
        });
    });

    html += `</div><button id="closeShopBtn-inner" style="width:100%; margin-top: 20px; background: #ced6e0; color: var(--text); box-shadow: 0 8px 0 #a4b0be;">Close</button>`;
    container.innerHTML = html;
    document.getElementById('closeShopBtn-inner').onclick = () => document.getElementById('shop-modal').style.display = 'none';
}

function renderLocker() {
    const container = document.querySelector('#locker-modal .modal-content');
    if (!container || !myUserObj) return;

    let html = `<h2 style="font-size: 2.5rem; margin-top:0;">Locker 🎒</h2>
                <div style="max-height: 50vh; overflow-y: auto; text-align: left; padding-right: 10px;">`;

    ['border', 'banner', 'piece'].forEach(type => {
        html += `<h3 style="text-transform: capitalize; border-bottom: 2px solid #f1f2f6; padding-bottom: 5px;">${type}s</h3>`;
        
        const currentlyEquipped = myUserObj.equipped ? myUserObj.equipped[type] : 'none';
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 10px 15px; border-radius: 15px; margin-bottom: 10px;">
                <span style="font-weight: 900;">Default (None)</span>
                ${currentlyEquipped === 'none' 
                    ? `<span style="font-weight:900; color:var(--secondary);">Equipped</span>`
                    : `<button style="margin:0; padding: 5px 15px; font-size: 1rem; background: var(--secondary);" onclick="handleEquipItem('${type}', 'none')">Equip</button>`
                }
            </div>
        `;

        const ownedItems = SHOP_CATALOG.filter(i => i.type === type && myUserObj.inventory && myUserObj.inventory.includes(i.id));
        
        if (ownedItems.length === 0) {
            html += `<p style="color: #a4b0be; font-style: italic; font-size: 0.9rem;">You don't own any ${type}s yet.</p>`;
        } else {
            ownedItems.forEach(item => {
                const isEquipped = currentlyEquipped === item.id;
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 10px 15px; border-radius: 15px; margin-bottom: 10px; ${isEquipped ? `border: 2px solid ${item.hex};` : ''}">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 25px; height: 25px; border-radius: 5px; background: ${item.hex};"></div>
                            <span style="font-weight: 900;">${item.name}</span>
                        </div>
                        ${isEquipped 
                            ? `<span style="font-weight:900; color:${item.hex};">Equipped</span>` 
                            : `<button style="margin:0; padding: 5px 15px; font-size: 1rem;" onclick="handleEquipItem('${type}', '${item.id}')">Equip</button>`
                        }
                    </div>
                `;
            });
        }
    });

    html += `</div><button id="closeLockerBtn-inner" style="width:100%; margin-top: 20px; background: #ced6e0; color: var(--text); box-shadow: 0 8px 0 #a4b0be;">Close</button>`;
    container.innerHTML = html;
    document.getElementById('closeLockerBtn-inner').onclick = () => document.getElementById('locker-modal').style.display = 'none';
}

window.renderShop = renderShop;
window.renderLocker = renderLocker;
window.SHOP_CATALOG = SHOP_CATALOG;