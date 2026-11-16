// Prism Drift's rules: a prism-ship flies a neon nebula, absorbs light orbs
// that match its colour, and dodges asteroids and wrong-coloured orbs. Matching
// orbs build a combo and a score multiplier; a wrong orb or an asteroid costs a
// heart. Waves rise every 25 seconds; power-ups (shield, slow, nova) drop
// rarely. Three hearts gone is game over.
import { ASTEROID, COLORS, FIELD, ORB, RULES, SHIP } from './config.js';
import { createParticles } from './particles.js';

export const EVENT_COLLECT = 1;
export const EVENT_WRONG = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_WAVE = 16;
export const EVENT_POWERUP = 32;

const POWERUP_KINDS = ['shield', 'slow', 'nova'];

export function createWorld(random) {
  const particles = createParticles();
  const state = {
    ship: { x: SHIP.startX, y: SHIP.startY, vx: 0, vy: 0, color: 0, tilt: 0 },
    orbs: [],
    asteroids: [],
    powerups: [],
    particles,
    score: 0,
    combo: 0,
    topCombo: 0,
    multiplier: 1,
    lives: RULES.lives,
    wave: 1,
    time: 0,
    slowUntil: 0,
    invulnerableUntil: 0,
    shake: 0,
    flash: 0,
    banner: null,
    over: false,
  };
  let spawnTimer = 0.4;
  let powerupTimer = RULES.powerupEverySeconds;
  let demoDrift = 0;

  function multiplierFor(combo) {
    return Math.min(RULES.maxMultiplier, 1 + Math.floor(combo / RULES.comboStep));
  }

  function spawnOrb() {
    const wave = state.wave;
    state.orbs.push({
      x: random.range(40, FIELD.width - 40),
      y: -30,
      baseX: 0,
      vy: (ORB.baseSpeed + wave * ORB.speedPerWave) * random.range(0.85, 1.2),
      swayPhase: random.range(0, Math.PI * 2),
      swaySpeed: random.range(0.6, 1.4),
      color: Math.floor(random.next() * COLORS.length),
      radius: ORB.radius,
      spin: random.range(-1.5, 1.5),
      angle: 0,
    });
    const orb = state.orbs[state.orbs.length - 1];
    orb.baseX = orb.x;
  }

  function spawnAsteroid() {
    const radius = random.range(ASTEROID.minRadius, ASTEROID.maxRadius);
    const points = [];
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      points.push({ angle, r: radius * random.range(0.75, 1.15) });
    }
    state.asteroids.push({
      x: random.range(50, FIELD.width - 50),
      y: -50,
      vy: (ASTEROID.baseSpeed + state.wave * ASTEROID.speedPerWave) * random.range(0.9, 1.25),
      vx: random.range(-25, 25),
      radius,
      points,
      rotation: random.range(0, Math.PI * 2),
      spin: random.range(-1.2, 1.2),
    });
  }

  function spawnPowerup() {
    state.powerups.push({
      x: random.range(60, FIELD.width - 60),
      y: -30,
      vy: 85,
      kind: POWERUP_KINDS[Math.floor(random.next() * POWERUP_KINDS.length)],
      radius: 18,
      phase: 0,
    });
  }

  function spawnOne() {
    if (random.chance(Math.min(0.55, RULES.asteroidChance + state.wave * RULES.asteroidChancePerWave))) spawnAsteroid();
    else spawnOrb();
  }

  function loseHeart(events) {
    state.lives -= 1;
    state.combo = 0;
    state.multiplier = 1;
    // A second of grace after every hit, so one mistake never chains into two.
    state.invulnerableUntil = state.time + 1.2;
    state.shake = RULES.shakeOnHit;
    state.flash = 0.35;
    particles.burst(state.ship.x, state.ship.y, '#ff4d5e', 26, 320);
    if (state.lives <= 0) {
      state.over = true;
      return events | EVENT_OVER;
    }
    return events;
  }

  function collectOrb(orb, index) {
    state.orbs.splice(index, 1);
    state.combo += 1;
    state.topCombo = Math.max(state.topCombo, state.combo);
    state.multiplier = multiplierFor(state.combo);
    const points = RULES.basePoints * state.multiplier;
    state.score += points;
    const color = COLORS[orb.color];
    particles.burst(orb.x, orb.y, color.main, 16, 260);
    particles.popup(orb.x, orb.y - 10, `+${points}`, color.glow);
    return EVENT_COLLECT;
  }

  function applyPowerup(powerup) {
    if (powerup.kind === 'shield') {
      state.lives = Math.min(RULES.maxLives, state.lives + 1);
      particles.popup(state.ship.x, state.ship.y - 30, '+1 HEART', '#7dff9b');
    } else if (powerup.kind === 'slow') {
      state.slowUntil = state.time + RULES.slowSeconds;
      particles.popup(state.ship.x, state.ship.y - 30, 'SLOW TIME', '#8fb7ff');
    } else {
      let cleared = 0;
      for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
        const rock = state.asteroids[i];
        particles.burst(rock.x, rock.y, '#ffe95d', 12, 240);
        state.asteroids.splice(i, 1);
        cleared += 1;
      }
      for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
        if (state.orbs[i].color !== state.ship.color) {
          particles.burst(state.orbs[i].x, state.orbs[i].y, '#ffe95d', 8, 200);
          state.orbs.splice(i, 1);
          cleared += 1;
        }
      }
      state.score += cleared * 5;
      particles.popup(state.ship.x, state.ship.y - 30, `NOVA +${cleared * 5}`, '#ffe95d');
    }
    particles.burst(state.ship.x, state.ship.y, '#ffffff', 22, 280);
    return EVENT_POWERUP;
  }

  function moveShip(dt, steering) {
    const ship = state.ship;
    const slow = state.time < state.slowUntil ? RULES.slowFactor : 1;
    if (steering.mouse) {
      const dx = steering.mouse.x - ship.x;
      const dy = steering.mouse.y - ship.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        const speed = Math.min(SHIP.maxSpeed, distance * 6) * slow;
        ship.vx = (dx / distance) * speed;
        ship.vy = (dy / distance) * speed;
      } else {
        ship.vx *= 1 - 8 * dt;
        ship.vy *= 1 - 8 * dt;
      }
    } else {
      ship.vx += steering.x * SHIP.accel * dt * slow;
      ship.vy += steering.y * SHIP.accel * dt * slow;
      const drag = Math.exp(-SHIP.drag * dt);
      ship.vx *= drag;
      ship.vy *= drag;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > SHIP.maxSpeed) {
        ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
        ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
      }
    }
    ship.x = Math.min(FIELD.width - SHIP.radius, Math.max(SHIP.radius, ship.x + ship.vx * dt));
    ship.y = Math.min(FIELD.height - SHIP.radius, Math.max(SHIP.radius, ship.y + ship.vy * dt));
    ship.tilt += ((ship.vx / SHIP.maxSpeed) * 0.45 - ship.tilt) * Math.min(1, 10 * dt);
    if (Math.hypot(ship.vx, ship.vy) > 120 && Math.random() < 0.6) {
      particles.trail(ship.x, ship.y + 16, COLORS[ship.color].main);
    }
  }

  function reset() {
    state.ship.x = SHIP.startX;
    state.ship.y = SHIP.startY;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.color = 0;
    state.ship.tilt = 0;
    state.orbs.length = 0;
    state.asteroids.length = 0;
    state.powerups.length = 0;
    state.score = 0;
    state.combo = 0;
    state.topCombo = 0;
    state.multiplier = 1;
    state.lives = RULES.lives;
    state.wave = 1;
    state.time = 0;
    state.slowUntil = 0;
    state.invulnerableUntil = 0;
    state.shake = 0;
    state.flash = 0;
    state.banner = null;
    state.over = false;
    spawnTimer = 0.4;
    powerupTimer = RULES.powerupEverySeconds;
    demoDrift = 0;
  }

  /** Advance one fixed step. In demo mode (title screen) the ship cruises on its
   * own, orbs are gathered harmlessly and nothing can hurt it. */
  function step(dt, steering, demo) {
    let events = 0;
    state.time += dt;
    const wave = 1 + Math.floor(state.time / RULES.waveSeconds);
    if (wave !== state.wave) {
      state.wave = wave;
      state.banner = { text: `WAVE ${wave}`, age: 0 };
      events |= EVENT_WAVE;
    }
    if (state.banner) {
      state.banner.age += dt;
      if (state.banner.age > 2.2) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - 40 * dt);
    state.flash = Math.max(0, state.flash - dt);

    const slow = state.time < state.slowUntil ? RULES.slowFactor : 1;
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const interval = Math.max(
        RULES.minSpawnInterval,
        RULES.baseSpawnInterval - state.wave * 0.05,
      );
      spawnTimer = interval * random.range(0.7, 1.3);
      spawnOne();
      // A third of the time a second item falls beside the first, so the sky
      // stays busy and the player keeps choosing.
      if (random.chance(0.3)) spawnOne();
    }
    powerupTimer -= dt;
    if (powerupTimer <= 0) {
      powerupTimer = RULES.powerupEverySeconds * random.range(0.8, 1.25);
      spawnPowerup();
    }

    if (demo) {
      demoDrift += dt;
      state.ship.x = FIELD.width / 2 + Math.sin(demoDrift * 0.5) * 260;
      state.ship.y = FIELD.height - 150 + Math.sin(demoDrift * 0.9) * 40;
      state.ship.tilt = Math.cos(demoDrift * 0.5) * 0.25;
    } else {
      moveShip(dt, steering);
    }

    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const orb = state.orbs[i];
      orb.angle += orb.spin * dt;
      orb.y += orb.vy * slow * dt;
      orb.x = orb.baseX + Math.sin(state.time * orb.swaySpeed + orb.swayPhase) * ORB.sway;
      if (orb.y - orb.radius > FIELD.height) {
        state.orbs.splice(i, 1);
        continue;
      }
      const dx = orb.x - state.ship.x;
      const dy = orb.y - state.ship.y;
      const reach = orb.radius + SHIP.radius - 4;
      if (dx * dx + dy * dy < reach * reach) {
        if (demo) {
          state.orbs.splice(i, 1);
          particles.burst(orb.x, orb.y, COLORS[orb.color].main, 10, 200);
        } else if (orb.color === state.ship.color) {
          events |= collectOrb(orb, i);
        } else if (state.time >= state.invulnerableUntil) {
          state.orbs.splice(i, 1);
          state.shake = RULES.shakeOnWrong;
          state.flash = 0.25;
          particles.burst(orb.x, orb.y, '#ff4d5e', 18, 260);
          events |= loseHeart(EVENT_WRONG);
          if (state.over) return events;
        }
        // A wrong orb that meets a blinking (invulnerable) ship passes through.
      }
    }

    for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
      const rock = state.asteroids[i];
      rock.y += rock.vy * slow * dt;
      rock.x += rock.vx * dt;
      rock.rotation += rock.spin * dt;
      if (rock.y - rock.radius > FIELD.height + 20 || rock.x < -60 || rock.x > FIELD.width + 60) {
        state.asteroids.splice(i, 1);
        continue;
      }
      if (demo) continue;
      const dx = rock.x - state.ship.x;
      const dy = rock.y - state.ship.y;
      const reach = rock.radius * 0.85 + SHIP.radius - 6;
      if (dx * dx + dy * dy < reach * reach && state.time >= state.invulnerableUntil) {
        state.asteroids.splice(i, 1);
        events |= loseHeart(EVENT_HIT);
        if (state.over) return events;
      }
    }

    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const powerup = state.powerups[i];
      powerup.phase += dt;
      powerup.y += powerup.vy * slow * dt;
      if (powerup.y - powerup.radius > FIELD.height) {
        state.powerups.splice(i, 1);
        continue;
      }
      const dx = powerup.x - state.ship.x;
      const dy = powerup.y - state.ship.y;
      const reach = powerup.radius + SHIP.radius;
      if (dx * dx + dy * dy < reach * reach) {
        state.powerups.splice(i, 1);
        events |= applyPowerup(powerup);
      }
    }

    particles.step(dt);
    return events;
  }

  reset();
  return {
    state,
    reset,
    step,
    /** The player's colour actions, shared by the live game and the autopilot. */
    setShipColor(index) {
      state.ship.color = ((index % COLORS.length) + COLORS.length) % COLORS.length;
    },
    cycleShipColor() {
      state.ship.color = (state.ship.color + 1) % COLORS.length;
    },
  };
}
