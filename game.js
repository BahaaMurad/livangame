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
      .setDepth(10)  // Ensure it is rendered above other elements like background
      .on('pointerdown', () => {
        if (this.backgroundMusic.isPlaying) {
          this.backgroundMusic.pause();  // Pause the music
          musicToggle.setText('🔇');     // Change button to mute icon
        } else {
          this.backgroundMusic.resume(); // Resume the music
          musicToggle.setText('🔊');     // Change button to unmute icon
        }
      });

    // Set the background image for the start menu and make it fit the screen
    this.add.image(240, 400, 'startBackground').setScale(0.5);

    // Create the player name input field
    const playerNameInput = this.add.dom(240, 250).createFromHTML(`
      <input type="text" id="playerName" placeholder="Enter your name" style="font-size: 24px; padding: 10px; border-radius: 5px; text-align: center;"/>
    `);

    // Create a start button
    const startButton = this.add.text(240, 350, 'Начать игру', { fontSize: '32px', fill: '#fff', backgroundColor: '#cf3517', padding: { x: 10, y: 5 }, fontStyle: 'bold' })
      .setInteractive()
      .setOrigin(0.5);

    startButton.on('pointerdown', () => {
      const playerName = document.getElementById('playerName').value.trim();

      if (playerName === '') {
        alert('Пожалуйста, введите ваше имя!'); // Alert if the name is empty
        return; // Do not start the game if name is not entered
      }

       // Send player's name to the server
       this.savePlayerName(playerName);

       // Start the game and pass the playerName as part of the data
       this.scene.start('GameScene', { playerName: playerName });
    });
  } 
  savePlayerName(name) {
    fetch('https://livangame.onrender.com/api/save-name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })
      .then(response => response.json())
      .then(data => {
        console.log(data.message); // Handle success
      })
      .catch(error => {
        console.error('Ошибка при сохранении имени:', error);
      });
  }
}


class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('player', 'https://i.imgur.com/q7ZEJHs.png');
    this.load.image('dangerObstacle', 'https://i.imgur.com/t9U0UAN.png'); // Ends the game
    this.load.image('bonusObstacle', 'https://i.imgur.com/5HHXX0s.png');   // Adds 5 points
    this.load.image('background', 'https://i.imgur.com/R06cLdY.png');
  }

  create(data) {
    // Display player name in the game scene
    this.playerName = data.playerName; // Get player name passed from StartScene
    const playerNameText = this.add.text(240, 16, `Игрок: ${this.playerName}`, {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create background image
    this.background = this.add.tileSprite(0, 0, 480, 800, 'background');
    this.background.setOrigin(0, 0);

    // Create player sprite
    this.player = this.physics.add.sprite(240, 700, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.3);

    // Initialize score
    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Очки: 0', { 
      fontSize: '32px', 
      fill: '#fff', 
      fontWeight: 'bold', 
      fontFamily: 'Arial', 
      padding: { x: 10, y: 5 },
      backgroundColor: '#425234' // Black background color
    });

    // Game over text and restart button (initially hidden)
    this.endText = this.add.text(240, 300, 'Игра окончена!', { fontSize: '48px', fill: '#fff', fontStyle: 'bold', backgroundColor: '#425234' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(10);  // Set depth to ensure it's on top

    this.restartButton = this.add.text(240, 400, 'ПЕРЕИГРАТЬ', { fontSize: '32px', fill: '#fff', fontStyle: 'bold', backgroundColor: '#425234', padding: { x: 10, y: 5 } })
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false)
      .setDepth(10);  // Set depth to ensure it's on top

    this.restartButton.on('pointerdown', this.restartGame, this);

    // Set up controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointermove', this.pointerMove, this);

    // Obstacles setup
    this.obstacles = this.physics.add.group();
    this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true
    });

    // Collision handling
    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleCollision, null, this);
  }

  update() {
    if (this.gameOver) return;

    // Scroll background
    this.background.tilePositionY -= 1;

    // Reset player velocity and move based on input
    this.player.setVelocity(0);
    if (this.cursors.left.isDown) this.player.setVelocityX(-160);
    if (this.cursors.right.isDown) this.player.setVelocityX(160);

    // Update score over time
    this.score += 0.01;
    this.scoreText.setText('Очки: ' + Math.floor(this.score));
  }

  spawnObstacle() {
    if (this.gameOver) return;

    // Random obstacle type
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

      // Update the endText with player's name and score
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

// Phaser configuration
const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  parent: 'game-container',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StartScene, GameScene],
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } }
};

new Phaser.Game(config);
