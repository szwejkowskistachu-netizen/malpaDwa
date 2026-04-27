import { GameScene } from './game.js';

export const config = {
    type: Phaser.CANVAS,
    width: 800,
    height: 600,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 },
            debug: false
        }
    },
    scene: [GameScene]
};

export const items = [
    { id: 'jetpack', name: 'Plecak Odrzutowy', price: 2500 }
];

export const skins = [
    { id: 'default', name: 'Zwykła Małpa', price: 0 },
    { id: 'desek', name: 'Małpa DESEK', price: 5000 },
    { id: 'ballerina', name: 'Małpa BALLERINA', price: 7000 },
    { id: 'nauk', name: 'Małpa NAUK', price: 9000 }
];
