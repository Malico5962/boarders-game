// public/shop.js

const shopStyles = document.createElement('style');
shopStyles.innerHTML = `
    #shop-modal .modal-content, #locker-modal .modal-content {
        width: 800px !important;
        max-width: 95vw !important;
        padding: 0 !important;
        overflow: hidden;
    }
    .shop-sidebar { width: 25%; background: rgba(0,0,0,0.03); padding: 30px 15px; border-right: 2px solid #dfe6e9; display: flex; flex-direction: column; gap: 8px; }
    .shop-tab-btn { background: transparent; color: var(--text); box-shadow: none; border-radius: 10px; padding: 12px; text-align: left; font-size: 1rem; border: 2px solid transparent; transition: 0.2s; }
    .shop-tab-btn:hover { background: rgba(0,0,0,0.05); transform: none; }
    .shop-tab-btn.active { background: white; border: 2px solid var(--secondary); font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transform: translateX(5px); color: var(--secondary); }
    .shop-main-area { width: 75%; padding: 30px; overflow-y: auto; max-height: 70vh; text-align: left; }
`;
document.head.appendChild(shopStyles);

const catalogColors = {
    red: '#ff003c', orange: '#ff8800', yellow: '#ffcc00',
    green: '#00e640', blue: '#0088ff', purple: '#b000ff'
};

const defaultItemIds = ['piece_red', 'piece_blue', 'cardBack_red'];

const SHOP_CATALOG = [];
const variants = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

variants.forEach(color => {
    const capColor = color.charAt(0).toUpperCase() + color.slice(1);
    SHOP_CATALOG.push({ id: `border_${color}`, name: `${capColor} Border`, type: 'border', cost: 20, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `banner_${color}`, name: `${capColor} Banner`, type: 'banner', cost: 50, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `piece_${color}`, name: `${capColor} Pieces`, type: 'piece', cost: 100, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `cardBack_${color}`, name: `${capColor} Deck`, type: 'cardBack', cost: 100, hex: catalogColors[color] });
});

const emojis = [
    { id: 'emoji_joy', icon: '😂', name: 'Tears of Joy' },
    { id: 'emoji_rage', icon: '😡', name: 'Rage' },
    { id: 'emoji_cool', icon: '😎', name: 'Cool' },
    { id: 'emoji_cry', icon: '😭', name: 'Crying' },
    { id: 'emoji_mindblown', icon: '🤯', name: 'Mind Blown' },
    { id: 'emoji_party', icon: '🥳', name: 'Party' }
];
emojis.forEach(e => SHOP_CATALOG.push({ id: e.id, name: e.name, type: 'emoji', cost: 15, icon: e.icon }));

const animations = [
    { id: 'winAnim_confetti', icon: '🎊', name: 'Confetti Shower' },
    { id: 'winAnim_fireworks', icon: '🎆', name: 'Grand Fireworks' },
    { id: 'winAnim_lightning', icon: '⚡', name: 'Lightning Strike' }
];
animations.forEach(a => SHOP_CATALOG.push({ id: a.id, name: a.name, type: 'winAnim', cost: 80, icon: a.icon }));

let currentShopTab = 'border';
let currentLockerTab = 'border';

async function handleBuyItem(itemId, cost) {
    if (window.sfx) window.sfx.click(); // Sound!
    if (!myUserObj) return;
    const res = await fetch('/shop/buy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUserObj.username, itemId, cost })
    });
    const data = await res.json();
    if (res.ok) {
        if (window.sfx) window.sfx.chime(); // Purchase success sound!
        myUserObj = data.user;
        updateDashboardUI();
        renderShop(); 
        renderLocker(); 
    } else { alert(data.error); }
}

async function handleEquipItem(type, slot, itemId) {
    if (window.sfx) window.sfx.click(); // Sound!
    if (!myUserObj) return;
    const res = await fetch('/shop/equip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUserObj.username, type, slot, itemId })
    });
    const data = await res.json();
    if (res.ok) {
        myUserObj = data.user;
        renderLocker(); 
        updateDashboardUI(); 
    } else { alert(data.error); }
}

window.changeShopTab = function(type) { 
    if (window.sfx) window.sfx.click(); // Sound!
    currentShopTab = type; renderShop(); 
};
window.changeLockerTab = function(type) { 
    if (window.sfx) window.sfx.click(); // Sound!
    currentLockerTab = type; renderLocker(); 
};

function buildSidebar(currentTab, clickFunc) {
    const tabs = [
        { id: 'border', name: 'Borders' }, { id: 'banner', name: 'Banners' }, 
        { id: 'piece', name: 'Pieces' }, { id: 'cardBack', name: 'Card Backs' }, 
        { id: 'emoji', name: 'Emojis' }, { id: 'winAnim', name: 'Win Animations' }
    ];
    let html = `<div class="shop-sidebar">
        <h2 style="font-size: 2rem; margin: 0 0 10px 5px; color: var(--text);">Categories</h2>`;
    tabs.forEach(t => {
        html += `<button class="shop-tab-btn ${currentTab === t.id ? 'active' : ''}" onclick="${clickFunc}('${t.id}')">${t.name}</button>`;
    });
    html += `</div>`;
    return html;
}

function renderShop() {
    const container = document.querySelector('#shop-modal .modal-content');
    if (!container || !myUserObj) return;

    let html = `<div style="display:flex; height: 75vh;">`;
    html += buildSidebar(currentShopTab, 'changeShopTab');
    
    html += `<div class="shop-main-area">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2 style="margin:0; font-size: 2.5rem;">Shop 🛒</h2>
                    <p style="font-weight:900; color: #2ed573; font-size: 1.3rem; margin:0; background: rgba(46, 213, 115, 0.1); padding: 5px 15px; border-radius: 10px;">${myUserObj.bucks} 💵</p>
                </div>`;

    const items = SHOP_CATALOG.filter(i => i.type === currentShopTab && !defaultItemIds.includes(i.id));
    
    if (items.length === 0) {
        html += `<p style="color: #a4b0be; font-style: italic;">Nothing available in this category.</p>`;
    } else {
        items.forEach(item => {
            const isOwned = myUserObj.inventory && myUserObj.inventory.includes(item.id);
            const canAfford = myUserObj.bucks >= item.cost;
            const displayIcon = item.hex ? `<div style="width: 30px; height: 30px; border-radius: 5px; background: ${item.hex}; border: 1px solid #ced6e0;"></div>` : `<div style="width: 30px; height: 30px; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">${item.icon}</div>`;

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 15px 20px; border-radius: 15px; margin-bottom: 12px; transition: transform 0.2s; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${displayIcon}
                        <span style="font-weight: 900; font-size: 1.1rem;">${item.name}</span>
                    </div>
                    ${isOwned 
                        ? `<span style="font-weight:900; color:#a4b0be; background: rgba(0,0,0,0.05); padding: 5px 15px; border-radius: 10px;">Owned</span>` 
                        : `<button style="margin:0; padding: 8px 20px; font-size: 1rem; background: ${canAfford ? 'var(--accent)' : '#ced6e0'}; box-shadow: 0 4px 0 ${canAfford ? '#e19000' : '#a4b0be'};" 
                            ${canAfford ? `onclick="handleBuyItem('${item.id}', ${item.cost})"` : 'disabled'}>
                            ${item.cost} 💵
                           </button>`
                    }
                </div>
            `;
        });
    }

    html += `<button id="closeShopBtn-inner" style="width:100%; margin-top: 20px; background: #ced6e0; color: var(--text); box-shadow: 0 6px 0 #a4b0be;">Close Shop</button>
             </div></div>`;
    
    container.innerHTML = html;
    document.getElementById('closeShopBtn-inner').onclick = () => { 
        if (window.sfx) window.sfx.click(); // Sound!
        document.getElementById('shop-modal').style.display = 'none'; 
    };
}

function renderLocker() {
    const container = document.querySelector('#locker-modal .modal-content');
    if (!container || !myUserObj) return;

    let html = `<div style="display:flex; height: 75vh;">`;
    html += buildSidebar(currentLockerTab, 'changeLockerTab');
    
    html += `<div class="shop-main-area">
                <h2 style="margin:0 0 20px 0; font-size: 2.5rem;">Locker 🎒</h2>`;

    if (currentLockerTab === 'emoji') {
        html += `<p style="font-weight:900; color: var(--secondary);">All owned Emojis are automatically available in the in-game Side Menu!</p>`;
    } else {
        const isPiece = currentLockerTab === 'piece';
        const currentlyEquipped = myUserObj.equipped?.[currentLockerTab] || 'none';
        
        const primaryEq = isPiece ? (myUserObj.equipped?.piece?.primary || 'piece_red') : currentlyEquipped;
        const secondaryEq = isPiece ? (myUserObj.equipped?.piece?.secondary || 'piece_blue') : 'none';

        if (currentLockerTab !== 'piece' && currentLockerTab !== 'cardBack') {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 15px 20px; border-radius: 15px; margin-bottom: 12px;">
                    <span style="font-weight: 900; font-size: 1.1rem;">Default (None)</span>
                    ${primaryEq === 'none' 
                        ? `<span style="font-weight:900; color:var(--secondary);">Equipped</span>`
                        : `<button style="margin:0; padding: 5px 15px; font-size: 1rem; background: var(--secondary);" onclick="handleEquipItem('${currentLockerTab}', 'primary', 'none')">Equip</button>`
                    }
                </div>
            `;
        }

        const ownedItems = SHOP_CATALOG.filter(i => i.type === currentLockerTab && myUserObj.inventory && myUserObj.inventory.includes(i.id));
        
        if (ownedItems.length === 0) {
            html += `<p style="color: #a4b0be; font-style: italic; font-size: 0.9rem;">You don't own any items in this category yet.</p>`;
        } else {
            ownedItems.forEach(item => {
                const isPrimary = primaryEq === item.id;
                const isSecondary = isPiece && secondaryEq === item.id;
                const isEquipped = isPiece ? (isPrimary || isSecondary) : isPrimary;
                
                const displayIcon = item.hex ? `<div style="width: 30px; height: 30px; border-radius: 5px; background: ${item.hex}; border: 1px solid #ced6e0;"></div>` : `<div style="width: 30px; height: 30px; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">${item.icon}</div>`;
                
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 15px 20px; border-radius: 15px; margin-bottom: 12px; ${isEquipped ? `border: 2px solid ${item.hex || 'var(--primary)'};` : ''}">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            ${displayIcon}
                            <span style="font-weight: 900; font-size: 1.1rem;">${item.name}</span>
                        </div>
                `;

                if (isPiece) {
                    html += `<div style="display: flex; gap: 5px;">
                                ${isPrimary ? `<span style="font-weight:900; color:var(--primary); padding: 5px;">Primary</span>` : `<button style="margin:0; padding: 5px 15px; font-size: 0.9rem;" onclick="handleEquipItem('${currentLockerTab}', 'primary', '${item.id}')">Set Pri.</button>`}
                                ${isSecondary ? `<span style="font-weight:900; color:var(--secondary); padding: 5px;">Secondary</span>` : `<button style="margin:0; padding: 5px 15px; font-size: 0.9rem; background: var(--secondary); box-shadow: 0 4px 0 var(--secondary-dark);" onclick="handleEquipItem('${currentLockerTab}', 'secondary', '${item.id}')">Set Sec.</button>`}
                             </div>`;
                } else {
                    html += isPrimary 
                        ? `<span style="font-weight:900; color:${item.hex || 'var(--secondary)'};">Equipped</span>` 
                        : `<button style="margin:0; padding: 5px 15px; font-size: 1rem;" onclick="handleEquipItem('${currentLockerTab}', 'primary', '${item.id}')">Equip</button>`;
                }
                
                html += `</div>`;
            });
        }
    }

    html += `<button id="closeLockerBtn-inner" style="width:100%; margin-top: 20px; background: #ced6e0; color: var(--text); box-shadow: 0 6px 0 #a4b0be;">Close Locker</button>
             </div></div>`;
    
    container.innerHTML = html;
    document.getElementById('closeLockerBtn-inner').onclick = () => {
        if (window.sfx) window.sfx.click(); // Sound!
        document.getElementById('locker-modal').style.display = 'none'; 
    };
}

window.renderShop = renderShop;
window.renderLocker = renderLocker;
window.SHOP_CATALOG = SHOP_CATALOG;