import { config, items, skins } from './config.js';

// Screen management
const screens = {
    start: document.getElementById('start-screen'),
    shop: document.getElementById('shop-screen'),
    game: document.getElementById('game-screen'),
    ranking: document.getElementById('ranking-screen'),
    nameEntry: document.getElementById('name-entry-screen')
};

// State management
const defaultState = {
    bananas: 100,
    ownedItems: [],
    ownedSkins: ['default'],
    currentSkin: 'default',
    winsCount: 0,
    currentLevel: 1,
    userTotals: {
        'MałpiKról': 15000,
        'BananowyJoe': 12500,
        'DżunglowyMistrz': 8900,
        'SzybkiSzympans': 5400,
        'Zbieracz2000': 3200
    },
    currentUsername: null
};
let gameState = JSON.parse(localStorage.getItem('monkeyGame')) || defaultState;

// Merge with default state to ensure all fields exist
gameState = { ...defaultState, ...gameState };

// Explicitly merge userTotals to ensure mock bots are included if not present
gameState.userTotals = { ...defaultState.userTotals, ...gameState.userTotals };

let currentRunScore = 0;

function saveState() {
    localStorage.setItem('monkeyGame', JSON.stringify(gameState));
    updateStartScreen();
}

function updateStartScreen() {
    const display = document.getElementById('total-bananas-display');
    if (display) {
        display.innerText = `Twoje Banany: ${gameState.bananas}`;
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
    
    const rankingArray = Object.entries(gameState.userTotals || {}).map(([name, total]) => ({
        name,
        total
    }));

    if (rankingArray.length === 0) {
        scoresList.innerHTML = '<p style="color: #f1c40f;">Brak wyników. Zagraj i zapisz wynik!</p>';
    } else {
        const sorted = rankingArray.sort((a, b) => b.total - a.total).slice(0, 10);
        sorted.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'skin-item';
            div.style.width = '450px';
            div.style.color = 'white';
            div.innerHTML = `<span>#${index + 1} ${entry.name}</span> <span style="color: #f1c40f;">Suma: ${entry.total} 🍌</span>`;
            scoresList.appendChild(div);
        });
    }
}

window.buySkin = (skinId) => {
    const skin = skins.find(s => s.id === skinId);
    if (skin && gameState.bananas >= skin.price) {
        gameState.bananas -= skin.price;
        if (!gameState.ownedSkins.includes(skinId)) {
            gameState.ownedSkins.push(skinId);
        }
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
        if (!gameState.ownedItems.includes(itemId)) {
            gameState.ownedItems.push(itemId);
        }
        saveState();
        renderShop();
    }
};

window.endGame = (bananasEarned, nextAction) => {
    currentRunScore = bananasEarned;
    gameState.bananas += bananasEarned;
    
    if (gameState.currentUsername) {
        gameState.userTotals[gameState.currentUsername] += bananasEarned;
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
    if (!name) { alert("Proszę wpisać imię!"); return; }
    
    gameState.currentUsername = name;
    if (!gameState.userTotals[name]) {
        gameState.userTotals[name] = gameState.bananas;
    } 
    
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
