class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    this.load.image('startBackground', 'https://i.imgur.com/y2yUNvZ.png');
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

    const playerNameInput = this.add.dom(240, 250).createFromHTML(`
      <input type="text" id="playerName" placeholder="введите ваше имя!" style="font-size: 24px; padding: 10px; border-radius: 5px; text-align: center;"/>
    `);

    const startButton = this.add.text(240, 350, 'Начать игру', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#cf3517',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold',
    })
      .setInteractive()
      .setOrigin(0.5);

    startButton.on('pointerdown', async () => {
      const playerName = document.getElementById('playerName').value.trim();

      if (playerName === '') {
        alert('Пожалуйста, введите ваше имя!');
        return;
      }

      const playerData = await window.getOrCreatePlayer(playerName);
      this.backgroundMusic.play();
      this.scene.start('GameScene', { playerData });
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

    this.background = this.add.tileSprite(0, 0, 480, 800, 'background');
    this.background.setOrigin(0, 0);

    this.player = this.physics.add.sprite(240, 700, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.3);

    this.score = 0;
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
    this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleCollision, null, this);
  }

  update() {
    if (this.gameOver) return;

    this.background.tilePositionY -= 1;

    this.player.setVelocity(0);
    if (this.cursors.left.isDown) this.player.setVelocityX(-300);
    if (this.cursors.right.isDown) this.player.setVelocityX(300);

    this.score += 0.01;
    this.scoreText.setText('Очки: ' + Math.floor(this.score));
  }

  spawnObstacle() {
    if (this.gameOver) return;

    const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'dangerObstacle' : 'bonusObstacle';
    const xPosition = Phaser.Math.Between(50, 430);
    const obstacle = this.obstacles.create(xPosition, 0, obstacleType).setVelocityY(200).setScale(0.2);

    obstacle.isDanger = obstacleType === 'dangerObstacle';
  }

  async handleObstacleCollision(player, obstacle) {
    if (obstacle.isDanger) {
      // Remove any existing explosion before creating a new one
      if (this.explosion) {
        this.explosion.destroy();
      }

      // Create a new explosion image at the obstacle's position
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
          console.log("High score updated successfully!");
        } catch (error) {
          console.error("Error updating high score:", error);
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
    this.player.clearTint();
    this.player.setPosition(240, 700);
    this.obstacles.clear(true, true);

    // Destroy the explosion image if it exists
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
