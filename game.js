class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    this.load.image('startBackground', 'https://i.imgur.com/y2yUNvZ.png');
    this.load.image('instructionsImage', 'https://i.imgur.com/J78rQWk.png'); // Load the instructions image
    this.load.audio('backgroundMusic', 'https://raw.githubusercontent.com/BahaaMurad/music/main/background-music.mp3');
  }

  create(data) {
    if (!this.sys.game.backgroundMusic) {
      this.sys.game.backgroundMusic = this.sound.add('backgroundMusic', { loop: true });
    }

    this.backgroundMusic = this.sys.game.backgroundMusic;

    const musicToggle = this.add.text(450, 16, '🔊', { fontSize: '32px', fill: '#fff' })
      .setInteractive()
      .setOrigin(0.5)
      .setDepth(10)
      .on('pointerdown', () => {
        if (this.backgroundMusic.isPlaying) {
          this.backgroundMusic.pause();
          musicToggle.setText('🔇');
        } else {
          this.backgroundMusic.resume();
          musicToggle.setText('🔊');
        }
      });

    this.add.image(240, 400, 'startBackground').setScale(0.5);

    const startButton = this.add.text(240, 350, 'Начать игру', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#cf3517',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold',
    })
      .setInteractive()
      .setOrigin(0.5)
      .setName('startButton');

    startButton.on('pointerdown', async () => {
      const playerName = document.getElementById('playerName').value.trim();
      const playerPhone = document.getElementById('playerPhone').value.trim();

      if (!playerName || !playerPhone) {
        alert('Пожалуйста, введите ваше имя и номер телефона!');
        return;
      }

      try {
        const playerData = await window.getOrCreatePlayer(playerName, playerPhone);
        this.backgroundMusic.play();
        this.scene.start('GameScene', { playerData });
      } catch (error) {
        console.error('Error starting game:', error);
        alert('Произошла ошибка при запуске игры. Попробуйте снова.');
      }
    });

    const instructionsButton = this.add.text(240, 420, 'Инструкция', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#17cf35',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold',
    })
      .setInteractive()
      .setOrigin(0.5)
      .setName('instructionsButton');

      instructionsButton.on('pointerdown', () => {
        const playerName = document.getElementById('playerName').value.trim();
        const playerPhone = document.getElementById('playerPhone').value.trim();
  
        if (!playerName || !playerPhone) {
          
          return;
        }
  
        this.showInstructions();
      });
    }

  showInstructions() {
    // Hide the main menu buttons
    this.children.getByName('startButton').setVisible(false);
    this.children.getByName('instructionsButton').setVisible(false);

    // Display the instructions image
    const instructionsImage = this.add.image(0, 0, 'instructionsImage')
      .setOrigin(0)
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    // Add Back to Start button
    const backButton = this.add.text(240, 770, 'Назад в главное меню', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#cf3517',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold',
    })
      .setInteractive()
      .setOrigin(0.5);

    backButton.on('pointerdown', () => {
      instructionsImage.destroy(); // Destroy the instructions image
      backButton.destroy(); // Destroy the back button

      // Show the main menu buttons again
      this.children.getByName('startButton').setVisible(true);
      this.children.getByName('instructionsButton').setVisible(true);
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('player', 'https://i.imgur.com/q7ZEJHs.png');
    this.load.image('dangerObstacle', 'https://i.imgur.com/t9U0UAN.png');
    this.load.image('bonusObstacle', 'https://i.imgur.com/5HHXX0s.png');
    this.load.image('shieldPowerUp', 'https://i.imgur.com/E4OrBOX.png'); // Shield power-up image
    this.load.image('background', 'https://i.imgur.com/R06cLdY.png');
    this.load.image('explosion', 'https://i.imgur.com/O6KYKe2.png'); // Explosion image
  }

  create(data) {
    this.playerData = data.playerData;

    const playerNameText = this.add.text(240, 16, `Игрок: ${this.playerData.name}`, {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const playerPhoneText = this.add.text(240, 60, `Телефон: ${this.playerData.phone}`, {
      fontSize: '20px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.background = this.add.tileSprite(0, 0, 480, 800, 'background');
    this.background.setOrigin(0, 0);

    this.player = this.physics.add.sprite(240, 700, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.3);

    this.score = 0;
    this.hasShield = false; // Track shield state
    this.shieldTimer = null; // Timer for shield duration
    this.scoreText = this.add.text(16, 16, 'Очки: 0', {
      fontSize: '32px',
      fill: '#fff',
      fontWeight: 'bold',
      fontFamily: 'Arial',
      padding: { x: 10, y: 5 },
      backgroundColor: '#425234',
    });

    this.endText = this.add.text(240, 300, 'Игра окончена!', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
      backgroundColor: '#425234',
    })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(10);

    this.restartButton = this.add.text(240, 400, 'ПЕРЕИГРАТЬ', {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold',
      backgroundColor: '#425234',
      padding: { x: 10, y: 5 },
    })
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false)
      .setDepth(10);

    this.restartButton.on('pointerdown', this.restartGame, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointermove', this.pointerMove, this);

    this.obstacles = this.physics.add.group();
    this.powerUps = this.physics.add.group(); // Group for power-ups

    this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 40000, // Spawn shield power-up every 40 seconds
      callback: this.spawnShieldPowerUp,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleCollision, null, this);
    this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);

    // Create shield timer text
    this.shieldTimerText = this.add.text(240, 100, '', {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);
  }

  update() {
    if (this.gameOver) return;

    this.background.tilePositionY -= 1;

    this.player.setVelocity(0);
    if (this.cursors.left.isDown) this.player.setVelocityX(-300);
    if (this.cursors.right.isDown) this.player.setVelocityX(300);

    this.score += 0.01;
    this.scoreText.setText('Очки: ' + Math.floor(this.score));

    // Update shield timer if shield is active
    if (this.hasShield) {
      const timeLeft = Math.ceil((this.shieldTimer.getRemaining() / 1000)); // Get remaining time in seconds
      this.shieldTimerText.setText(`Щит: ${timeLeft}s`);
    }
  }

  spawnObstacle() {
    if (this.gameOver) return;

    const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'dangerObstacle' : 'bonusObstacle';
    const xPosition = Phaser.Math.Between(50, 430);

    const obstacle = this.obstacles.create(xPosition, 0, obstacleType).setScale(0.2);

    if (obstacleType === 'dangerObstacle') {
      let velocity = 200;
      if (this.score >= 100) velocity = 250;
      if (this.score >= 200) velocity = 400;
      if (this.score >= 300) velocity = 450;
      if (this.score >= 500) velocity = 500;
      obstacle.setVelocityY(velocity);
      obstacle.isDanger = true;
    } else {
      obstacle.setVelocityY(200);
      obstacle.isDanger = false;
    }
  }

  spawnShieldPowerUp() {
    const xPosition = Phaser.Math.Between(50, 430);
    const shield = this.powerUps.create(xPosition, 0, 'shieldPowerUp').setScale(0.2);
    shield.setVelocityY(150);
  }

  collectPowerUp(player, powerUp) {
    if (powerUp.texture.key === 'shieldPowerUp') {
      this.activateShield();
      powerUp.destroy();
    }
  }

  activateShield() {
    this.hasShield = true;

    // Show the shield timer
    this.shieldTimerText.setVisible(true);

    // Optional: Visual feedback for shield activation (e.g., player glow)
    this.player.setTint(0x00ff00);

    if (this.shieldTimer) {
      this.time.removeEvent(this.shieldTimer);
    }

    // Set a timer for the shield
    this.shieldTimer = this.time.addEvent({
      delay: 10000, // 10 seconds
      callback: () => {
        this.hasShield = false;
        this.player.clearTint(); // Remove visual feedback
        this.shieldTimerText.setVisible(false); // Hide the timer when shield expires
      },
      callbackScope: this,
    });
  }

  async handleObstacleCollision(player, obstacle) {
    if (obstacle.isDanger) {
      if (this.hasShield) {
        // Ignore collision while shield is active
        obstacle.destroy();
        return;
      }

      if (this.explosion) {
        this.explosion.destroy();
      }

      this.explosion = this.add.image(obstacle.x, obstacle.y, 'explosion').setScale(0.2);

      this.physics.pause();
      player.setTint(0xff0000);
      this.gameOver = true;

      const finalScore = Math.floor(this.score);
      this.endText.setText(`Игра окончена!\nИгрок: ${this.playerData.name}\nОчки: ${finalScore}`).setVisible(true);
      this.restartButton.setVisible(true);

      if (this.playerData && this.playerData.id) {
        try {
          await window.updateHighScore(this.playerData.id, finalScore);
          console.log('High score updated successfully!');
        } catch (error) {
          console.error('Error updating high score:', error);
        }
      }
    } else {
      this.score += 5;
      this.scoreText.setText('Очки: ' + Math.floor(this.score));
    }
    obstacle.destroy();
  }

  restartGame() {
    this.endText.setVisible(false);
    this.restartButton.setVisible(false);
    this.score = 0;
    this.gameOver = false;
    this.hasShield = false;
    this.player.clearTint();
    this.player.setPosition(240, 700);
    this.obstacles.clear(true, true);
    this.powerUps.clear(true, true);

    if (this.explosion) {
      this.explosion.destroy();
      this.explosion = null;
    }

    this.physics.resume();
  }

  pointerMove(pointer) {
    if (this.gameOver) return;
    this.player.setVelocityX(pointer.x < this.player.x ? -300 : 300);
  }
}


const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  parent: 'game-container',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StartScene, GameScene],
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
};

new Phaser.Game(config);
