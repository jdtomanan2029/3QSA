const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelDisplay = document.getElementById("currentLevel");
const healthBar = document.getElementById("healthBar");
const energyBar = document.getElementById("energyBar");

let currentLevel = 1;
let gameRunning = false;
let gameStarted = false;
const keys = {};

const backgrounds = {
  1: {
    url: "https://raw.githubusercontent.com/chloecudiamatz/pictures-2.0/main/acad%201.png",
    name: "Academic Building 1"
  },
  2: {
    url: "https://raw.githubusercontent.com/chloecudiamatz/pictures-2.0/main/stairs.png",
    name: "Admin Building"
  }
};

const backgroundImages = {};
let currentBackground = null;

const ASSET_PATHS = {
  still: "https://raw.githubusercontent.com/chloecudiamatz/pictures-2.0/main/scholarstill.png",
  attack: "https://raw.githubusercontent.com/chloecudiamatz/pictures-2.0/main/scholarfight.png",
  jump: "https://raw.githubusercontent.com/chloecudiamatz/pictures-2.0/main/scholarscared.png",
  chemZombie: "https://github.com/chloecudiamatz/pictures-2.0/blob/main/zombi.png?raw=true",
  boss: "https://github.com/chloecudiamatz/pictures-2.0/blob/main/rohitmad.png?raw=true",
  sirJaypee: "https://github.com/chloecudiamatz/pictures-2.0/blob/main/jaypeestill.png?raw=true"
};

const assets = {};
let loadedAssets = 0;
const totalAssets = Object.keys(ASSET_PATHS).length;

function loadAssets() {
  loadedAssets = 0; 
  for (let key in ASSET_PATHS) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = ASSET_PATHS[key];

    img.onload = () => {
      assets[key] = img; 
      loadedAssets++;
      if (loadedAssets === totalAssets) {
        drawStartScreen();
      }
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${ASSET_PATHS[key]} for asset key: ${key}`);
      loadedAssets++;
      if (loadedAssets === totalAssets) {
        drawStartScreen ();
      }
    };
  }
}

function loadBackgrounds() {
  for (let lvl in backgrounds) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = backgrounds[lvl].url;

    img.onload = () => {
      backgroundImages[lvl] = img;
      if (parseInt(lvl) === currentLevel) currentBackground = img;
    };

    img.onerror = () => {
        console.error(`Failed to load background image: ${backgrounds[lvl].url} for level: ${lvl}`);
    };
  }
}

class Enemy {
  constructor(x, y, width, height, imageKey, speed, health) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = assets[imageKey]; // Reference the loaded asset
    this.speed = speed;
    this.health = health;
    this.alive = true;
    this.groundY = canvas.height - 40 - this.height;
  }

  update() {
    if (!this.alive) return;
    if (player.x < this.x) {
      this.x -= this.speed;
    } else {
      this.x += this.speed;
    }
    this.y = this.groundY;
  }

  draw() {
    if (this.alive && this.image) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      console.log("Enemy defeated!");
    }
  }
}

class NPC {
  constructor(x, y, width, height, imageKey) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = assets[imageKey];
    this.saved = false;
    this.groundY = canvas.height - 40 - this.height;
  }

  draw() {
    if (!this.saved && this.image) {
      ctx.drawImage(this.image, this.x, this.groundY, this.width, this.height);
    }
  }
}

let chemZombies = [];
let boss = null;
let sirJaypee = null;

class Player {
  constructor() {
    this.x = 100;
    this.y = 300;
    this.width = 60;
    this.height = 60;

    this.speed = 5;
    this.velocityY = 0;
    this.gravity = 0.6;
    this.jumpPower = -12;
    this.onGround = false;

    this.health = 100;
    this.energy = 100;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.maxAttackCooldown = 30;
    this.jumpEnergyCost = 10; 
  }

  update() {
    if (!gameRunning) return;

    if (keys["a"]) this.x -= this.speed;
    if (keys["d"]) this.x += this.speed;

    if ((keys["w"] || keys[" "]) && this.onGround && this.energy >= this.jumpEnergyCost) {
      this.velocityY = this.jumpPower;
      this.onGround = false;
      this.energy -= this.jumpEnergyCost;
      if (this.energy < 0) this.energy = 0;
    }

    this.velocityY += this.gravity;
    this.y += this.velocityY;

    const ground = canvas.height - 40;
    if (this.y + this.height >= ground) {
      this.y = ground - this.height;
      this.velocityY = 0;
      this.onGround = true;
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    if (keys["e"] && !this.isAttacking && this.attackCooldown === 0) {
      this.isAttacking = true;
      this.attackCooldown = this.maxAttackCooldown;

      if (currentLevel === 1) {
        chemZombies.forEach(zombie => {
          if (zombie.alive && this.isColliding(zombie, 50)) {
            zombie.takeDamage(20);
            this.energy -= 5; 
            if (this.energy < 0) this.energy = 0;
          }
        });
      } else if (currentLevel === 2 && boss && boss.alive) {
        if (this.isColliding(boss, 70)) { // Boss attack range
            boss.takeDamage(15);
            this.energy -= 10;
            if (this.energy < 0) this.energy = 0;
        }
      }
    }
    
    if (this.x > canvas.width - this.width) {
      if (currentLevel < Object.keys(backgrounds).length) {
        currentLevel++;
        currentBackground = backgroundImages[currentLevel];
        levelDisplay.textContent =
          currentLevel + " - " + backgrounds[currentLevel].name;
        this.x = 0;
        this.y = 300;

       
        if (currentLevel === 2) {
            chemZombies = [];
            boss = new Enemy(700, 250, 100, 100, "boss", 0.5, 200); 
            sirJaypee = new NPC(780, 320, 50, 50, "sirJaypee"); 
        }
      } else {
          console.log("You win!");
          gameRunning = false;
          drawWinScreen();
      }
    }

    if (currentLevel === 1) {
      chemZombies.forEach(zombie => {
        if (zombie.alive && this.isColliding(zombie)) {
          this.health -= 0.5; 
          if (this.health < 0) this.health = 0;
        }
      });
    } else if (currentLevel === 2 && boss && boss.alive) {
        if (this.isColliding(boss)) {
            this.health -= 1;
            if (this.health < 0) this.health = 0;
        }
    }

    
    if (this.health <= 0) {
        gameRunning = false;
        drawGameOverScreen();
    }

    if (currentLevel === 2 && sirJaypee && !sirJaypee.saved && boss && !boss.alive) {
        if (this.isColliding(sirJaypee, 20)) { 
            sirJaypee.saved = true;
            console.log("Sir Jaypee saved!");
            gameRunning = false;
            drawWinScreen();
        }
    }
    healthBar.style.width = this.health + "%";
    energyBar.style.width = this.energy + "%";

    this.energy += 0.1;
    if (this.energy > 100) this.energy = 100;
  }

  draw() {
    let sprite = assets.still;

    if (this.isAttacking) sprite = assets.attack;
    else if (!this.onGround) sprite = assets.jump;

    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
    }
  }

  isColliding(other, buffer = 0) {
    return (
      this.x < other.x + other.width - buffer &&
      this.x + this.width > other.x + buffer &&
      this.y < other.y + other.height - buffer &&
      this.y + this.height > other.y + buffer
    );
  }
}

const player = new Player();

function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentBackground) {
    ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height);
  }

  player.update();
  player.draw();

  if (currentLevel === 1) {
    chemZombies.forEach(zombie => {
      zombie.update();
      zombie.draw();
    });
  } else if (currentLevel === 2) {
    if (boss) {
        boss.update();
        boss.draw();
    }
    if (sirJaypee) {
        sirJaypee.draw();
    }
  }

  requestAnimationFrame(gameLoop);
}

function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px 'Trebuchet MS'";
    ctx.fillStyle = "#d6f5d6";
    ctx.textAlign = "center";
    ctx.fillText("Click to Start PisCue", canvas.width / 2, canvas.height / 2);
    ctx.font = "16px 'Trebuchet MS'";
    ctx.fillText("When science goes wrong... only one scholar can set it right.", canvas.width / 2, canvas.height / 2 + 40);
}

function drawGameOverScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "50px 'Trebuchet MS'";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px 'Trebuchet MS'";
    ctx.fillStyle = "#d6f5d6";
    ctx.fillText("You failed to save the world... or yourself.", canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText("Click to restart", canvas.width / 2, canvas.height / 2 + 70);
}

function drawWinScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "50px 'Trebuchet MS'";
    ctx.fillStyle = "#7fff7f";
    ctx.textAlign = "center";
    ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px 'Trebuchet MS'";
    ctx.fillStyle = "#d6f5d6";
    ctx.fillText("Sir Jaypee is safe, and science is back on track!", canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText("Click to play again", canvas.width / 2, canvas.height / 2 + 70);
}

window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (["a", "d", "w", " ", "e"].includes(key)) {
    keys[key] = true;
    e.preventDefault();
  }
});

window.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  if (["a", "d", "w", " ", "e"].includes(key)) {
    keys[key] = false;
    if (key === "e") player.isAttacking = false;
    e.preventDefault();
  }
});

canvas.addEventListener("click", () => {
    if (!gameStarted) {
        gameStarted = true;
        gameRunning = true;
        currentLevel = 1;
        player.health = 100;
        player.energy = 100;
        player.x = 100;
        player.y = 300;
        levelDisplay.textContent = currentLevel + " - " + backgrounds[currentLevel].name;

        chemZombies = [
            new Enemy(700, 300, 70, 70, "chemZombie", 1, 60),
            new Enemy(500, 300, 70, 70, "chemZombie", 1.2, 70),
        ];
        boss = null;
        sirJaypee = null;
        requestAnimationFrame(gameLoop);
    } else if (!gameRunning && player.health <= 0) {
        gameStarted = false;
        loadAssets();
    } else if (!gameRunning && (sirJaypee && sirJaypee.saved)) {
        gameStarted = false;
        loadAssets();
    }
});

loadBackgrounds();
loadAssets();