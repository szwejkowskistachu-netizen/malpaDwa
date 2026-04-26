export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.level = data.level || 1;
        this.isMobile = !this.sys.game.device.os.desktop;
    }

    preload() {
        let graphics = this.make.graphics({ x: 0, y: 0, add: false });

        graphics.fillStyle(0x8B4513, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillRect(8, 28, 16, 20);
        graphics.generateTexture('player_default', 32, 48);

        graphics.clear();
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillCircle(16, 16, 12); 
        graphics.fillRect(8, 28, 16, 20); 
        graphics.fillStyle(0x00FF00, 1);
        graphics.fillRect(6, 4, 20, 6);
        graphics.fillRect(20, 8, 10, 2);
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(8, 14, 16, 4);
        graphics.generateTexture('player_desek', 32, 48);

        let suffix = this.level === 2 ? '_jungle' : (this.level === 3 ? '_lava' : '_normal');
        let platformColor = 0xA0522D;
        let groundColor = 0x5D4037;
        
        if (this.level === 2) {
            platformColor = 0x228B22;
            groundColor = 0x004400;
        } else if (this.level === 3) {
            platformColor = 0x444444;
            groundColor = 0xFF4500;
        }

        graphics.clear();
        graphics.fillStyle(platformColor, 1);
        graphics.fillRect(0, 0, 200, 32);
        graphics.fillStyle(0xD2691E, 1);
        graphics.fillRect(0, 0, 200, 8);
        graphics.generateTexture('platform' + suffix, 200, 32);

        graphics.clear();
        graphics.fillStyle(groundColor, 1);
        graphics.fillRect(0, 0, 800, 32);
        graphics.generateTexture('ground' + suffix, 800, 32);

        graphics.clear();
        graphics.fillStyle(0xFFEB3B, 1);
        graphics.fillEllipse(10, 10, 20, 10);
        graphics.generateTexture('banana', 20, 20);

        graphics.clear();
        graphics.fillStyle(0x2196F3, 1);
        graphics.fillRect(0, 0, 20, 30);
        graphics.fillStyle(0xFF9800, 1);
        graphics.fillRect(5, 20, 10, 10);
        graphics.generateTexture('jetpack', 20, 30);
        
        graphics.clear();
        graphics.fillStyle(0x4CAF50, 1);
        graphics.fillRoundedRect(0, 0, 40, 20, 5);
        graphics.fillStyle(0xF44336, 1);
        graphics.fillRect(35, 5, 5, 10);
        graphics.generateTexture('snake', 40, 20);

        graphics.clear();
        graphics.fillStyle(0x795548, 1);
        graphics.fillRect(5, 0, 10, 100);
        graphics.generateTexture('vine', 20, 100);
    }

    create() {
        this.lives = 4;
        this.collectedBananas = 0;
        this.isGameOver = false;

        const state = JSON.parse(localStorage.getItem('monkeyGame')) || {};
        const currentSkin = state.currentSkin || 'default';

        if (this.level === 2) {
            this.cameras.main.setBackgroundColor('#1a2f1a');
        } else if (this.level === 3) {
            this.cameras.main.setBackgroundColor('#2f1a1a');
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        this.generateMap();
        
        this.normalScale = 0.7;
        this.crouchScale = 0.35;
        
        this.player = this.physics.add.sprite(100, 450, 'player_' + currentSkin).setScale(this.normalScale);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(32, 48);
        this.physics.add.collider(this.player, this.platforms);
        
        if (this.level === 3) {
            this.physics.add.overlap(this.player, this.ground, this.touchLava, null, this);
        }

        this.player.setGravityY(200);

        this.snakes = this.physics.add.group();
        this.physics.add.collider(this.snakes, this.platforms);
        
        if (this.level !== 3) {
            const numSnakes = 1 + Math.floor(this.level / 2);
            for (let i = 0; i < numSnakes; i++) {
                const snake = this.snakes.create(Phaser.Math.Between(200, 700), Phaser.Math.Between(100, 500), 'snake');
                snake.setCollideWorldBounds(true);
                snake.setGravityY(0); 
                this.physics.add.overlap(this.player, snake, this.touchSnake, null, this);
                const speed = 100 + (this.level * 10);
                snake.setVelocity(Phaser.Math.Between(-speed, speed), Phaser.Math.Between(-speed, speed));
                snake.setBounce(1);
            }
        }

        this.bananas = this.physics.add.group();
        const numBananas = Phaser.Math.Between(20, 40);
        for (let i = 0; i < numBananas; i++) {
            const platform = this.platformArray[Phaser.Math.Between(0, this.platformArray.length - 1)];
            const x = platform.x + Phaser.Math.Between(-80, 80);
            const y = platform.y - 64;
            const banana = this.bananas.create(x, y, 'banana');
            this.tweens.add({ targets: banana, y: y + 10, duration: 1000 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        this.physics.add.collider(this.bananas, this.platforms);
        this.physics.add.overlap(this.player, this.bananas, this.collectBanana, null, this);

        this.isFlying = false;
        if (state.ownedItems && state.ownedItems.includes('jetpack')) {
            this.activateJetpack(25);
        }

        this.isClimbing = false;
        this.physics.add.overlap(this.player, this.vines, () => { this.isClimbing = true; }, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.setupMobileControls();

        this.scoreText = this.add.text(16, 16, 'Banany: 0', { fontSize: '32px', fill: '#fff' });
        this.livesText = this.add.text(16, 50, 'Życia: 4', { fontSize: '32px', fill: '#fff' });
        this.levelText = this.add.text(16, 84, 'Poziom ' + this.level, { fontSize: '32px', fill: '#0f0' });
        this.timerText = this.add.text(16, 118, '', { fontSize: '24px', fill: '#ff0' });

        this.isActuallyCrouching = false;
    }

    setupMobileControls() {
        this.mobileState = { left: false, right: false, up: false, crouch: false };
        this.lastTap = 0;

        if (!this.isMobile) return;

        const updateStateFromPointer = (pointer) => {
            const screenWidth = this.cameras.main.width;
            this.mobileState.left = false;
            this.mobileState.right = false;
            if (pointer.isDown) {
                if (pointer.x < screenWidth * 0.33) this.mobileState.left = true;
                else if (pointer.x > screenWidth * 0.66) this.mobileState.right = true;
            }
        };

        this.input.on('pointerdown', (pointer) => {
            const now = this.time.now;
            if (now - this.lastTap < 300) {
                this.mobileState.crouch = !this.mobileState.crouch;
            } else {
                if (pointer.y < this.cameras.main.height * 0.6) this.mobileState.up = true;
            }
            this.lastTap = now;
            updateStateFromPointer(pointer);
        });

        this.input.on('pointermove', (pointer) => updateStateFromPointer(pointer));
        this.input.on('pointerup', () => {
            this.mobileState.left = false;
            this.mobileState.right = false;
            this.mobileState.up = false;
        });
    }

    generateMap() {
        this.platforms = this.physics.add.staticGroup();
        this.vines = this.physics.add.staticGroup();
        this.platformArray = [];
        let suffix = this.level === 2 ? '_jungle' : (this.level === 3 ? '_lava' : '_normal');
        this.ground = this.platforms.create(400, 568, 'ground' + suffix).setScale(2).refreshBody();
        if (this.level !== 3) {
            this.platformArray.push(this.ground);
        } else {
            this.platformArray.push(this.platforms.create(100, 500, 'platform' + suffix).refreshBody());
        }
        let lastY = 568;
        const numPlatforms = this.level === 3 ? 10 : Math.max(4, 7 - Math.floor(this.level / 3));
        for (let i = 0; i < numPlatforms; i++) {
            let x = Phaser.Math.Between(100, 700);
            let y = Phaser.Math.Between(100, 480);
            while (Math.abs(y - lastY) < 120) y = Phaser.Math.Between(100, 480);
            lastY = y;
            this.platformArray.push(this.platforms.create(x, y, 'platform' + suffix));
            if (Math.random() > 0.3) this.vines.create(x, y + 50, 'vine').setScale(0.5).refreshBody();
        }
    }

    update() {
        if (this.isGameOver) return;

        this.isClimbing = false;
        this.physics.overlap(this.player, this.vines, () => { this.isClimbing = true; });

        const shouldCrouch = (this.shiftKey.isDown || this.mobileState.crouch) && !this.isFlying && !this.isClimbing;
        
        if (shouldCrouch && !this.isActuallyCrouching) {
            // Start Crouching
            this.player.setScale(this.normalScale, this.crouchScale);
            this.player.body.setSize(32, 24);
            this.player.body.setOffset(0, 24);
            this.isActuallyCrouching = true;
        } else if (!shouldCrouch && this.isActuallyCrouching) {
            // Stop Crouching - IMPORTANT: move up to avoid floor collision glitch
            this.player.y -= 16; 
            this.player.setScale(this.normalScale);
            this.player.body.setSize(32, 48);
            this.player.body.setOffset(0, 0);
            this.isActuallyCrouching = false;
        }

        const moveUp = this.cursors.up.isDown || this.mobileState.up;
        const moveDown = this.cursors.down.isDown;
        const moveLeft = this.cursors.left.isDown || this.mobileState.left;
        const moveRight = this.cursors.right.isDown || this.mobileState.right;

        if (this.isFlying) {
            this.player.setGravityY(0);
            if (moveUp) this.player.setVelocityY(-200);
            else if (moveDown) this.player.setVelocityY(200);
            else this.player.setVelocityY(0);
        } else if (this.isClimbing) {
            this.player.setGravityY(0);
            this.player.setVelocityY(0);
            if (moveUp) this.player.setVelocityY(-160);
            else if (moveDown) this.player.setVelocityY(160);
        } else {
            this.player.setGravityY(200);
        }

        if (moveLeft) this.player.setVelocityX(-160);
        else if (moveRight) this.player.setVelocityX(160);
        else this.player.setVelocityX(0);

        if (!this.isFlying && !this.isClimbing && moveUp && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
        }

        this.snakes.children.iterate(snake => {
            if (this.physics.overlap(snake, this.vines)) {
                if (Math.random() > 0.5) snake.setVelocityY(-50);
                else snake.setVelocityY(50);
            }
        });
    }

    activateJetpack(duration) {
        this.isFlying = true;
        this.player.setGravityY(0);
        this.player.setTint(0x2196F3);
        let timeLeft = duration;
        if (this.flyTimer) this.flyTimer.remove();
        this.flyTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                timeLeft--;
                if (timeLeft <= 0) {
                    this.isFlying = false;
                    this.player.setGravityY(200);
                    this.player.clearTint();
                    this.timerText.setText('');
                } else this.timerText.setText('Jetpack: ' + timeLeft + 's');
            },
            repeat: duration
        });
    }

    touchLava(player, lava) {
        this.lives -= 1;
        this.livesText.setText('Życia: ' + this.lives);
        this.player.setPosition(100, 400); 
        this.player.setVelocity(0, 0);
        this.tweens.add({ targets: this.player, alpha: 0.5, duration: 100, yoyo: true, repeat: 3 });
        if (this.lives <= 0) this.gameOver(false);
    }

    touchSnake(player, snake) {
        this.lives -= 1;
        this.livesText.setText('Życia: ' + this.lives);
        this.player.setPosition(100, 450);
        this.tweens.add({ targets: this.player, alpha: 0.5, duration: 100, yoyo: true, repeat: 3 });
        if (this.lives <= 0) this.gameOver(false);
    }

    collectBanana(player, banana) {
        this.tweens.add({
            targets: banana, scaleX: 0, scaleY: 0, duration: 200,
            onComplete: () => {
                banana.disableBody(true, true);
                if (this.bananas.countActive(true) === 0) this.gameOver(true);
            }
        });
        this.collectedBananas += 1;
        this.scoreText.setText('Banany: ' + this.collectedBananas);
    }

    gameOver(isWin) {
        this.isGameOver = true;
        this.physics.pause();
        const center = this.cameras.main.centerX;
        const middle = this.cameras.main.centerY;
        if (isWin) {
            if (this.level === 3) {
                this.add.text(center, middle - 100, 'UKOŃCZYŁEŚ GRĘ', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5);
                this.add.text(center, middle - 30, 'GRATULACJE!', { fontSize: '48px', fill: '#f1c40f' }).setOrigin(0.5);
                const finishBtn = this.add.text(center, middle + 80, 'KONIEC', { 
                    fontSize: '32px', fill: '#fff', backgroundColor: '#e74c3c', padding: { x: 20, y: 10 } 
                }).setOrigin(0.5).setInteractive();
                finishBtn.on('pointerdown', () => window.endGame(this.collectedBananas, 'exit'));
            } else {
                this.add.text(center, middle - 100, 'WYGRAŁEŚ!', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5);
                const nextBtn = this.add.text(center, middle, 'POZIOM ' + (this.level + 1), { 
                    fontSize: '32px', fill: '#fff', backgroundColor: '#2ecc71', padding: { x: 20, y: 10 } 
                }).setOrigin(0.5).setInteractive();
                const exitBtn = this.add.text(center, middle + 80, 'WYJDŹ', { 
                    fontSize: '32px', fill: '#fff', backgroundColor: '#e74c3c', padding: { x: 20, y: 10 } 
                }).setOrigin(0.5).setInteractive();
                nextBtn.on('pointerdown', () => window.endGame(this.collectedBananas, 'next_level'));
                exitBtn.on('pointerdown', () => window.endGame(this.collectedBananas, 'exit'));
            }
        } else {
            this.add.text(center, middle, 'PRZEGRAŁEŚ', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5);
            setTimeout(() => window.endGame(this.collectedBananas, 'exit'), 2000);
        }
    }
}
