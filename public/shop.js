// public/shop.js

const shopStyles = document.createElement('style');
shopStyles.innerHTML = `
    #shop-modal .modal-content, #locker-modal .modal-content { width: 800px !important; max-width: 95vw !important; padding: 0 !important; overflow: hidden; }
    .shop-sidebar { width: 25%; background: rgba(0,0,0,0.03); padding: 30px 15px; border-right: 2px solid #dfe6e9; display: flex; flex-direction: column; gap: 8px; }
    .shop-tab-btn { background: transparent; color: var(--text); box-shadow: none; border-radius: 10px; padding: 12px; text-align: left; font-size: 1rem; border: 2px solid transparent; transition: 0.2s; }
    .shop-tab-btn:hover { background: rgba(0,0,0,0.05); transform: none; }
    .shop-tab-btn.active { background: white; border: 2px solid var(--secondary); font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transform: translateX(5px); color: var(--secondary); }
    .shop-main-area { width: 75%; padding: 30px; overflow-y: auto; max-height: 70vh; text-align: left; }
`;
document.head.appendChild(shopStyles);

const catalogColors = { red: '#ff003c', orange: '#ff8800', yellow: '#ffcc00', green: '#00e640', blue: '#0088ff', purple: '#b000ff' };
const defaultItemIds = ['piece_red', 'piece_blue', 'cardBack_red', 'banner_dynamic_lb'];
const SHOP_CATALOG = [];
const variants = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

variants.forEach(color => {
    const capColor = color.charAt(0).toUpperCase() + color.slice(1);
    SHOP_CATALOG.push({ id: `border_${color}`, name: `${capColor} Border`, type: 'border', cost: 20, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `banner_${color}`, name: `${capColor} Banner`, type: 'banner', cost: 50, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `piece_${color}`, name: `${capColor} Pieces`, type: 'piece', cost: 100, hex: catalogColors[color] });
    SHOP_CATALOG.push({ id: `cardBack_${color}`, name: `${capColor} Deck`, type: 'cardBack', cost: 100, hex: catalogColors[color] });
});

// Themed Banners
const bannerCards = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.5'%3E%3Ctext x='10' y='40' font-size='30'%3E♠%3C/text%3E%3Ctext x='60' y='80' font-size='30' fill='red'%3E♥%3C/text%3E%3Ctext x='20' y='90' font-size='30' fill='red'%3E♦%3C/text%3E%3Ctext x='70' y='30' font-size='30'%3E♣%3C/text%3E%3C/svg%3E"), linear-gradient(135deg, rgba(255,71,87,0.8), rgba(255,255,255,0.9), rgba(47,53,66,0.8))`;
const bannerChess = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.3'%3E%3Ctext x='10' y='40' font-size='40'%3E♞%3C/text%3E%3Ctext x='50' y='90' font-size='40'%3E♛%3C/text%3E%3C/svg%3E"), repeating-linear-gradient(45deg, #f1f2f6 0%, #f1f2f6 25px, #dfe6e9 25px, #dfe6e9 50px)`;
const bannerC4 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60' opacity='0.6'%3E%3Ccircle cx='15' cy='15' r='10' fill='%23ff4757'/%3E%3Ccircle cx='45' cy='45' r='10' fill='%23ffcc00'/%3E%3Ccircle cx='15' cy='45' r='10' fill='%23ff4757'/%3E%3Ccircle cx='45' cy='15' r='10' fill='%23ffcc00'/%3E%3C/svg%3E"), linear-gradient(to bottom right, #0984e3, #0652dd)`;

SHOP_CATALOG.push({ id: `banner_cards`, name: `Card Shark Banner`, type: 'banner', cost: 75, hex: bannerCards });
SHOP_CATALOG.push({ id: `banner_chess`, name: `Grandmaster Banner`, type: 'banner', cost: 75, hex: bannerChess });
SHOP_CATALOG.push({ id: `banner_c4`, name: `Connect 4 Banner`, type: 'banner', cost: 75, hex: bannerC4 });

// Special Achievement Banners (cost: null hides them from shop, but puts them in Locker if owned)
SHOP_CATALOG.push({ id: `banner_dynamic_lb`, name: `Live Rank Banner`, type: 'banner', cost: null, icon: '🏆' });
SHOP_CATALOG.push({ id: `banner_gold_champ`, name: `1st Place Champion`, type: 'banner', cost: null, hex: `linear-gradient(45deg, #ffd700, #ffb800, #fff5a0, #ffb800, #ffd700)` });
SHOP_CATALOG.push({ id: `banner_silver_champ`, name: `2nd Place Champion`, type: 'banner', cost: null, hex: `linear-gradient(45deg, #c0c0c0, #e0e0e0, #ffffff, #e0e0e0, #c0c0c0)` });
SHOP_CATALOG.push({ id: `banner_bronze_champ`, name: `3rd Place Champion`, type: 'banner', cost: null, hex: `linear-gradient(45deg, #cd7f32, #b87333, #e6b380, #b87333, #cd7f32)` });
SHOP_CATALOG.push({ id: `banner_top10_vet`, name: `Top 10 Veteran`, type: 'banner', cost: null, hex: `linear-gradient(90deg, #2d3436, #636e72, #2d3436)` });

const emojis = [
    { id: 'emoji_joy', icon: '😂', name: 'Tears of Joy' }, { id: 'emoji_rage', icon: '😡', name: 'Rage' },
    { id: 'emoji_cool', icon: '😎', name: 'Cool' }, { id: 'emoji_cry', icon: '😭', name: 'Crying' },
    { id: 'emoji_mindblown', icon: '🤯', name: 'Mind Blown' }, { id: 'emoji_party', icon: '🥳', name: 'Party' }
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
const typeIcons = { border: '🖼️', banner: '🏷️', piece: '♟️', cardBack: '🃏', emoji: '😀', winAnim: '✨' };

async function handleBuyItem(itemId, cost) {
    if (window.sfx) window.sfx.click(); 
    if (!myUserObj) return;
    const res = await fetch('/shop/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: myUserObj.username, itemId, cost }) });
    const data = await res.json();
    if (res.ok) { if (window.sfx) window.sfx.chime(); myUserObj = data.user; updateDashboardUI(); renderShop(); renderLocker(); } else { alert(data.error); }
}

async function handleEquipItem(type, slot, itemId) {
    if (window.sfx) window.sfx.click(); 
    if (!myUserObj) return;
    const res = await fetch('/shop/equip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: myUserObj.username, type, slot, itemId }) });
    const data = await res.json();
    if (res.ok) { myUserObj = data.user; renderLocker(); updateDashboardUI(); } else { alert(data.error); }
}

window.changeShopTab = function(type) { if (window.sfx) window.sfx.click(); currentShopTab = type; renderShop(); };
window.changeLockerTab = function(type) { if (window.sfx) window.sfx.click(); currentLockerTab = type; renderLocker(); };

function buildSidebar(currentTab, clickFunc) {
    const tabs = [ { id: 'border', name: 'Borders' }, { id: 'banner', name: 'Banners' }, { id: 'piece', name: 'Pieces' }, { id: 'cardBack', name: 'Card Backs' }, { id: 'emoji', name: 'Emojis' }, { id: 'winAnim', name: 'Win Animations' } ];
    let html = `<div class="shop-sidebar"><h2 style="font-size: 2rem; margin: 0 0 10px 5px; color: var(--text);">Categories</h2>`;
    tabs.forEach(t => { html += `<button class="shop-tab-btn ${currentTab === t.id ? 'active' : ''}" onclick="${clickFunc}('${t.id}')">${t.name}</button>`; });
    html += `</div>`; return html;
}

function renderShop() {
    const container = document.querySelector('#shop-modal .modal-content');
    if (!container || !myUserObj) return;
    let html = `<div style="display:flex; height: 75vh;">` + buildSidebar(currentShopTab, 'changeShopTab') + `<div class="shop-main-area"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;"><h2 style="margin:0; font-size: 2.5rem;">Shop 🛒</h2><p style="font-weight:900; color: #2ed573; font-size: 1.3rem; margin:0; background: rgba(46, 213, 115, 0.1); padding: 5px 15px; border-radius: 10px;">${myUserObj.bucks} 💵</p></div>`;
    
    // Only show items that have a cost (hides the special achievement items)
    const items = SHOP_CATALOG.filter(i => i.type === currentShopTab && !defaultItemIds.includes(i.id) && i.cost !== null);
    
    if (items.length === 0) { html += `<p style="color: #a4b0be; font-style: italic;">Nothing available in this category.</p>`; } else {
        items.forEach(item => {
            const isOwned = myUserObj.inventory && myUserObj.inventory.includes(item.id); const canAfford = myUserObj.bucks >= item.cost;
            const displayIcon = item.hex ? `<div style="width: 30px; height: 30px; border-radius: 5px; background: ${item.hex}; background-size: cover; background-position: center; border: 1px solid #ced6e0;"></div>` : `<div style="width: 30px; height: 30px; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">${item.icon || typeIcons[item.type]}</div>`;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 15px 20px; border-radius: 15px; margin-bottom: 12px; transition: transform 0.2s; box-shadow: 0 5px 15px rgba(0,0,0,0.05);"><div style="display: flex; align-items: center; gap: 15px;">${displayIcon}<span style="font-weight: 900; font-size: 1.1rem;">${item.name}</span></div>${isOwned ? `<span style="font-weight:900; color:#a4b0be; background: rgba(0,0,0,0.05); padding: 5px 15px; border-radius: 10px;">Owned</span>` : `<button style="margin:0; padding: 8px 20px; font-size: 1rem; background: ${canAfford ? 'var(--accent)' : '#ced6e0'}; box-shadow: 0 4px 0 ${canAfford ? '#e19000' : '#a4b0be'};" ${canAfford ? `onclick="handleBuyItem('${item.id}', ${item.cost})"` : 'disabled'}>${item.cost} 💵</button>`}</div>`;
        });
    }
    html += `<button id="closeShopBtn-inner" style="width:100%; margin-top: 20px; background: #ced6e0; color: var(--text); box-shadow: 0 6px 0 #a4b0be;">Close Shop</button></div></div>`;
    container.innerHTML = html; document.getElementById('closeShopBtn-inner').onclick = () => { if (window.sfx) window.sfx.click(); document.getElementById('shop-modal').style.display = 'none'; };
}

function renderLocker() {
    const container = document.querySelector('#locker-modal .modal-content');
    if (!container || !myUserObj) return;
    let html = `<div style="display:flex; height: 75vh;">` + buildSidebar(currentLockerTab, 'changeLockerTab') + `<div class="shop-main-area"><h2 style="margin:0 0 20px 0; font-size: 2.5rem;">Locker 🎒</h2>`;
    
    if (currentLockerTab === 'emoji') { html += `<p style="font-weight:900; color: var(--secondary);">All owned Emojis are automatically available in the in-game Side Menu!</p>`; } else {
        const isPiece = currentLockerTab === 'piece'; const currentlyEquipped = myUserObj.equipped?.[currentLockerTab] || 'none';
        const primaryEq = isPiece ? (myUserObj.equipped?.piece?.primary || 'piece_red') : currentlyEquipped; const secondaryEq = isPiece ? (myUserObj.equipped?.piece?.secondary || 'piece_blue') : 'none';
        
        if (currentLockerTab !== 'piece' && currentLockerTab !== 'cardBack') { html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 15px 20px; border-radius: 15px; margin-bottom: 12px;"><span style="font-weight: 900; font-size: 1.1rem;">Default (None)</span>${primaryEq === 'none' ? `<span style="font-weight:900; color:var(--secondary);">Equipped</span>` : `<button style="margin:0; padding: 5px 15px; font-size: 1rem; background: var(--secondary);" onclick="handleEquipItem('${currentLockerTab}', 'primary', 'none')">Equip</button>`}</div>`; }
        
        const ownedItems = SHOP_CATALOG.filter(i => i.type === currentLockerTab && myUserObj.inventory && myUserObj.inventory.includes(i.id));
        
        if (ownedItems.length === 0) { html += `<p style="color: #a4b0be; font-style: italic; font-size: 0.9rem;">You don't own any items in this category yet.</p>`; } else {
            ownedItems.forEach(item => {
                const isPrimary = primaryEq === item.id; const isSecondary = isPiece && secondaryEq === item.id; const isEquipped = isPiece ? (isPrimary || isSecondary) : isPrimary;
                const displayIcon = item.hex ? `<div style="width: 30px; height: 30px; border-radius: 5px; background: ${item.hex}; background-size: cover; background-position: center; border: 1px solid #ced6e0;"></div>` : `<div style="width: 30px; height: 30px; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">${item.icon || typeIcons[item.type]}</div>`;
                
                html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #f1f2f6; padding: 15px 20px; border-radius: 15px; margin-bottom: 12px; ${isEquipped ? `border: 2px solid var(--primary);` : ''}"><div style="display: flex; align-items: center; gap: 15px;">${displayIcon}<span style="font-weight: 900; font-size: 1.1rem;">${item.name}</span></div>`;
                
                // Dynamic Banner Locking Logic
                if (item.id === 'banner_dynamic_lb' && !window.myUserObj.lbPosition) {
                    html += `<span style="font-weight:900; color:#ff4757; background: rgba(255,71,87,0.1); padding: 5px 15px; border-radius: 10px;">🔒 Unranked</span></div>`;
                    return; // Skip drawing equip buttons
                }

                if (isPiece) { html += `<div style="display: flex; gap: 5px;">${isPrimary ? `<span style="font-weight:900; color:var(--primary); padding: 5px;">Primary</span>` : `<button style="margin:0; padding: 5px 15px; font-size: 0.9rem;" onclick="handleEquipItem('${currentLockerTab}', 'primary', '${item.id}')">Set Pri.</button>`}${isSecondary ? `<span style="font-weight:900; color:var(--secondary); padding: 5px;">Secondary</span>` : `<button style="margin:0; padding: 5px 15px; font-size: 0.9rem; background: var(--secondary); box-shadow: 0 4px 0 var(--secondary-dark);" onclick="handleEquipItem('${currentLockerTab}', 'secondary', '${item.id}')">Set Sec.</button>`}</div>`; } 
                else { html += isPrimary ? `<span style="font-weight:900; color:var(--secondary);">Equipped</span>` : `<button style="margin:0; padding: 5px 15px; font-size: 1rem;" onclick="handleEquipItem('${currentLockerTab}', 'primary', '${item.id}')">Equip</button>`; }
                html += `</div>`;
            });
        }
    }
    html += `<button id="closeLockerBtn-inner" style="width:100%; margin-top: 20px; background: #ced6e0; color: var(--text); box-shadow: 0 6px 0 #a4b0be;">Close Locker</button></div></div>`;
    container.innerHTML = html; document.getElementById('closeLockerBtn-inner').onclick = () => { if (window.sfx) window.sfx.click(); document.getElementById('locker-modal').style.display = 'none'; };
}

window.renderShop = renderShop; window.renderLocker = renderLocker; window.SHOP_CATALOG = SHOP_CATALOG;