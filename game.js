// Game class definition
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

    startButton.on('pointerdown', () => {
      const playerName = document.getElementById('playerName').value.trim();

      if (playerName === '') {
        alert('Пожалуйста, введите ваше имя!');
        return;
      }

      // Save player name (Firebase integration)
      savePlayerName(playerName);

      this.scene.start('GameScene', { playerName: playerName });
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

    const playerNameText = this.add.text(240, 16, `Игрок: ${this.playerName}`, {
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
    if (this.cursors.left.isDown) this.player.setVelocityX(-160);
    if (this.cursors.right.isDown) this.player.setVelocityX(160);

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

  handleObstacleCollision(player, obstacle) {
    if (obstacle.isDanger) {
      this.physics.pause();
      player.setTint(0xff0000);
      this.gameOver = true;

      this.endText.setText(`Игра окончена!\nИгрок: ${this.playerName}\nОчки: ${Math.floor(this.score)}`).setVisible(true);
      this.restartButton.setVisible(true);
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
    this.physics.resume();
  }

  pointerMove(pointer) {
    if (this.gameOver) return;
    this.player.setVelocityX(pointer.x < this.player.x ? -160 : 160);
  }
}

// Function to save player name to Firebase
async function savePlayerName(name) {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js');
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: "AIzaSyDnMxgEnR2YYDmnuMMhhltvoC3rNYaSlS8",
      authDomain: "livangame-2333b.firebaseapp.com",
      projectId: "livangame-2333b",
      storageBucket: "livangame-2333b.firebasestorage.app",
      messagingSenderId: "556982217572",
      appId: "1:556982217572:web:739acd58222c0ef3042871",
      measurementId: "G-2MR1PD2YMD"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    await addDoc(collection(db, 'players'), {
      name: name,
      createdAt: serverTimestamp(),
    });

    console.log(`Player name "${name}" saved to Firebase!`);
  } catch (error) {
    console.error('Ошибка при сохранении имени:', error);
  }
}

// Phaser game configuration
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
