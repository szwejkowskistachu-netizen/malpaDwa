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
    userTotals: {},
    currentUsername: null
};
let gameState = JSON.parse(localStorage.getItem('monkeyGame')) || defaultState;
gameState = { ...defaultState, ...gameState };

let currentRunScore = 0;

function saveState() {
    localStorage.setItem('monkeyGame', JSON.stringify(gameState));
    updateStartScreen();
}

function updateStartScreen() {
    const display = document.getElementById('total-bananas-display');
    if (display) {
        display.innerText = `Suma Bananów: ${gameState.bananas}`;
    }
}

function renderShop() {
    const shopContainer = document.getElementById('shop-screen');
    shopContainer.innerHTML = `
        <h1>Sklep</h1>
        <div id="banana-count">Twoje Banany: ${gameState.bananas}</div>
        <div id="shop-items-container">
            <div class="shop-section">
                <h3>Postacie</h3>
                <div id="skins-list"></div>
            </div>
            <div class="shop-section">
                <h3>Przedmioty</h3>
                <div id="items-list"></div>
            </div>
        </div>
        <button class="back-btn">Wróć</button>
    `;
    
    shopContainer.querySelector('.back-btn').addEventListener('click', () => showScreen('start'));

    const skinsList = document.getElementById('skins-list');
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
    scoresList.innerHTML = '';
    
    const rankingArray = Object.entries(gameState.userTotals || {}).map(([name, total]) => ({
        name,
        total
    }));

    if (rankingArray.length === 0) {
        scoresList.innerHTML = '<p style="color: #f1c40f;">Brak wyników. Zagraj i zapisz wynik, aby pojawić się w rankingu!</p>';
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
    
    if (!name) {
        alert("Proszę wpisać imię!");
        return;
    }
    
    gameState.currentUsername = name;
    
    // Initialize user in ranking if new
    if (!gameState.userTotals[name]) {
        gameState.userTotals[name] = gameState.bananas;
    } 
    // If name entry is happening, bananasEarned was already added to gameState.bananas
    // but userTotals[name] wasn't updated yet because currentUsername was null.
    // So for the FIRST time registration, userTotals[name] = gameState.bananas is correct.
    
    gameState.currentLevel = 1;
    saveState();
    nameInput.value = '';
    showScreen('start');
}

function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');

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

// Initial call
updateStartScreen();
