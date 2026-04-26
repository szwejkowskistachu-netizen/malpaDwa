import { config, items, skins } from './config.js';

// --- GOOGLE APPS SCRIPT URL ---
const DATABASE_URL = 'https://script.google.com/macros/s/AKfycbyBBi6thMErXrz6_W8s3PfNR7JPFIggo5wfC-TMUI4njAyja6PEkaZPWVVBkZrgx_dIxw/exec'; 

const screens = {
    start: document.getElementById('start-screen'),
    shop: document.getElementById('shop-screen'),
    game: document.getElementById('game-screen'),
    ranking: document.getElementById('ranking-screen'),
    nameEntry: document.getElementById('name-entry-screen')
};

// Clean default state
const defaultState = {
    bananas: 100,
    ownedItems: [],
    ownedSkins: ['default'],
    currentSkin: 'default',
    winsCount: 0,
    currentLevel: 1,
    userTotals: {},
    currentUsername: localStorage.getItem('monkeyGame_user_v2') || null
};

// Use a new versioned key to force a clean start and remove any saved bots
const STORAGE_KEY = 'monkeyGame_v2';
let gameState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState;
gameState = { ...defaultState, ...gameState };

let currentRunScore = 0;

const botNames = ['MałpiKról', 'BananowyJoe', 'DżunglowyMistrz', 'SzybkiSzympans', 'Zbieracz2000'];

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    if (gameState.currentUsername) {
        localStorage.setItem('monkeyGame_user_v2', gameState.currentUsername);
    }
    updateStartScreen();
}

function updateStartScreen() {
    const display = document.getElementById('total-bananas-display');
    if (display) display.innerText = `Twoje Banany: ${gameState.bananas}`;
    const playerCount = document.getElementById('player-count-display');
    if (playerCount) {
        const totalPlayers = Object.keys(gameState.userTotals).length;
        playerCount.innerText = `Liczba Graczy: ${totalPlayers}`;
    }
}

async function fetchGlobalRanking() {
    if (!DATABASE_URL) return;
    try {
        const response = await fetch(DATABASE_URL);
        const data = await response.json();
        data.forEach(entry => {
            const name = entry[0];
            const total = parseInt(entry[1]);
            // Ignore any names that match the bots list
            if (name && !isNaN(total) && !botNames.includes(name)) {
                if (!gameState.userTotals[name] || total > gameState.userTotals[name]) {
                    gameState.userTotals[name] = total;
                }
            }
        });
        renderRanking();
    } catch (e) {
        console.error("Database fetch error:", e);
    }
}

async function saveToGlobalDatabase(name, total) {
    if (!DATABASE_URL || botNames.includes(name)) return;
    try {
        await fetch(DATABASE_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name: name, bananas: total })
        });
    } catch (e) {
        console.error("Database save error:", e);
    }
}

function renderShop() {
    const shopContainer = document.getElementById('shop-screen');
    const bananaDisplay = shopContainer.querySelector('#banana-count');
    if (bananaDisplay) bananaDisplay.innerText = `Twoje Banany: ${gameState.bananas}`;

    const skinsList = document.getElementById('skins-list');
    skinsList.innerHTML = '';
    skins.forEach(skin => {
        const isOwned = gameState.ownedSkins.includes(skin.id);
        const isEquipped = gameState.currentSkin === skin.id;
        const skinEl = document.createElement('div');
        skinEl.className = 'skin-item';
        skinEl.innerHTML = `
            <span>${skin.name}</span>
            ${isEquipped ? '<span>(Wybrana)</span>' : 
              isOwned ? `<button onclick="equipSkin('${skin.id}')">WYBIERZ</button>` : 
              gameState.bananas >= skin.price ? `<button onclick="buySkin('${skin.id}')">KUP (${skin.price})</button>` : 
              `<span>Koszt: ${skin.price}</span>`}
        `;
        skinsList.appendChild(skinEl);
    });

    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';
    items.forEach(item => {
        const isOwned = gameState.ownedItems.includes(item.id);
        const itemEl = document.createElement('div');
        itemEl.className = 'skin-item';
        itemEl.innerHTML = `
            <span>${item.name}</span>
            ${isOwned ? '<span>(Posiadany)</span>' : 
              gameState.bananas >= item.price ? `<button onclick="buyItem('${item.id}')">KUP (${item.price})</button>` : 
              `<span>Koszt: ${item.price}</span>`}
        `;
        itemsList.appendChild(itemEl);
    });
}

function renderRanking() {
    const scoresList = document.getElementById('scores-list');
    if (!scoresList) return;
    scoresList.innerHTML = '';
    
    // Filter out bots again just to be absolutely sure
    const rankingArray = Object.entries(gameState.userTotals)
        .filter(([name]) => !botNames.includes(name))
        .map(([name, total]) => ({ name, total }));

    const sorted = rankingArray.sort((a, b) => b.total - a.total).slice(0, 10);
    
    if (sorted.length === 0) {
        scoresList.innerHTML = '<p style="color: #f1c40f;">Ranking jest pusty. Bądź pierwszy!</p>';
        return;
    }

    sorted.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'skin-item';
        div.style.width = '450px';
        div.style.color = 'white';
        div.innerHTML = `<span>#${index + 1} ${entry.name}</span> <span style="color: #f1c40f;">${entry.total} 🍌</span>`;
        scoresList.appendChild(div);
    });
}

window.buySkin = (skinId) => {
    const skin = skins.find(s => s.id === skinId);
    if (skin && gameState.bananas >= skin.price) {
        gameState.bananas -= skin.price;
        if (!gameState.ownedSkins.includes(skinId)) gameState.ownedSkins.push(skinId);
        saveState();
        renderShop();
    }
};

window.equipSkin = (skinId) => {
    gameState.currentSkin = skinId;
    saveState();
    renderShop();
};

window.buyItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (item && gameState.bananas >= item.price) {
        gameState.bananas -= item.price;
        if (!gameState.ownedItems.includes(itemId)) gameState.ownedItems.push(itemId);
        saveState();
        renderShop();
    }
};

window.endGame = (bananasEarned, nextAction) => {
    currentRunScore = bananasEarned;
    gameState.bananas += bananasEarned;
    
    if (gameState.currentUsername) {
        gameState.userTotals[gameState.currentUsername] += bananasEarned;
        saveToGlobalDatabase(gameState.currentUsername, gameState.userTotals[gameState.currentUsername]);
    }

    if (window.game) {
        window.game.destroy(true);
        window.game = null;
    }

    if (nextAction === 'next_level') {
        gameState.currentLevel++;
        saveState();
        showScreen('game');
    } else {
        if (gameState.currentUsername) {
            gameState.currentLevel = 1;
            saveState();
            showScreen('start');
        } else {
            document.getElementById('final-score-display').innerText = `Zebrałeś ${bananasEarned} bananów!`;
            showScreen('nameEntry');
        }
    }
};

function submitScore() {
    const nameInput = document.getElementById('username-input');
    const name = nameInput.value.trim();
    if (!name) return;
    
    gameState.currentUsername = name;
    if (!gameState.userTotals[name]) {
        gameState.userTotals[name] = gameState.bananas;
    } 
    
    saveToGlobalDatabase(name, gameState.userTotals[name]);
    gameState.currentLevel = 1;
    saveState();
    nameInput.value = '';
    showScreen('start');
}

function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    const target = screens[screenId];
    if (target) target.classList.remove('hidden');

    if (screenId === 'start') {
        updateStartScreen();
    } else if (screenId === 'shop') {
        renderShop();
    } else if (screenId === 'ranking') {
        fetchGlobalRanking();
        renderRanking();
    } else if (screenId === 'game') {
        if (!window.game) {
            const gameConfig = { ...config };
            gameConfig.callbacks = {
                postBoot: (game) => {
                    game.scene.start('GameScene', { level: gameState.currentLevel });
                }
            };
            window.game = new Phaser.Game(gameConfig);
        }
    }
}

// Event listeners
document.getElementById('play-btn').addEventListener('click', () => {
    gameState.currentLevel = 1;
    saveState();
    showScreen('game');
});
document.getElementById('shop-btn').addEventListener('click', () => {
    showScreen('shop');
});
document.getElementById('ranking-btn').addEventListener('click', () => {
    showScreen('ranking');
});
document.getElementById('submit-score-btn').addEventListener('click', submitScore);
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        showScreen('start');
    });
});

updateStartScreen();
