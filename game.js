/**
 * PAC-MAN: THE MAN EDITION
 * Complete Arcade Game in Vanilla JavaScript & HTML5 Canvas
 */

'use strict';

/* ==========================================================================
   1. CONFIGURATION & CONSTANTS
   ========================================================================== */

const CONFIG = {
  TILE_SIZE: 20,
  COLS: 28,
  ROWS: 31,
  BASE_SPEED: 110, // Pixels per second for Pac-Man at 100% speed
  GHOST_SPEED: 95,
  BOSS_SPEED: 115,
  
  // Speed multipliers by score (Requirement 2.A)
  SPEED_TIERS: [
    { minScore: 0,    multiplier: 1.00, label: '100%' },
    { minScore: 100,  multiplier: 1.10, label: '110%' },
    { minScore: 250,  multiplier: 1.20, label: '120%' },
    { minScore: 500,  multiplier: 1.35, label: '135%' },
    { minScore: 1000, multiplier: 1.50, label: '150%' },
    { minScore: 2000, multiplier: 1.75, label: '175%' }
  ],

  // Durations (seconds)
  WALL_PASS_DURATION: 5.0,
  ATTACK_BONUS_DURATION: 6.0,
  BOSS_SCORE_THRESHOLD: 1000,
  BOSS_MAX_HP: 3,

  // Scoring
  POINTS_DOT: 10,
  POINTS_WALL_PASS: 50,
  POINTS_ATTACK_BONUS: 50,
  POINTS_LEVEL_CLEAR: 200,
  POINTS_DEFEAT_BOSS: 500,
  POINTS_EAT_GHOST: 200,

  // Colors
  COLOR_WALL: '#00e5ff',
  COLOR_WALL_GLOW: 'rgba(0, 229, 255, 0.7)',
  COLOR_DOT: '#e0f7fa',
  COLOR_PACMAN: '#00f0ff',
  COLOR_PACMAN_GLOW: 'rgba(0, 240, 255, 0.9)',
  COLOR_WALLPASS_AURA: '#06b6d4',
  COLOR_ATTACK_AURA: '#f59e0b',
  COLOR_BOSS_AURA: '#ef4444'
};

// Directions
const DIR = {
  NONE:  { x: 0,  y: 0,  name: 'none' },
  UP:    { x: 0,  y: -1, name: 'up' },
  DOWN:  { x: 0,  y: 1,  name: 'down' },
  LEFT:  { x: -1, y: 0,  name: 'left' },
  RIGHT: { x: 1,  y: 0,  name: 'right' }
};

/* ==========================================================================
   2. SOUND SYNTHESIS ENGINE (Web Audio API)
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.wakaAlt = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playWaka() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const freq = this.wakaAlt ? 480 : 330;
    this.wakaAlt = !this.wakaAlt;

    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.08);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playPowerup() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.25);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playBossAlarm() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + i * 0.28;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, st);
      osc.frequency.exponentialRampToValueAtTime(110, st + 0.2);

      gain.gain.setValueAtTime(0.18, st);
      gain.gain.exponentialRampToValueAtTime(0.01, st + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + 0.22);
    }
  }

  playBossHit() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // Noise blast + sub punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.3);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  playBossDefeated() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);

      gain.gain.setValueAtTime(0.14, st);
      gain.gain.exponentialRampToValueAtTime(0.01, st + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + 0.22);
    });
  }

  playDeath() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.5);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  playLevelClear() {
    if (this.muted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);

      gain.gain.setValueAtTime(0.15, st);
      gain.gain.exponentialRampToValueAtTime(0.01, st + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + 0.32);
    });
  }
}

/* ==========================================================================
   3. MAZE MAP TEMPLATE (28 Columns x 31 Rows)
   0: Corridor (empty)
   1: Wall
   2: Regular Dot
   4: Ghost Gate
   5: Ghost Pen interior
   ========================================================================== */

const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,0], // Tunnel Row 14
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,2,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

/* ==========================================================================
   4. PARTICLE SYSTEM & VISUAL EFFECTS
   ========================================================================== */

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  emit(x, y, color, count = 12, speed = 120) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1.0,
        decay: Math.random() * 1.5 + 1.2
      });
    }
  }

  addFloatingText(x, y, text, color = '#00f0ff') {
    this.floatingTexts.push({
      x, y, text, color,
      vy: -40,
      alpha: 1.0,
      life: 0.9
    });
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 0.9);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw floating texts
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}

/* ==========================================================================
   5. PAC-MAN (PLAYER) ENTITY
   ========================================================================== */

class Pacman {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    // Starting tile: exact center of tile 13, row 23 (walkable corridor)
    this.tileX = 13;
    this.tileY = 23;
    this.x = (this.tileX + 0.5) * CONFIG.TILE_SIZE;
    this.y = (this.tileY + 0.5) * CONFIG.TILE_SIZE;
    this.radius = CONFIG.TILE_SIZE * 0.44;

    this.currentDir = DIR.LEFT;
    this.desiredDir = DIR.LEFT;
    this.speed = CONFIG.BASE_SPEED;

    this.mouthAngle = 0.2;
    this.mouthOpening = true;

    // Bonuses timers
    this.wallPassTimer = 0;
    this.attackBonusTimer = 0;
  }

  get isWallPassActive() {
    return this.wallPassTimer > 0;
  }

  get isAttackActive() {
    return this.attackBonusTimer > 0;
  }

  activateWallPass(duration = CONFIG.WALL_PASS_DURATION) {
    this.wallPassTimer = duration;
  }

  activateAttackBonus(duration = CONFIG.ATTACK_BONUS_DURATION) {
    this.attackBonusTimer = duration;
  }

  update(dt) {
    // Update bonuses
    if (this.wallPassTimer > 0) {
      this.wallPassTimer -= dt;
      if (this.wallPassTimer <= 0) {
        this.wallPassTimer = 0;
        this.onWallPassExpire();
      }
    }

    if (this.attackBonusTimer > 0) {
      this.attackBonusTimer -= dt;
      if (this.attackBonusTimer <= 0) {
        this.attackBonusTimer = 0;
      }
    }

    // Dynamic speed based on score (Requirement 2.A)
    const multiplier = this.game.getCurrentSpeedMultiplier();
    this.speed = CONFIG.BASE_SPEED * multiplier;

    // Handle turning logic with cornering tolerance
    this.handleMovement(dt);

    // Animate mouth
    if (this.currentDir !== DIR.NONE) {
      const mouthSpeed = 8 * (this.speed / CONFIG.BASE_SPEED);
      if (this.mouthOpening) {
        this.mouthAngle += mouthSpeed * dt;
        if (this.mouthAngle >= 0.45) this.mouthOpening = false;
      } else {
        this.mouthAngle -= mouthSpeed * dt;
        if (this.mouthAngle <= 0.05) this.mouthOpening = true;
      }
    }
  }

  handleMovement(dt) {
    const ts = CONFIG.TILE_SIZE;
    const moveDist = this.speed * dt;

    const currTileX = Math.floor(this.x / ts);
    const currTileY = Math.floor(this.y / ts);
    const centerTileX = (currTileX + 0.5) * ts;
    const centerTileY = (currTileY + 0.5) * ts;

    // Instant reverse direction anytime
    if (this.desiredDir !== DIR.NONE && this.desiredDir.x === -this.currentDir.x && this.desiredDir.y === -this.currentDir.y) {
      this.currentDir = this.desiredDir;
    }

    // From standstill, start immediately if desired direction is open
    if (this.currentDir === DIR.NONE && this.desiredDir !== DIR.NONE) {
      const targetTileX = currTileX + this.desiredDir.x;
      const targetTileY = currTileY + this.desiredDir.y;
      if (this.canMoveToTile(targetTileX, targetTileY)) {
        this.x = centerTileX;
        this.y = centerTileY;
        this.currentDir = this.desiredDir;
      }
    }

    if (this.currentDir === DIR.NONE) return;

    // Movement along X axis (Horizontal)
    if (this.currentDir.x !== 0) {
      this.y = centerTileY; // Keep centered on corridor
      const nextX = this.x + this.currentDir.x * moveDist;

      // Handle wrap-around tunnel at row 14
      if (currTileY === 14) {
        if (nextX < -ts * 0.5) {
          this.x = (CONFIG.COLS - 0.5) * ts;
          return;
        } else if (nextX > (CONFIG.COLS + 0.5) * ts) {
          this.x = -ts * 0.5;
          return;
        }
      }

      // Check if crossing tile center in movement direction
      const crossedCenter = (this.currentDir.x > 0 && this.x <= centerTileX && nextX >= centerTileX) ||
                            (this.currentDir.x < 0 && this.x >= centerTileX && nextX <= centerTileX);

      if (crossedCenter) {
        const excess = Math.abs(nextX - centerTileX);

        // Can we make a perpendicular turn?
        if (this.desiredDir !== DIR.NONE && this.desiredDir.x === 0 && this.canMoveToTile(currTileX + this.desiredDir.x, currTileY + this.desiredDir.y)) {
          this.x = centerTileX;
          this.y = centerTileY;
          this.currentDir = this.desiredDir;
          this.x += this.currentDir.x * excess;
          this.y += this.currentDir.y * excess;
          return;
        }

        // Check if wall ahead
        const nextTileX = currTileX + this.currentDir.x;
        if (!this.canMoveToTile(nextTileX, currTileY)) {
          this.x = centerTileX;
          this.currentDir = DIR.NONE;
          return;
        }
      } else if (this.currentDir.x > 0 && this.x > centerTileX) {
        // Already past center: check wall ahead
        if (!this.canMoveToTile(currTileX + 1, currTileY) && nextX >= centerTileX) {
          this.x = centerTileX;
          this.currentDir = DIR.NONE;
          return;
        }
      } else if (this.currentDir.x < 0 && this.x < centerTileX) {
        if (!this.canMoveToTile(currTileX - 1, currTileY) && nextX <= centerTileX) {
          this.x = centerTileX;
          this.currentDir = DIR.NONE;
          return;
        }
      }

      this.x = nextX;
    }
    // Movement along Y axis (Vertical)
    else if (this.currentDir.y !== 0) {
      this.x = centerTileX; // Keep centered on corridor
      const nextY = this.y + this.currentDir.y * moveDist;

      // Check if crossing tile center
      const crossedCenter = (this.currentDir.y > 0 && this.y <= centerTileY && nextY >= centerTileY) ||
                            (this.currentDir.y < 0 && this.y >= centerTileY && nextY <= centerTileY);

      if (crossedCenter) {
        const excess = Math.abs(nextY - centerTileY);

        // Can we make a perpendicular turn?
        if (this.desiredDir !== DIR.NONE && this.desiredDir.y === 0 && this.canMoveToTile(currTileX + this.desiredDir.x, currTileY + this.desiredDir.y)) {
          this.x = centerTileX;
          this.y = centerTileY;
          this.currentDir = this.desiredDir;
          this.x += this.currentDir.x * excess;
          this.y += this.currentDir.y * excess;
          return;
        }

        // Check if wall ahead
        const nextTileY = currTileY + this.currentDir.y;
        if (!this.canMoveToTile(currTileX, nextTileY)) {
          this.y = centerTileY;
          this.currentDir = DIR.NONE;
          return;
        }
      } else if (this.currentDir.y > 0 && this.y > centerTileY) {
        if (!this.canMoveToTile(currTileX, currTileY + 1) && nextY >= centerTileY) {
          this.y = centerTileY;
          this.currentDir = DIR.NONE;
          return;
        }
      } else if (this.currentDir.y < 0 && this.y < centerTileY) {
        if (!this.canMoveToTile(currTileX, currTileY - 1) && nextY <= centerTileY) {
          this.y = centerTileY;
          this.currentDir = DIR.NONE;
          return;
        }
      }

      this.y = nextY;
    }

    this.tileX = Math.floor(this.x / ts);
    this.tileY = Math.floor(this.y / ts);
  }

  canMoveToTile(tx, ty) {
    // Outer boundaries: never passable (Requirement 2.B)
    if (tx < 0 || tx >= CONFIG.COLS || ty < 0 || ty >= CONFIG.ROWS) {
      // Tunnel row exception
      if (ty === 14 && (tx < 0 || tx >= CONFIG.COLS)) return true;
      return false;
    }

    // Outer border walls are never passable even with wall-pass
    if (tx === 0 || tx === CONFIG.COLS - 1 || ty === 0 || ty === CONFIG.ROWS - 1) {
      if (ty === 14 && (tx === 0 || tx === CONFIG.COLS - 1)) return true; // tunnel entrance
      return false;
    }

    const cell = this.game.getMapCell(tx, ty);

    // Ghost gate (4) is impassable to Pac-Man
    if (cell === 4) return false;

    // Wall (1): passable only if wall-pass bonus is active
    if (cell === 1) {
      return this.isWallPassActive;
    }

    return true;
  }

  onWallPassExpire() {
    const ts = CONFIG.TILE_SIZE;
    const tx = Math.floor(this.x / ts);
    const ty = Math.floor(this.y / ts);

    // If currently inside an internal wall, safely eject to nearest walkable corridor (Requirement 2.B)
    if (this.game.getMapCell(tx, ty) === 1) {
      const safeTile = this.findNearestSafeTile(tx, ty);
      if (safeTile) {
        this.x = (safeTile.x + 0.5) * ts;
        this.y = (safeTile.y + 0.5) * ts;
        this.currentDir = DIR.NONE;
        this.game.particles.emit(this.x, this.y, CONFIG.COLOR_WALLPASS_AURA, 20, 140);
        this.game.particles.addFloatingText(this.x, this.y, 'BEZPEČNÝ NÁVRAT', '#00f0ff');
      }
    }
  }

  findNearestSafeTile(startTx, startTy) {
    // BFS to find the closest walkable tile
    const queue = [{ x: startTx, y: startTy }];
    const visited = new Set();
    visited.add(`${startTx},${startTy}`);

    while (queue.length > 0) {
      const cur = queue.shift();
      const cell = this.game.getMapCell(cur.x, cur.y);

      if (cell !== 1 && cell !== 4 && cell !== 5) {
        return cur;
      }

      for (const d of [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT]) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        const key = `${nx},${ny}`;
        if (nx >= 1 && nx < CONFIG.COLS - 1 && ny >= 1 && ny < CONFIG.ROWS - 1) {
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
    return { x: 13, y: 23 }; // fallback
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotation based on direction
    let angle = 0;
    if (this.currentDir === DIR.RIGHT) angle = 0;
    else if (this.currentDir === DIR.DOWN) angle = Math.PI * 0.5;
    else if (this.currentDir === DIR.LEFT) angle = Math.PI;
    else if (this.currentDir === DIR.UP) angle = Math.PI * 1.5;
    ctx.rotate(angle);

    // Wall-Pass Aura (Requirement 2.B)
    if (this.isWallPassActive) {
      const isBlinking = this.wallPassTimer < 1.5;
      const flash = isBlinking ? (Math.floor(Date.now() / 100) % 2 === 0) : true;

      if (flash) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = CONFIG.COLOR_WALLPASS_AURA;
        ctx.lineWidth = 3;
        ctx.shadowColor = CONFIG.COLOR_WALLPASS_AURA;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Super Attack Aura (Requirement 2.D)
    if (this.isAttackActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = CONFIG.COLOR_ATTACK_AURA;
      ctx.lineWidth = 3;
      ctx.shadowColor = CONFIG.COLOR_ATTACK_AURA;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();
    }

    // Pac-Man Body (Blue-Black neon aesthetic: light glowing cyan)
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, this.mouthAngle * Math.PI, (2 - this.mouthAngle) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.fillStyle = this.isAttackActive ? '#fef08a' : CONFIG.COLOR_PACMAN;
    ctx.shadowColor = this.isAttackActive ? CONFIG.COLOR_ATTACK_AURA : CONFIG.COLOR_PACMAN_GLOW;
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();
  }
}

/* ==========================================================================
   6. GHOSTS (4 DISTINCT RETRO AI BEHAVIORS)
   ========================================================================== */

class Ghost {
  constructor(game, type, startTileX, startTileY, color, glowColor) {
    this.game = game;
    this.type = type; // 'chaser', 'ambusher', 'patrol', 'trickster'
    this.startTileX = startTileX;
    this.startTileY = startTileY;
    this.color = color;
    this.glowColor = glowColor;
    this.reset();
  }

  reset() {
    const ts = CONFIG.TILE_SIZE;
    this.tileX = this.startTileX;
    this.tileY = this.startTileY;
    this.x = (this.tileX + 0.5) * ts;
    this.y = (this.tileY + 0.5) * ts;
    this.radius = ts * 0.42;
    this.currentDir = DIR.UP;
    this.speed = CONFIG.GHOST_SPEED;
    this.inPen = true;
    this.leavePenTimer = Math.random() * 2 + 1; // Stagger exit
  }

  update(dt, pacman) {
    const ts = CONFIG.TILE_SIZE;

    // Handle leaving the ghost pen
    if (this.inPen) {
      this.leavePenTimer -= dt;
      if (this.leavePenTimer <= 0) {
        // Move towards pen exit (row 11, col 13.5)
        const exitX = 13.5 * ts;
        const exitY = 11.5 * ts;
        if (Math.abs(this.x - exitX) > 2) {
          this.x += Math.sign(exitX - this.x) * this.speed * 0.5 * dt;
        } else if (this.y > exitY) {
          this.y -= this.speed * 0.5 * dt;
        } else {
          this.inPen = false;
          this.currentDir = DIR.LEFT;
        }
      }
      return;
    }

    // Normal movement through maze
    const moveDist = this.speed * dt;
    const currTileX = Math.floor(this.x / ts);
    const currTileY = Math.floor(this.y / ts);
    const centerTileX = (currTileX + 0.5) * ts;
    const centerTileY = (currTileY + 0.5) * ts;

    // Movement along X axis
    if (this.currentDir.x !== 0) {
      this.y = centerTileY;
      const nextX = this.x + this.currentDir.x * moveDist;

      // Wrap tunnel at row 14
      if (currTileY === 14) {
        if (nextX < -ts * 0.5) { this.x = (CONFIG.COLS - 0.5) * ts; return; }
        else if (nextX > (CONFIG.COLS + 0.5) * ts) { this.x = -ts * 0.5; return; }
      }

      const crossedCenter = (this.currentDir.x > 0 && this.x <= centerTileX && nextX >= centerTileX) ||
                            (this.currentDir.x < 0 && this.x >= centerTileX && nextX <= centerTileX);

      if (crossedCenter) {
        const excess = Math.abs(nextX - centerTileX);
        this.x = centerTileX;
        this.chooseNextDirection(currTileX, currTileY, pacman);
        this.x += this.currentDir.x * excess;
        this.y += this.currentDir.y * excess;
      } else {
        this.x = nextX;
      }
    }
    // Movement along Y axis
    else if (this.currentDir.y !== 0) {
      this.x = centerTileX;
      const nextY = this.y + this.currentDir.y * moveDist;

      const crossedCenter = (this.currentDir.y > 0 && this.y <= centerTileY && nextY >= centerTileY) ||
                            (this.currentDir.y < 0 && this.y >= centerTileY && nextY <= centerTileY);

      if (crossedCenter) {
        const excess = Math.abs(nextY - centerTileY);
        this.y = centerTileY;
        this.chooseNextDirection(currTileX, currTileY, pacman);
        this.x += this.currentDir.x * excess;
        this.y += this.currentDir.y * excess;
      } else {
        this.y = nextY;
      }
    }

    this.tileX = Math.floor(this.x / ts);
    this.tileY = Math.floor(this.y / ts);
  }

  chooseNextDirection(tx, ty, pacman) {
    // Valid directions: cannot 180 reverse unless trapped
    const possibleDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT].filter(d => {
      // Don't reverse immediately
      if (d.x === -this.currentDir.x && d.y === -this.currentDir.y) return false;
      const nx = tx + d.x;
      const ny = ty + d.y;
      return this.canPass(nx, ny);
    });

    if (possibleDirs.length === 0) {
      // Reverse if dead end
      this.currentDir = { x: -this.currentDir.x, y: -this.currentDir.y };
      return;
    }

    // Determine target tile according to ghost AI personality
    let target = { x: pacman.tileX, y: pacman.tileY };

    if (this.type === 'ambusher') {
      // Targets 4 tiles ahead of Pac-Man's direction
      target = {
        x: pacman.tileX + pacman.currentDir.x * 4,
        y: pacman.tileY + pacman.currentDir.y * 4
      };
    } else if (this.type === 'patrol') {
      // Semi-random / corner patrol
      if (Math.random() < 0.35) {
        this.currentDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        return;
      }
      target = { x: 25, y: 1 };
    } else if (this.type === 'trickster') {
      // If distance > 8 tiles, chase; otherwise retreat to bottom corner
      const dist = Math.hypot(tx - pacman.tileX, ty - pacman.tileY);
      if (dist < 8) target = { x: 2, y: 29 };
    }

    // Choose direction that minimizes Euclidean distance to target
    let bestDir = possibleDirs[0];
    let bestDist = Infinity;

    for (const d of possibleDirs) {
      const nx = tx + d.x;
      const ny = ty + d.y;
      const dist = Math.hypot(nx - target.x, ny - target.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = d;
      }
    }

    this.currentDir = bestDir;
  }

  canPass(tx, ty) {
    if (tx < 0 || tx >= CONFIG.COLS || ty < 0 || ty >= CONFIG.ROWS) {
      if (ty === 14) return true; // Tunnel
      return false;
    }
    const cell = this.game.getMapCell(tx, ty);
    return cell !== 1 && cell !== 4; // cannot pass walls or closed gate
  }

  draw(ctx, pacman) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const r = this.radius;
    const isVulnerable = pacman.isAttackActive;

    // Body Color
    const fillColor = isVulnerable ? '#3b82f6' : this.color;
    const glow = isVulnerable ? 'rgba(59, 130, 246, 0.8)' : this.glowColor;

    ctx.fillStyle = fillColor;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;

    // Ghost body path (dome top, wavy skirt bottom)
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r, Math.PI, 0, false);
    ctx.lineTo(r, r);

    // 3 wavy tentacles
    const step = (r * 2) / 3;
    const time = Date.now() * 0.008;
    const wave = Math.sin(time) * 2;
    ctx.lineTo(r - step * 0.5, r - 3 + wave);
    ctx.lineTo(r - step, r);
    ctx.lineTo(r - step * 1.5, r - 3 - wave);
    ctx.lineTo(r - step * 2, r);
    ctx.lineTo(r - step * 2.5, r - 3 + wave);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.shadowBlur = 0;
    const eyeDx = this.currentDir.x * 2.5;
    const eyeDy = this.currentDir.y * 2.5;

    // Left eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.38, -r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.arc(r * 0.38, -r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = isVulnerable ? '#f87171' : '#020617';
    ctx.beginPath();
    ctx.arc(-r * 0.38 + eyeDx, -r * 0.3 + eyeDy, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.38 + eyeDx, -r * 0.3 + eyeDy, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* ==========================================================================
   7. BOSS ENTITY: "THE MAN" (Miloš Zeman / Menacing Boss)
   Requirement 2.D:
   - Spawns at 1,000 points
   - Larger animated sprite (zeman.png with neon aura frame)
   - Fast BFS pathfinding chase through maze
   - 3 HP, damaged by player with Attack Bonus
   - 500 points on defeat
   ========================================================================== */

class TheManBoss {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.hp = CONFIG.BOSS_MAX_HP;
    this.x = 0;
    this.y = 0;
    this.radius = CONFIG.TILE_SIZE * 0.95; // Larger: ~2x normal tile
    this.speed = CONFIG.BOSS_SPEED;
    this.hitStunTimer = 0;
    this.pathTimer = 0;
    this.currentPath = [];
    this.pulseAngle = 0;

    // Load Zeman portrait
    this.img = new Image();
    this.img.src = 'zeman.png';
    this.imgLoaded = false;
    this.img.onload = () => { this.imgLoaded = true; };
  }

  spawn() {
    this.active = true;
    this.hp = CONFIG.BOSS_MAX_HP;
    // Spawn at top center corridor
    const ts = CONFIG.TILE_SIZE;
    this.x = 13.5 * ts;
    this.y = 11.5 * ts;
    this.hitStunTimer = 0;
    this.currentPath = [];
    this.pathTimer = 0;

    this.game.sound.playBossAlarm();
    this.game.showBanner('⚠️ THE MAN IS COMING! ⚠️', 2600);
    this.game.updateBossHpUI();
  }

  takeDamage(pacman) {
    if (this.hitStunTimer > 0) return;
    this.hp--;
    this.hitStunTimer = 0.6; // Brief hit stun & invulnerability

    // Knockback boss away from Pac-Man to prevent immediate re-collision
    if (pacman) {
      const dx = this.x - pacman.x;
      const dy = this.y - pacman.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.x += (dx / dist) * (CONFIG.TILE_SIZE * 2);
      this.y += (dy / dist) * (CONFIG.TILE_SIZE * 2);
      this.currentPath = [];
    }

    this.game.sound.playBossHit();
    this.game.particles.emit(this.x, this.y, '#ef4444', 35, 220);
    this.game.particles.addFloatingText(this.x, this.y - 20, 'ZÁSAH! -1 HP', '#ef4444');
    this.game.updateBossHpUI();

    if (this.hp <= 0) {
      this.defeat();
    }
  }

  defeat() {
    this.active = false;
    this.game.sound.playBossDefeated();
    this.game.addScore(CONFIG.POINTS_DEFEAT_BOSS);
    this.game.particles.emit(this.x, this.y, '#fbbf24', 60, 260);
    this.game.particles.emit(this.x, this.y, '#ef4444', 40, 220);
    this.game.showBanner('THE MAN PORAŽEN! +500 BODŮ', 3200);
    this.game.updateBossHpUI();
  }

  update(dt, pacman) {
    if (!this.active) return;

    this.pulseAngle += dt * 6;

    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt;
      return;
    }

    const ts = CONFIG.TILE_SIZE;
    this.pathTimer -= dt;

    // Recalculate BFS shortest path every 0.25s
    if (this.pathTimer <= 0) {
      this.pathTimer = 0.25;
      const startTx = Math.floor(this.x / ts);
      const startTy = Math.floor(this.y / ts);
      const goalTx = Math.floor(pacman.x / ts);
      const goalTy = Math.floor(pacman.y / ts);
      this.currentPath = this.findBfsPath(startTx, startTy, goalTx, goalTy);
    }

    // Follow BFS path
    if (this.currentPath.length > 0) {
      const nextTile = this.currentPath[0];
      const targetX = (nextTile.x + 0.5) * ts;
      const targetY = (nextTile.y + 0.5) * ts;

      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * dt;

      if (dist <= step) {
        this.x = targetX;
        this.y = targetY;
        this.currentPath.shift();
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
    }
  }

  findBfsPath(startTx, startTy, goalTx, goalTy) {
    if (startTx === goalTx && startTy === goalTy) return [];

    const queue = [{ x: startTx, y: startTy, path: [] }];
    const visited = new Set();
    visited.add(`${startTx},${startTy}`);

    while (queue.length > 0) {
      const cur = queue.shift();

      if (cur.x === goalTx && cur.y === goalTy) {
        return cur.path;
      }

      // 4 directions
      for (const d of [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT]) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        const key = `${nx},${ny}`;

        if (nx >= 0 && nx < CONFIG.COLS && ny >= 0 && ny < CONFIG.ROWS) {
          if (!visited.has(key)) {
            const cell = this.game.getMapCell(nx, ny);
            // The Man can traverse corridors and ghost gate
            if (cell !== 1) {
              visited.add(key);
              queue.push({
                x: nx,
                y: ny,
                path: [...cur.path, { x: nx, y: ny }]
              });
            }
          }
        }
      }
    }
    return [];
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const isFlashing = this.hitStunTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0;

    // Glowing Neon Boss Aura
    const pulse = Math.sin(this.pulseAngle) * 4;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = isFlashing ? 'rgba(255, 255, 255, 0.8)' : 'rgba(239, 68, 68, 0.25)';
    ctx.strokeStyle = isFlashing ? '#ffffff' : CONFIG.COLOR_BOSS_AURA;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.stroke();

    // Render zeman.png if loaded, else high-tech cyber boss circle
    if (this.imgLoaded && this.img.width > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    } else {
      // Vector fallback
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#7f1d1d';
      ctx.fill();

      // Menacing Face
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-8, -4, 4, 0, Math.PI * 2);
      ctx.arc(8, -4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 8, 8, Math.PI, 0, false);
      ctx.stroke();
    }

    // Mini Boss Crown / Health Indicator on top
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 6;
    ctx.fillText(`MAN [${this.hp}]`, 0, -this.radius - 8);

    ctx.restore();
  }
}

/* ==========================================================================
   8. MAIN GAME CONTROLLER & ENGINE
   ========================================================================== */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundEngine();
    this.particles = new ParticleSystem();

    // DOM Elements
    this.scoreDisplay = document.getElementById('scoreDisplay');
    this.highScoreDisplay = document.getElementById('highScoreDisplay');
    this.levelDisplay = document.getElementById('levelDisplay');
    this.speedDisplay = document.getElementById('speedDisplay');
    this.livesContainer = document.getElementById('livesContainer');
    this.wallPassBadge = document.getElementById('wallPassBadge');
    this.wallPassMeter = document.getElementById('wallPassMeter');
    this.wallPassTimerText = document.getElementById('wallPassTimerText');
    this.attackBadge = document.getElementById('attackBadge');
    this.attackMeter = document.getElementById('attackMeter');
    this.attackTimerText = document.getElementById('attackTimerText');
    this.bossBarContainer = document.getElementById('bossBarContainer');
    this.bossHpFill = document.getElementById('bossHpFill');
    this.bossHpText = document.getElementById('bossHpText');
    this.bannerOverlay = document.getElementById('bannerOverlay');
    this.bannerText = document.getElementById('bannerText');

    // Modals
    this.startModal = document.getElementById('startModal');
    this.pauseModal = document.getElementById('pauseModal');
    this.gameOverModal = document.getElementById('gameOverModal');
    this.levelClearModal = document.getElementById('levelClearModal');
    this.finalScore = document.getElementById('finalScore');
    this.finalLevel = document.getElementById('finalLevel');
    this.newHighScoreAlert = document.getElementById('newHighScoreAlert');

    // Game state
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman_high_score') || '0', 10);
    this.level = 1;
    this.lives = 3;
    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER', 'LEVELCLEAR'
    this.lastTime = 0;
    this.bannerTimeout = null;

    // Entities
    this.pacman = new Pacman(this);
    this.boss = new TheManBoss(this);
    this.bossHasSpawnedThisRun = false;

    // Bonuses on the map
    this.wallPassBonus = null; // { x, y, tileX, tileY, timer }
    this.attackBonus = null;   // { x, y, tileX, tileY, timer }
    this.bonusSpawnTimer = 15; // Periodic wall pass bonus spawn

    // Ghosts
    this.ghosts = [
      new Ghost(this, 'chaser', 13, 14, '#ef4444', 'rgba(239, 68, 68, 0.8)'), // Blinky
      new Ghost(this, 'ambusher', 14, 14, '#ec4899', 'rgba(236, 72, 153, 0.8)'), // Pinky
      new Ghost(this, 'patrol', 12, 14, '#06b6d4', 'rgba(6, 182, 212, 0.8)'), // Inky
      new Ghost(this, 'trickster', 15, 14, '#8b5cf6', 'rgba(139, 92, 246, 0.8)') // Clyde
    ];

    // Build map
    this.map = [];
    this.totalDots = 0;
    this.dotsRemaining = 0;
    this.loadLevel(this.level);

    // Event listeners
    this.initControls();
    this.updateHUD();

    // Start render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  loadLevel(levelNum) {
    this.map = MAZE_TEMPLATE.map(row => [...row]);
    this.totalDots = 0;

    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        if (this.map[r][c] === 2) {
          this.totalDots++;
        }
      }
    }
    this.dotsRemaining = this.totalDots;
    this.pacman.reset();
    this.ghosts.forEach(g => g.reset());
    this.wallPassBonus = null;
    this.attackBonus = null;
    this.bonusSpawnTimer = 10;

    // Cache pre-rendered maze with neon glow onto offscreen canvas for 60/120 FPS
    this.initMazeCanvas();

    // Pre-place a Wall-Pass Bonus on the map
    this.spawnWallPassBonus(1, 6);
    this.spawnWallPassBonus(26, 6);
  }

  initMazeCanvas() {
    if (!this.mazeCanvas) {
      this.mazeCanvas = document.createElement('canvas');
      this.mazeCanvas.width = this.canvas.width;
      this.mazeCanvas.height = this.canvas.height;
    }
    const mctx = this.mazeCanvas.getContext('2d');
    const ts = CONFIG.TILE_SIZE;

    // Clear and draw background
    mctx.fillStyle = '#030712';
    mctx.fillRect(0, 0, this.mazeCanvas.width, this.mazeCanvas.height);

    // Draw walls with neon glow once onto offscreen buffer
    mctx.save();
    mctx.strokeStyle = CONFIG.COLOR_WALL;
    mctx.shadowColor = CONFIG.COLOR_WALL_GLOW;
    mctx.shadowBlur = 8;
    mctx.lineWidth = 2.5;

    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const cell = MAZE_TEMPLATE[r][c];
        if (cell === 1) {
          const x = c * ts;
          const y = r * ts;
          mctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
        } else if (cell === 4) {
          mctx.save();
          mctx.strokeStyle = '#f43f5e';
          mctx.shadowColor = '#f43f5e';
          mctx.shadowBlur = 6;
          mctx.lineWidth = 3;
          mctx.beginPath();
          mctx.moveTo(c * ts, (r + 0.5) * ts);
          mctx.lineTo((c + 1) * ts, (r + 0.5) * ts);
          mctx.stroke();
          mctx.restore();
        }
      }
    }
    mctx.restore();
  }

  getMapCell(tx, ty) {
    if (tx < 0 || tx >= CONFIG.COLS || ty < 0 || ty >= CONFIG.ROWS) return 1;
    return this.map[ty][tx];
  }

  setMapCell(tx, ty, val) {
    if (tx >= 0 && tx < CONFIG.COLS && ty >= 0 && ty < CONFIG.ROWS) {
      this.map[ty][tx] = val;
    }
  }

  getCurrentSpeedMultiplier() {
    let mult = 1.0;
    for (const tier of CONFIG.SPEED_TIERS) {
      if (this.score >= tier.minScore) {
        mult = tier.multiplier;
      }
    }
    return mult;
  }

  getCurrentSpeedLabel() {
    let lbl = '100%';
    for (const tier of CONFIG.SPEED_TIERS) {
      if (this.score >= tier.minScore) {
        lbl = tier.label;
      }
    }
    return lbl;
  }

  addScore(pts) {
    const prevScore = this.score;
    this.score += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pacman_high_score', this.highScore);
    }
    this.updateHUD();

    // Check Boss Spawn trigger (Requirement 2.D)
    if (prevScore < CONFIG.BOSS_SCORE_THRESHOLD && this.score >= CONFIG.BOSS_SCORE_THRESHOLD && !this.boss.active && !this.bossHasSpawnedThisRun) {
      this.bossHasSpawnedThisRun = true;
      this.boss.spawn();
      this.spawnAttackBonus();
    }
  }

  spawnWallPassBonus(preferTx, preferTy) {
    const ts = CONFIG.TILE_SIZE;
    let tx = preferTx;
    let ty = preferTy;

    if (tx === undefined || ty === undefined) {
      // Find open corridor tile
      const validTiles = [];
      for (let r = 1; r < CONFIG.ROWS - 1; r++) {
        for (let c = 1; c < CONFIG.COLS - 1; c++) {
          if (this.map[r][c] === 0 || this.map[r][c] === 2) {
            validTiles.push({ x: c, y: r });
          }
        }
      }
      if (validTiles.length > 0) {
        const rand = validTiles[Math.floor(Math.random() * validTiles.length)];
        tx = rand.x;
        ty = rand.y;
      } else {
        tx = 13;
        ty = 23;
      }
    }

    this.wallPassBonus = {
      tileX: tx,
      tileY: ty,
      x: (tx + 0.5) * ts,
      y: (ty + 0.5) * ts,
      timer: 20 // Stays on map for 20s
    };
  }

  spawnAttackBonus() {
    const ts = CONFIG.TILE_SIZE;
    // Spawn near bottom or middle corridor
    const attackSpots = [
      { x: 1, y: 23 },
      { x: 26, y: 23 },
      { x: 13, y: 8 },
      { x: 6, y: 14 },
      { x: 21, y: 14 }
    ];
    const reachableSpots = attackSpots.filter(spot => this.pacman.canMoveToTile(spot.x, spot.y));
    const spot = reachableSpots[Math.floor(Math.random() * reachableSpots.length)];
    this.attackBonus = {
      tileX: spot.x,
      tileY: spot.y,
      x: (spot.x + 0.5) * ts,
      y: (spot.y + 0.5) * ts,
      timer: 25
    };
  }

  showBanner(msg, duration = 2000) {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerText.textContent = msg;
    this.bannerOverlay.classList.remove('hidden');
    this.bannerTimeout = setTimeout(() => {
      this.bannerOverlay.classList.add('hidden');
    }, duration);
  }

  updateHUD() {
    this.scoreDisplay.textContent = this.score;
    this.highScoreDisplay.textContent = this.highScore;
    this.levelDisplay.textContent = this.level;
    this.speedDisplay.textContent = this.getCurrentSpeedLabel();

    // Render mini life icons
    this.livesContainer.innerHTML = '';
    for (let i = 0; i < this.lives; i++) {
      const lifeIcon = document.createElement('div');
      lifeIcon.className = 'life-icon';
      this.livesContainer.appendChild(lifeIcon);
    }
  }

  updateBonusUI() {
    // Wall-Pass status badge (Requirement 2.B)
    if (this.pacman.isWallPassActive) {
      this.wallPassBadge.classList.remove('hidden');
      const ratio = Math.max(0, this.pacman.wallPassTimer / CONFIG.WALL_PASS_DURATION);
      this.wallPassMeter.style.width = `${ratio * 100}%`;
      this.wallPassTimerText.textContent = `${this.pacman.wallPassTimer.toFixed(1)}s`;
    } else {
      this.wallPassBadge.classList.add('hidden');
    }

    // Boss Attack status badge
    if (this.pacman.isAttackActive) {
      this.attackBadge.classList.remove('hidden');
      const ratio = Math.max(0, this.pacman.attackBonusTimer / CONFIG.ATTACK_BONUS_DURATION);
      this.attackMeter.style.width = `${ratio * 100}%`;
      this.attackTimerText.textContent = `${this.pacman.attackBonusTimer.toFixed(1)}s`;
    } else {
      this.attackBadge.classList.add('hidden');
    }
  }

  updateBossHpUI() {
    if (this.boss.active) {
      this.bossBarContainer.classList.remove('hidden');
      const ratio = Math.max(0, this.boss.hp / CONFIG.BOSS_MAX_HP);
      this.bossHpFill.style.width = `${ratio * 100}%`;
      this.bossHpText.textContent = `HP: ${this.boss.hp} / ${CONFIG.BOSS_MAX_HP}`;
    } else {
      this.bossBarContainer.classList.add('hidden');
    }
  }

  onPlayerHit() {
    this.lives--;
    this.sound.playDeath();
    this.particles.emit(this.pacman.x, this.pacman.y, CONFIG.COLOR_PACMAN, 35, 180);
    this.updateHUD();

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.showBanner('ZTRÁTA ŽIVOTA!', 1400);
      this.pacman.reset();
      this.ghosts.forEach(g => g.reset());
      if (this.boss.active) {
        this.boss.x = 13.5 * CONFIG.TILE_SIZE;
        this.boss.y = 11.5 * CONFIG.TILE_SIZE;
      }
    }
  }

  levelClear() {
    this.state = 'LEVELCLEAR';
    this.sound.playLevelClear();
    this.addScore(CONFIG.POINTS_LEVEL_CLEAR);
    this.particles.emit(this.pacman.x, this.pacman.y, '#fbbf24', 50, 240);
    this.levelClearModal.classList.remove('hidden');
  }

  nextLevel() {
    this.level++;
    this.levelClearModal.classList.add('hidden');
    this.loadLevel(this.level);
    this.state = 'PLAYING';
    this.showBanner(`LEVEL ${this.level}`, 1500);
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.finalScore.textContent = this.score;
    this.finalLevel.textContent = this.level;

    if (this.score >= this.highScore && this.score > 0) {
      this.newHighScoreAlert.classList.remove('hidden');
    } else {
      this.newHighScoreAlert.classList.add('hidden');
    }
    this.gameOverModal.classList.remove('hidden');
  }

  restart() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.bossHasSpawnedThisRun = false;
    this.boss.active = false;
    this.updateBossHpUI();
    this.loadLevel(this.level);
    this.updateHUD();
    this.gameOverModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.state = 'PLAYING';
    this.showBanner('HRÁT!', 1000);
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.pauseModal.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.pauseModal.classList.add('hidden');
    }
  }

  initControls() {
    // Keyboard controls (Arrows & WASD)
    window.addEventListener('keydown', (e) => {
      this.sound.init();

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          this.togglePause();
          return;
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        const isMuted = this.sound.toggleMute();
        document.getElementById('muteBtn').textContent = isMuted ? '🔇' : '🔊';
        return;
      }

      if (this.state === 'START') {
        const startKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd', 'W', 'S', 'A', 'D', 'Enter', ' '];
        if (startKeys.includes(e.key) || ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'Enter'].includes(e.code)) {
          this.sound.init();
          this.startModal.classList.add('hidden');
          this.state = 'PLAYING';
          this.showBanner('START!', 1200);
        }
      }

      if (this.state !== 'PLAYING') return;

      const code = e.code;
      const key = e.key;

      if (key === 'ArrowUp' || key === 'w' || key === 'W' || code === 'KeyW' || code === 'ArrowUp') {
        this.pacman.desiredDir = DIR.UP;
        e.preventDefault();
      } else if (key === 'ArrowDown' || key === 's' || key === 'S' || code === 'KeyS' || code === 'ArrowDown') {
        this.pacman.desiredDir = DIR.DOWN;
        e.preventDefault();
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A' || code === 'KeyA' || code === 'ArrowLeft') {
        this.pacman.desiredDir = DIR.LEFT;
        e.preventDefault();
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D' || code === 'KeyD' || code === 'ArrowRight') {
        this.pacman.desiredDir = DIR.RIGHT;
        e.preventDefault();
      }
    });

    // ==========================================
    // MOBILE SWIPE GESTURE CONTROLS
    // ==========================================
    let touchStartX = 0;
    let touchStartY = 0;

    const onTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

      }
    };

    const onTouchMove = (e) => {
      if (this.state !== 'PLAYING' || !e.touches || e.touches.length === 0) return;
      e.preventDefault(); // Disable browser scroll/pull-down reload

      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const dx = curX - touchStartX;
      const dy = curY - touchStartY;
      const dist = Math.hypot(dx, dy);

      // Trigger direction steering after 16px swipe
      if (dist >= 16) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.pacman.desiredDir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
        } else {
          this.pacman.desiredDir = dy > 0 ? DIR.DOWN : DIR.UP;
        }

        if (navigator.vibrate) navigator.vibrate(10);

        // Reset anchor to current point for smooth continuous steering
        touchStartX = curX;
        touchStartY = curY;
      }
    };

    const canvasWrapper = document.getElementById('canvasWrapper');
    if (canvasWrapper) {
      canvasWrapper.addEventListener('touchstart', onTouchStart, { passive: false });
      canvasWrapper.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    // ==========================================
    // VIRTUAL ON-SCREEN D-PAD BUTTONS
    // ==========================================
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(btn => {
      const handlePress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sound.init();

        if (this.state === 'START') {
          this.startModal.classList.add('hidden');
          this.state = 'PLAYING';
          this.showBanner('START!', 1200);
        }

        if (this.state !== 'PLAYING') return;
        const dirName = btn.dataset.dir;
        if (dirName === 'up') this.pacman.desiredDir = DIR.UP;
        if (dirName === 'down') this.pacman.desiredDir = DIR.DOWN;
        if (dirName === 'left') this.pacman.desiredDir = DIR.LEFT;
        if (dirName === 'right') this.pacman.desiredDir = DIR.RIGHT;

        btn.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(15);
      };

      const handleRelease = (e) => {
        btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('mousedown', handlePress);
      btn.addEventListener('mouseup', handleRelease);
      btn.addEventListener('mouseleave', handleRelease);
    });

    // ==========================================
    // HUD ACTION BUTTONS (TOGGLES & AUDIO)
    // ==========================================
    const touchControls = document.getElementById('touchControls');
    const dpadToggleBtn = document.getElementById('dpadToggleBtn');
    if (dpadToggleBtn && touchControls) {
      dpadToggleBtn.addEventListener('click', () => {
        touchControls.classList.toggle('hidden');
        const isHidden = touchControls.classList.contains('hidden');
        dpadToggleBtn.style.opacity = isHidden ? '0.45' : '1.0';
      });
    }

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    document.getElementById('startBtn').addEventListener('click', () => {
      this.sound.init();
      this.startModal.classList.add('hidden');
      this.state = 'PLAYING';
      this.showBanner('START!', 1200);
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('resumeBtn').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('restartBtn').addEventListener('click', () => {
      this.restart();
    });

    document.getElementById('nextLevelBtn').addEventListener('click', () => {
      this.nextLevel();
    });

    document.getElementById('muteBtn').addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      document.getElementById('muteBtn').textContent = isMuted ? '🔇' : '🔊';
    });
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    // Cap dt at 40ms (equivalent to min 25fps) to prevent movement spikes/teleports
    const dt = Math.min(rawDt, 0.04);

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const ts = CONFIG.TILE_SIZE;

    // Update Pac-Man
    this.pacman.update(dt);

    // Update Ghosts
    this.ghosts.forEach(g => g.update(dt, this.pacman));

    // Update Boss
    if (this.boss.active) {
      this.boss.update(dt, this.pacman);

      // Periodically spawn Attack Bonus with brief interval if none is active
      if (!this.attackBonus && !this.pacman.isAttackActive) {
        if (!this.attackBonusCooldown) this.attackBonusCooldown = 0;
        this.attackBonusCooldown -= dt;
        if (this.attackBonusCooldown <= 0) {
          this.spawnAttackBonus();
          this.attackBonusCooldown = 3.5;
        }
      }
    }

    // Update Bonuses on map
    if (this.wallPassBonus) {
      this.wallPassBonus.timer -= dt;
      if (this.wallPassBonus.timer <= 0) this.wallPassBonus = null;
    } else {
      this.bonusSpawnTimer -= dt;
      if (this.bonusSpawnTimer <= 0) {
        this.spawnWallPassBonus();
        this.bonusSpawnTimer = 22;
      }
    }

    if (this.attackBonus) {
      this.attackBonus.timer -= dt;
      if (this.attackBonus.timer <= 0) this.attackBonus = null;
    }

    // Check Collisions: Pac-Man with Dots
    const pTileX = Math.floor(this.pacman.x / ts);
    const pTileY = Math.floor(this.pacman.y / ts);

    if (this.getMapCell(pTileX, pTileY) === 2) {
      this.setMapCell(pTileX, pTileY, 0);
      this.dotsRemaining--;
      this.addScore(CONFIG.POINTS_DOT);
      this.sound.playWaka();

      if (this.dotsRemaining <= 0) {
        this.levelClear();
        return;
      }
    }

    // Check Collisions: Pac-Man with Wall-Pass Bonus
    if (this.wallPassBonus) {
      const dist = Math.hypot(this.pacman.x - this.wallPassBonus.x, this.pacman.y - this.wallPassBonus.y);
      if (dist < this.pacman.radius + 8) {
        this.sound.playPowerup();
        this.addScore(CONFIG.POINTS_WALL_PASS);
        this.pacman.activateWallPass(CONFIG.WALL_PASS_DURATION);
        this.particles.emit(this.wallPassBonus.x, this.wallPassBonus.y, CONFIG.COLOR_WALLPASS_AURA, 25, 160);
        this.particles.addFloatingText(this.wallPassBonus.x, this.wallPassBonus.y, 'PRŮCHOD ZDÍ! +50', '#00f0ff');
        this.wallPassBonus = null;
      }
    }

    // Check Collisions: Pac-Man with Boss Attack Bonus
    if (this.attackBonus) {
      const dist = Math.hypot(this.pacman.x - this.attackBonus.x, this.pacman.y - this.attackBonus.y);
      if (dist < this.pacman.radius + 8) {
        this.sound.playPowerup();
        this.addScore(CONFIG.POINTS_ATTACK_BONUS);
        this.pacman.activateAttackBonus(CONFIG.ATTACK_BONUS_DURATION);
        this.particles.emit(this.attackBonus.x, this.attackBonus.y, CONFIG.COLOR_ATTACK_AURA, 25, 160);
        this.particles.addFloatingText(this.attackBonus.x, this.attackBonus.y, 'SUPER ÚTOK! +50', '#f59e0b');
        this.attackBonus = null;
        this.attackBonusCooldown = 3.5;
      }
    }

    // Check Collisions: Pac-Man with Boss (The Man)
    if (this.boss.active) {
      const dist = Math.hypot(this.pacman.x - this.boss.x, this.pacman.y - this.boss.y);
      if (dist < this.pacman.radius + this.boss.radius * 0.7) {
        if (this.pacman.isAttackActive) {
          // Attack the Boss!
          this.boss.takeDamage(this.pacman);
        } else {
          // Boss touches unarmed Pac-Man
          this.onPlayerHit();
          return;
        }
      }
    }

    // Check Collisions: Pac-Man with Ghosts
    for (const ghost of this.ghosts) {
      if (ghost.inPen) continue;
      const dist = Math.hypot(this.pacman.x - ghost.x, this.pacman.y - ghost.y);
      if (dist < this.pacman.radius + ghost.radius * 0.8) {
        if (this.pacman.isAttackActive) {
          // Eat Ghost while empowered
          this.sound.playBossHit();
          this.addScore(CONFIG.POINTS_EAT_GHOST);
          this.particles.emit(ghost.x, ghost.y, ghost.color, 25, 160);
          this.particles.addFloatingText(ghost.x, ghost.y, `+${CONFIG.POINTS_EAT_GHOST}`, '#38bdf8');
          ghost.reset();
        } else {
          this.onPlayerHit();
          return;
        }
      }
    }

    // Update Particles & UI meters
    this.particles.update(dt);
    this.updateBonusUI();
  }

  render() {
    const ctx = this.ctx;
    const ts = CONFIG.TILE_SIZE;

    // Clear Screen (Cyberpunk deep black)
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Maze Walls (Neon Blue Glow - Requirement 2.C)
    this.drawMaze(ctx);

    // Draw Dots
    this.drawDots(ctx);

    // Draw Collectible Bonuses
    this.drawBonuses(ctx);

    // Draw Pac-Man
    this.pacman.draw(ctx);

    // Draw Ghosts
    this.ghosts.forEach(g => g.draw(ctx, this.pacman));

    // Draw Boss (The Man)
    if (this.boss.active) {
      this.boss.draw(ctx);
    }

    // Draw Particles & Floating text
    this.particles.draw(ctx);
  }

  drawMaze(ctx) {
    if (this.mazeCanvas) {
      ctx.drawImage(this.mazeCanvas, 0, 0);
    }
  }

  drawDots(ctx) {
    const ts = CONFIG.TILE_SIZE;
    ctx.save();
    ctx.fillStyle = CONFIG.COLOR_DOT;
    ctx.beginPath();

    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        if (this.map[r][c] === 2) {
          const cx = (c + 0.5) * ts;
          const cy = (r + 0.5) * ts;
          ctx.moveTo(cx + 2.8, cy);
          ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  drawBonuses(ctx) {
    const time = Date.now() * 0.005;

    // 1. Wall-Pass Bonus (Glowing cyan orb with orbiting ring)
    if (this.wallPassBonus) {
      const b = this.wallPassBonus;
      ctx.save();
      ctx.translate(b.x, b.y);

      // Pulse
      const scale = 1 + Math.sin(time * 3) * 0.15;
      ctx.scale(scale, scale);

      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.COLOR_WALLPASS_AURA;
      ctx.shadowColor = CONFIG.COLOR_WALLPASS_AURA;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Rotating sci-fi ring
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 4, time * 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }

    // 2. Boss Attack Bonus (Becherovka / Energy Flask 🥃/⚡)
    if (this.attackBonus) {
      const ab = this.attackBonus;
      ctx.save();
      ctx.translate(ab.x, ab.y);

      const pulse = 1 + Math.sin(time * 4) * 0.18;
      ctx.scale(pulse, pulse);

      // Gold-orange glowing flask
      ctx.fillStyle = CONFIG.COLOR_ATTACK_AURA;
      ctx.shadowColor = CONFIG.COLOR_ATTACK_AURA;
      ctx.shadowBlur = 14;

      // Bottle silhouette
      ctx.fillRect(-4, -6, 8, 12);
      ctx.fillRect(-2, -9, 4, 3);

      // Lightning symbol on bottle
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 0);

      ctx.restore();
    }
  }
}

/* ==========================================================================
   9. INITIALIZATION
   ========================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
