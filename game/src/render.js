// Everything the eye sees: the nebula sky, the glowing orbs and rocks, the
// prism-ship, the particles, the HUD and the title / pause / game-over screens.
// One canvas, one logical field (1280x720), scaled to whatever window it gets.
import { COLORS, FIELD, PALETTE, SHIP } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const POWERUP_STYLE = {
  shield: { label: '+', color: PALETTE.powerShield },
  slow: { label: '◷', color: PALETTE.powerSlow },
  nova: { label: '✦', color: PALETTE.powerNova },
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const sky = createRandom(20261115);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: sky.range(0, FIELD.width),
      y: sky.range(0, FIELD.height),
      size: sky.range(0.6, 2.4),
      twinkle: sky.range(0.5, 2.2),
      phase: sky.range(0, Math.PI * 2),
      depth: sky.range(0.3, 1),
    });
  }
  const nebulae = [
    { x: 240, y: 180, r: 340, color: 'rgba(120, 60, 220, 0.20)' },
    { x: 1050, y: 420, r: 380, color: 'rgba(40, 140, 220, 0.16)' },
    { x: 700, y: 90, r: 260, color: 'rgba(255, 80, 180, 0.12)' },
    { x: 120, y: 620, r: 300, color: 'rgba(255, 150, 40, 0.10)' },
  ];
  // Slow-drifting glow motes: pure decoration, for depth behind the play.
  const motes = [];
  for (let i = 0; i < 14; i += 1) {
    motes.push({
      x: sky.range(0, FIELD.width),
      y: sky.range(0, FIELD.height),
      r: sky.range(3, 7),
      speed: sky.range(6, 18),
      color: sky.pick(['#ffb02e', '#2ee6ff', '#ff4fd8', '#8b5cff']),
      phase: sky.range(0, Math.PI * 2),
    });
  }

  function fitCanvas() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.floor(FIELD.width * scale * window.devicePixelRatio);
    canvas.height = Math.floor(FIELD.height * scale * window.devicePixelRatio);
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.backgroundTop);
    gradient.addColorStop(0.55, PALETTE.backgroundMid);
    gradient.addColorStop(1, PALETTE.backgroundBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const nebula of nebulae) {
      const glow = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
      glow.addColorStop(0, nebula.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
    }
    for (const star of stars) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * star.twinkle + star.phase));
      ctx.globalAlpha = alpha * star.depth;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const mote of motes) {
      const y = (mote.y + time * mote.speed) % FIELD.height;
      const alpha = 0.10 + 0.08 * Math.sin(time * 0.8 + mote.phase);
      ctx.globalAlpha = Math.max(0.04, alpha);
      ctx.fillStyle = mote.color;
      ctx.shadowColor = mote.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mote.x, y, mote.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawOrb(orb) {
    const color = COLORS[orb.color];
    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.rotate(orb.angle);
    // A short motion streak above the orb, fading into the sky.
    const streak = ctx.createLinearGradient(0, -46, 0, 0);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(1, color.main);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = streak;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(0, -orb.radius);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = color.main;
    ctx.shadowBlur = 26;
    ctx.fillStyle = color.main;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color.glow;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rotation);
    ctx.fillStyle = PALETTE.asteroid;
    ctx.strokeStyle = PALETTE.asteroidDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rock.points.forEach((point, index) => {
      const x = Math.cos(point.angle) * point.r;
      const y = Math.sin(point.angle) * point.r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.asteroidDark;
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.25, -rock.radius * 0.2, rock.radius * 0.22, 0, Math.PI * 2);
    ctx.arc(rock.radius * 0.3, rock.radius * 0.25, rock.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPowerup(powerup) {
    const style = POWERUP_STYLE[powerup.kind];
    const bob = Math.sin(powerup.phase * 3) * 3;
    ctx.save();
    ctx.translate(powerup.x, powerup.y + bob);
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(10, 8, 30, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = style.color;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.label, 0, 1);
    ctx.restore();
  }

  function drawShip(ship, time, invulnerableUntil) {
    const color = COLORS[ship.color];
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.tilt);
    // A ship in its grace second after a hit blinks, so the player can see it.
    if (time < invulnerableUntil) ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(time * 18));
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 60) {
      const flame = 14 + Math.sin(time * 40) * 5 + speed * 0.02;
      const flameGradient = ctx.createLinearGradient(0, 14, 0, 14 + flame);
      flameGradient.addColorStop(0, color.glow);
      flameGradient.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = flameGradient;
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(0, 14 + flame);
      ctx.lineTo(8, 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowColor = color.main;
    ctx.shadowBlur = 26;
    const bodyGradient = ctx.createLinearGradient(0, -24, 0, 18);
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.45, color.glow);
    bodyGradient.addColorStop(1, color.main);
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(19, 16);
    ctx.lineTo(0, 8);
    ctx.lineTo(-19, 16);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color.dark;
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(particles) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spark of particles.sparks) {
      ctx.globalAlpha = 1 - spark.age / spark.life;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const popup of particles.popups) {
      ctx.globalAlpha = 1 - popup.age / popup.life;
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 28, 44);
    ctx.font = '800 46px system-ui, sans-serif';
    ctx.fillText(String(state.score), 28, 92);
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 28, 120);

    if (state.combo >= 2) {
      const pulse = 1 + Math.sin(state.time * 8) * 0.06;
      ctx.save();
      ctx.translate(28, 158);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = COLORS[state.ship.color].main;
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`×${state.multiplier}  COMBO ${state.combo}`, 0, 0);
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave}`, FIELD.width / 2, 44);
    if (state.time < state.slowUntil) {
      ctx.fillStyle = PALETTE.powerSlow;
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillText(`SLOW TIME ${Math.ceil(state.slowUntil - state.time)}s`, FIELD.width / 2, 72);
    }

    for (let i = 0; i < state.lives; i += 1) {
      const x = FIELD.width - 40 - i * 40;
      const y = 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = PALETTE.heart;
      ctx.shadowColor = PALETTE.heart;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-14, -2, -8, -14, 0, -6);
      ctx.bezierCurveTo(8, -14, 14, -2, 0, 10);
      ctx.fill();
      ctx.restore();
    }

    const color = COLORS[state.ship.color];
    ctx.textAlign = 'right';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillStyle = color.main;
    ctx.fillText(`◉ ${color.name}  —  SPACE / CLICK to switch`, FIELD.width - 28, FIELD.height - 24);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.textAlign = 'left';
    ctx.fillText('ARROWS / WASD / MOUSE to fly   ·   P pause   ·   M mute', 28, FIELD.height - 24);
  }

  function drawBanner(banner) {
    if (!banner) return;
    const alpha = banner.age < 0.3 ? banner.age / 0.3 : banner.age > 1.7 ? Math.max(0, (2.2 - banner.age) / 0.5) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = '800 72px system-ui, sans-serif';
    ctx.shadowColor = '#8b5cff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(banner.text, FIELD.width / 2, FIELD.height / 2 - 40);
    ctx.restore();
  }

  function overlay(alpha) {
    ctx.fillStyle = `rgba(6, 3, 18, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centeredLines(lines, startY, gap) {
    ctx.textAlign = 'center';
    lines.forEach((line, index) => {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      if (line.glow) {
        ctx.shadowColor = line.glow;
        ctx.shadowBlur = 24;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillText(line.text, FIELD.width / 2, startY + index * gap);
    });
    ctx.shadowBlur = 0;
  }

  function drawTitle(state, best) {
    overlay(0.45);
    const pulse = 0.75 + Math.sin(state.time * 2.4) * 0.25;
    const titleGradient = ctx.createLinearGradient(FIELD.width / 2 - 320, 0, FIELD.width / 2 + 320, 0);
    titleGradient.addColorStop(0, COLORS[0].main);
    titleGradient.addColorStop(0.5, COLORS[1].main);
    titleGradient.addColorStop(1, COLORS[2].main);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 96px system-ui, sans-serif';
    ctx.shadowColor = '#8b5cff';
    ctx.shadowBlur = 36;
    ctx.fillStyle = titleGradient;
    ctx.fillText('PRISM DRIFT', FIELD.width / 2, 250);
    ctx.restore();
    centeredLines(
      [
        { text: 'Ride the light. Dodge the dark.', font: '600 28px system-ui, sans-serif', color: '#e8e0ff' },
        { text: 'Absorb orbs that match your ship’s colour — wrong colours and rocks cost a heart.', font: '500 21px system-ui, sans-serif', color: '#c9bdf0' },
        { text: 'Chain matches into combos up to ×8. Survive the rising waves.', font: '500 21px system-ui, sans-serif', color: '#c9bdf0' },
        { text: 'ARROWS / WASD / MOUSE — fly      SPACE / CLICK — switch colour      1 2 3 — pick colour', font: '600 19px system-ui, sans-serif', color: '#9d8bd6' },
      ],
      310,
      38,
    );
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.textAlign = 'center';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS SPACE OR CLICK TO START', FIELD.width / 2, 500);
    ctx.restore();
    if (best > 0) {
      ctx.textAlign = 'center';
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.hudDim;
      ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 548);
    }
  }

  function drawPaused() {
    overlay(0.55);
    centeredLines(
      [
        { text: 'PAUSED', font: '800 64px system-ui, sans-serif', color: '#ffffff', glow: '#8b5cff' },
        { text: 'Press P or Space to keep flying', font: '500 24px system-ui, sans-serif', color: '#c9bdf0' },
      ],
      330,
      52,
    );
  }

  function drawOver(state, best) {
    overlay(0.62);
    const isBest = state.score >= best && state.score > 0;
    centeredLines(
      [
        { text: 'SIGNAL LOST', font: '800 76px system-ui, sans-serif', color: '#ff5d7a', glow: '#ff2e4d' },
        { text: isBest ? '★ NEW BEST SCORE ★' : 'The nebula claims another pilot.', font: '700 26px system-ui, sans-serif', color: isBest ? '#ffe95d' : '#c9bdf0' },
        { text: `SCORE  ${state.score}`, font: '800 52px system-ui, sans-serif', color: '#ffffff' },
        { text: `BEST  ${best}      ·      WAVE ${state.wave}      ·      TOP COMBO ${state.topCombo}`, font: '600 22px system-ui, sans-serif', color: '#b9a8e8' },
        { text: 'PRESS SPACE OR CLICK TO FLY AGAIN', font: '800 26px system-ui, sans-serif', color: '#ffffff' },
      ],
      240,
      62,
    );
  }

  function draw(state, screen, best) {
    fitCanvas();
    const scale = canvas.width / FIELD.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state.time);
    for (const orb of state.orbs) drawOrb(orb);
    for (const rock of state.asteroids) drawAsteroid(rock);
    for (const powerup of state.powerups) drawPowerup(powerup);
    if (screen !== SCREEN_OVER || !state.over) drawShip(state.ship, state.time, state.invulnerableUntil);
    drawParticles(state.particles);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 80, ${state.flash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawHud(state, best);
      drawTitle(state, best);
    } else if (screen === SCREEN_PLAY) {
      drawHud(state, best);
      drawBanner(state.banner);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(state, best);
      drawPaused();
    } else if (screen === SCREEN_OVER) {
      drawHud(state, best);
      drawOver(state, best);
    }
  }

  return { draw };
}
