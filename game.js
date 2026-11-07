
let pacman;
let cursors;
let score = 0;
let lives = 3;
let scoreText;
let livesText;
let dots = [];
let ghosts = [];
let gameOver = false;
let gameScene;

let moveTimer = 0;
let ghostTimer = 0;
let moveDirection = 'left';
let nextDirection = 'left';

let mazePixels;
let mazeWidth;
let mazeHeight;

function preload() {
    this.load.image('pacman', 'assets/pacman_sprite.png');
    this.load.image('background', 'assets/pacman_background.png');

    this.load.image('red', 'assets/red_ghost_sprite.png');
    this.load.image('pink', 'assets/pink_ghost_sprite.png');
    this.load.image('blue', 'assets/blue_ghost_sprite.png');
    this.load.image('orange', 'assets/orange_ghost_sprite.png');

    this.load.on('loaderror', function(file) {
        console.log('Image failed to load:', file.src);
    });
}

function create() {
    gameScene = this;

    score = 0;
    lives = 3;
    gameOver = false;
    dots = [];
    ghosts = [];
    moveTimer = 0;
    ghostTimer = 0;
    moveDirection = 'left';
    nextDirection = 'left';

    // Display your original maze background
    this.add.image(400, 300, 'background')
        .setDisplaySize(800, 600);

    // Read the maze background to detect blue walls
    let backgroundImage =
        this.textures.get('background').getSourceImage();

    let canvas = document.createElement('canvas');

    mazeWidth = backgroundImage.width;
    mazeHeight = backgroundImage.height;

    canvas.width = mazeWidth;
    canvas.height = mazeHeight;

    let context = canvas.getContext('2d');
    context.drawImage(backgroundImage, 0, 0);

    mazePixels = context.getImageData(
        0, 0, mazeWidth, mazeHeight
    ).data;

    // Check which ghost images loaded
    console.log("Red loaded:", this.textures.exists('red'));
    console.log("Pink loaded:", this.textures.exists('pink'));
    console.log("Blue loaded:", this.textures.exists('blue'));
    console.log("Orange loaded:", this.textures.exists('orange'));

    cursors = this.input.keyboard.createCursorKeys();

    // Create Pac-Man
    pacman = this.physics.add.sprite(60, 60, 'pacman');
    pacman.setDisplaySize(30, 30);

    // Create coins in the paths
    for (let y = 20; y < 600; y += 40) {
        for (let x = 20; x < 800; x += 40) {
            if (!isWallAt(x, y)) {
                let dot = this.add.circle(x, y, 4, 0xffff00);
                dots.push(dot);
            }
        }
    }

    // Create ghosts
    ghosts.push(this.physics.add.sprite(740, 60, 'red'));
    ghosts.push(this.physics.add.sprite(740, 540, 'pink'));
    ghosts.push(this.physics.add.sprite(60, 540, 'blue'));
    ghosts.push(this.physics.add.sprite(420, 300, 'orange'));

    ghosts.forEach(ghost => {
        ghost.setDisplaySize(30, 30);
    });

    // Score and lives
    scoreText = this.add.text(20, 10, 'Score: 0', {
        fontSize: '20px',
        color: '#ffffff'
    });

    livesText = this.add.text(680, 10, 'Lives: 3', {
        fontSize: '20px',
        color: '#ffffff'
    });
}

function update(time, delta) {
    if (gameOver) return;

    moveTimer += delta;
    ghostTimer += delta;

    if (moveTimer >= 150) {
        moveTimer = 0;

        if (cursors.left.isDown) nextDirection = 'left';
        if (cursors.right.isDown) nextDirection = 'right';
        if (cursors.up.isDown) nextDirection = 'up';
        if (cursors.down.isDown) nextDirection = 'down';

        let nextX = pacman.x;
        let nextY = pacman.y;

        if (nextDirection === 'left') nextX -= 40;
        if (nextDirection === 'right') nextX += 40;
        if (nextDirection === 'up') nextY -= 40;
        if (nextDirection === 'down') nextY += 40;

        if (canMoveFrom(nextX, nextY)) {
            pacman.x = nextX;
            pacman.y = nextY;
            moveDirection = nextDirection;

            // Pac-Man's corrected rotation
            if (moveDirection === 'right') {
                pacman.setAngle(180);
            }
            if (moveDirection === 'down') {
                pacman.setAngle(270);
            }
            if (moveDirection === 'left') {
                pacman.setAngle(0);
            }
            if (moveDirection === 'up') {
                pacman.setAngle(90);
            }

        } else {
            nextX = pacman.x;
            nextY = pacman.y;

            if (moveDirection === 'left') nextX -= 40;
            if (moveDirection === 'right') nextX += 40;
            if (moveDirection === 'up') nextY -= 40;
            if (moveDirection === 'down') nextY += 40;

            if (canMoveFrom(nextX, nextY)) {
                pacman.x = nextX;
                pacman.y = nextY;
            }
        }

        collectDots();
    }

    if (ghostTimer >= 450) {
        ghostTimer = 0;
        moveGhosts();
    }

    checkGhostCollision();
}

function isWallAt(x, y) {
    let imageX = Math.floor(x / 800 * mazeWidth);
    let imageY = Math.floor(y / 600 * mazeHeight);

    if (
        imageX < 0 || imageX >= mazeWidth ||
        imageY < 0 || imageY >= mazeHeight
    ) {
        return true;
    }

    let index = (imageY * mazeWidth + imageX) * 4;

    let red = mazePixels[index];
    let green = mazePixels[index + 1];
    let blue = mazePixels[index + 2];

    return blue > red + 35 && blue > green + 35;
}

function canMoveFrom(x, y) {
    let points = [
        [x, y],
        [x - 10, y],
        [x + 10, y],
        [x, y - 10],
        [x, y + 10]
    ];

    for (let point of points) {
        if (isWallAt(point[0], point[1])) {
            return false;
        }
    }

    return true;
}

function collectDots() {
    dots.forEach((dot, index) => {
        if (
            dot.active &&
            Phaser.Math.Distance.Between(
                pacman.x, pacman.y, dot.x, dot.y
            ) < 15
        ) {
            dot.destroy();
            dots[index] = null;
            score += 10;
            scoreText.setText('Score: ' + score);
        }
    });

    dots = dots.filter(dot => dot !== null);

    if (dots.length === 0) {
        endGame(true);
    }
}

function moveGhosts() {
    ghosts.forEach(ghost => {
        let directions = [
            { x: -40, y: 0 },
            { x: 40, y: 0 },
            { x: 0, y: -40 },
            { x: 0, y: 40 }
        ];

        Phaser.Utils.Array.Shuffle(directions);

        for (let direction of directions) {
            let nextX = ghost.x + direction.x;
            let nextY = ghost.y + direction.y;

            if (canMoveFrom(nextX, nextY)) {
                ghost.x = nextX;
                ghost.y = nextY;
                break;
            }
        }
    });
}

function checkGhostCollision() {
    ghosts.forEach(ghost => {
        let distance = Phaser.Math.Distance.Between(
            pacman.x, pacman.y, ghost.x, ghost.y
        );

        if (distance < 25) {
            lives--;
            livesText.setText('Lives: ' + lives);

            pacman.x = 60;
            pacman.y = 60;

            if (lives <= 0) {
                endGame(false);
            }
        }
    });
}

function endGame(won) {
    if (gameOver) return;

    gameOver = true;

    let message = won ? 'You Win!' : 'Game Over!';

    gameScene.add.text(300, 250, message, {
        fontSize: '40px',
        color: '#ffffff'
    });

    gameScene.add.text(320, 310, 'Final Score: ' + score, {
        fontSize: '24px',
        color: '#ffffff'
    });

    // Replay button
    let replayButton = gameScene.add.text(350, 380, 'Replay', {
        fontSize: '28px',
        color: '#ffff00',
        backgroundColor: '#000000',
        padding: {
            x: 15,
            y: 8
        }
    });

    replayButton.setInteractive({ useHandCursor: true });

    replayButton.on('pointerover', function() {
        replayButton.setStyle({ color: '#00ff00' });
    });

    replayButton.on('pointerout', function() {
        replayButton.setStyle({ color: '#ffff00' });
    });

    replayButton.on('pointerdown', function() {
        gameScene.scene.restart();
    });
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
