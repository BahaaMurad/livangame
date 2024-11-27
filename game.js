class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    this.load.image('startBackground', 'https://i.imgur.com/y2yUNvZ.png');
    this.load.audio('backgroundMusic', 'https://raw.githubusercontent.com/BahaaMurad/music/main/background-music.mp3');
  }

  create() {
    this.backgroundMusic = this.sound.add('backgroundMusic', { loop: true });
    this.backgroundMusic.play();

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
      <input type="text" id="playerName" placeholder="Enter your name" style="font-size: 24px; padding: 10px; border-radius: 5px; text-align: center;"/>
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

      // Check if the player exists or create a new entry
      const playerData = await checkOrCreatePlayer(playerName);

      // Start the game and pass player data
      this.scene.start('GameScene', { playerName: playerName, highScore: playerData.highScore });
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
  }

  create(data) {
    this.playerName = data.playerName;
    this.highScore = data.highScore || 0;

    this.add.text(240, 16, `Игрок: ${this.playerName}`, {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(16, 16, 'Очки: 0', {
      fontSize: '32px',
      fill: '#fff',
      fontWeight: 'bold',
      backgroundColor: '#425234',
    });

    this.highScoreText = this.add.text(16, 56, `Рекорд: ${this.highScore}`, {
      fontSize: '32px',
      fill: '#fff',
      fontWeight: 'bold',
      backgroundColor: '#425234',
    });

    this.background = this.add.tileSprite(0, 0, 480, 800, 'background');
    this.background.setOrigin(0, 0);

    this.player = this.physics.add.sprite(240, 700, 'player').setCollideWorldBounds(true).setScale(0.3);

    this.score = 0;
    this.obstacles = this.physics.add.group();

    this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, null, this);
  }

  update() {
    this.background.tilePositionY -= 1;
    this.score += 0.01;
    this.scoreText.setText(`Очки: ${Math.floor(this.score)}`);
  }

  spawnObstacle() {
    const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'dangerObstacle' : 'bonusObstacle';
    const xPosition = Phaser.Math.Between(50, 430);
    const obstacle = this.obstacles.create(xPosition, 0, obstacleType).setVelocityY(200).setScale(0.2);

    obstacle.isDanger = obstacleType === 'dangerObstacle';
  }

  async handleCollision(player, obstacle) {
    if (obstacle.isDanger) {
      this.physics.pause();
      player.setTint(0xff0000);

      const newScore = Math.floor(this.score);
      if (newScore > this.highScore) {
        await updateHighScore(this.playerName, newScore);
      }
    } else {
      this.score += 5;
    }
    obstacle.destroy();
  }
}

// Firebase logic
async function checkOrCreatePlayer(name) {
  const docRef = doc(db, 'players', name);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    await setDoc(docRef, { name: name, highScore: 0 });
    return { name: name, highScore: 0 };
  }
}

async function updateHighScore(name, score) {
  const docRef = doc(db, 'players', name);
  await updateDoc(docRef, { highScore: score });
}
