// Simple 2D platformer - no external assets (rectangles only)
// Copy into mygame/game.js

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// HUD elements
const healthEl = document.getElementById('health');
const scoreEl = document.getElementById('score');

// --- Input ---
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

// --- Utility ---
function rectsCollide(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// --- Level (platforms) ---
// Each platform: x,y,w,h
const levelPlatforms = [
  {x:0,    y:420, w:800, h:60},       // ground
  {x:120,  y:340, w:120, h:18},
  {x:300,  y:280, w:120, h:18},
  {x:500,  y:220, w:120, h:18},
  {x:680,  y:160, w:120, h:18}
];

// --- Player ---
const player = {
  x: 40, y: 360, w: 28, h: 40,
  vx: 0, vy: 0,
  speed: 2.6,
  jumpForce: -8.6,
  onGround: false,
  facing: 1,
  health: 100
};

// --- Bullets ---
const bullets = []; // {x,y,w,h,vx,owner}

// --- Enemies ---
let enemies = []; // {x,y,w,h,vx,patrolMin,patrolMax,alive}
function spawnEnemiesForLevel() {
  enemies = [
    {x:360,y:240,w:28,h:36,vx:1.2,patrolMin:300,patrolMax:420,alive:true},
    {x:600,y:180,w:28,h:36,vx:1.0,patrolMin:500,patrolMax:740,alive:true},
  ];
}
spawnEnemiesForLevel();

// --- Game state ---
let score = 0;
let gameOver = false;
let levelComplete = false;

// --- Physics constants ---
const GRAV = 0.45;
const FRICTION = 0.85;
const MAX_FALL = 12;

// --- Update ---
function update(dt){
  if(gameOver || levelComplete) return;

  // Input: horizontal
  let moveLeft = keys['arrowleft'] || keys['a'];
  let moveRight = keys['arrowright'] || keys['d'];
  if(moveLeft) { player.vx = -player.speed; player.facing = -1; }
  else if(moveRight) { player.vx = player.speed; player.facing = 1; }
  else player.vx = 0;

  // Jump (X key)
  if((keys['x'] || keys[' ']) && player.onGround){
    player.vy = player.jumpForce;
    player.onGround = false;
  }

  // Shoot (C key) - single-shot per keypress
  if(keys['c'] && !keys._cHandled){
    const b = {
      x: player.x + (player.facing===1? player.w : -8),
      y: player.y + player.h/2 - 4,
      w: 8, h: 8,
      vx: player.facing * 7,
      owner: 'player'
    };
    bullets.push(b);
    keys._cHandled = true;
  }
  if(!keys['c']) keys._cHandled = false;

  // Physics integration
  player.vy += GRAV;
  if(player.vy > MAX_FALL) player.vy = MAX_FALL;
  player.x += player.vx;
  player.y += player.vy;

  // Level bounds X
  if(player.x < 0) player.x = 0;
  if(player.x + player.w > W) player.x = W - player.w;

  // Platform collisions simple resolution
  player.onGround = false;
  for(const p of levelPlatforms){
    // top collision
    if(rectsCollide(player, p)){
      // previous frame detection (simple)
      const prevY = player.y - player.vy;
      if(prevY + player.h <= p.y + 3){ // landed on top
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else {
        // collided from side or bottom -> simple push out
        if(player.x + player.w/2 < p.x + p.w/2) player.x = p.x - player.w - 0.1;
        else player.x = p.x + p.w + 0.1;
      }
    }
  }

  // Bullets update
  for(let i = bullets.length-1; i >= 0; i--){
    const b = bullets[i];
    b.x += b.vx;
    // remove if out of screen
    if(b.x < -20 || b.x > W + 20) bullets.splice(i,1);
    else {
      // check collision vs enemies
      for(const e of enemies){
        if(e.alive && rectsCollide(b,e)){
          e.alive = false;
          bullets.splice(i,1);
          score += 10;
          break;
        }
      }
    }
  }

  // Enemies update (simple patrol)
  for(const e of enemies){
    if(!e.alive) continue;
    e.x += e.vx;
    if(e.x < e.patrolMin){ e.x = e.patrolMin; e.vx *= -1; }
    if(e.x + e.w > e.patrolMax){ e.x = e.patrolMax - e.w; e.vx *= -1; }

    // collide with player
    if(rectsCollide(e, player)){
      // damage once per collision event
      player.health -= 0.6;
      if(player.health <= 0) {
        player.health = 0;
        gameOver = true;
      }
    }
  }

  // Update HUD
  healthEl.textContent = Math.max(0, Math.floor(player.health));
  scoreEl.textContent = score;

  // Check level complete: reach right edge (x > W - 40)
  if(player.x + player.w >= W - 8){
    levelComplete = true;
  }
}

// --- Render ---
function draw(){
  // Sky & ground handled via canvas background and platform draw
  ctx.clearRect(0,0,W,H);

  // Platforms
  for(const p of levelPlatforms){
    ctx.fillStyle = '#2f3b4b';
    roundRect(ctx, p.x, p.y, p.w, p.h, 4);
    ctx.fill();
  }

  // Player
  ctx.save();
  ctx.fillStyle = '#ffde59';
  roundRect(ctx, player.x, player.y, player.w, player.h, 4);
  ctx.fill();
  // simple gun nose
  ctx.fillStyle = '#222';
  const gunX = player.facing===1 ? player.x + player.w - 4 : player.x - 8;
  ctx.fillRect(gunX, player.y + 12, 8, 6);
  ctx.restore();

  // Bullets
  ctx.fillStyle = '#000';
  bullets.forEach(b=> ctx.fillRect(b.x, b.y, b.w, b.h));

  // Enemies
  enemies.forEach(e=>{
    if(!e.alive) {
      // corpse / particle
      ctx.fillStyle = '#6f6f6f';
      ctx.fillRect(e.x, e.y + e.h/2, e.w, 4);
      return;
    }
    ctx.fillStyle = '#d94a4a';
    roundRect(ctx, e.x, e.y, e.w, e.h, 4);
    ctx.fill();
  });

  // If game over or level complete overlay
  if(gameOver || levelComplete){
    ctx.fillStyle = 'rgba(2,8,20,0.7)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '28px Arial';
    if(gameOver) ctx.fillText('Game Over — Press R to restart', W/2, H/2);
    else ctx.fillText('Level Complete! (Press R)  Score: ' + score, W/2, H/2);
    ctx.textAlign = 'left';
  }
}

// rounded rect helper
function roundRect(ctx,x,y,w,h,r){
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

// --- Game loop ---
let last = performance.now();
function loop(now){
  const dt = (now - last)/1000;
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Restart handler (R)
window.addEventListener('keydown', e => {
  if(e.key.toLowerCase() === 'r'){
    restart();
  }
});

// --- Restart / reset ---
function restart(){
  player.x = 40; player.y = 360; player.vx = 0; player.vy = 0; player.health = 100;
  bullets.length = 0;
  score = 0;
  gameOver = false; levelComplete = false;
  spawnEnemiesForLevel();
  healthEl.textContent = player.health;
  scoreEl.textContent = score;
}
