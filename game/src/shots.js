// The screenshot scenes behind ?shot=title|action|surge|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// an autopilot that chases matching orbs, switches colour to meet them and
// shoves away from rocks and wrong-coloured orbs, so every frame is what a
// real game looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;
const TITLE_SECONDS = 6;
const ACTION_SECONDS = 20;
const SURGE_SECONDS = 53.5;
const GOOD_SECONDS = 14;
const END_LIMIT_SECONDS = 600;

/** Steer toward the nearest reachable matching orb, switching colour to meet
 * it, with a shove away from anything that would hurt. The pilot prefers orbs
 * low on the screen, so the ship patrols the lower half and the sky above it
 * stays busy. */
function autopilot(world) {
  const state = world.state;
  const ship = state.ship;
  let target = null;
  let bestScore = Infinity;
  for (const orb of state.orbs) {
    const dx = Math.abs(orb.x - ship.x);
    const dy = Math.abs(orb.y - ship.y);
    const mismatch = orb.color === ship.color ? 0 : 260;
    const tooHigh = Math.max(0, 300 - orb.y) * 0.9;
    const score = dx * 1.5 + dy * 0.3 + mismatch + tooHigh;
    if (score < bestScore) {
      bestScore = score;
      target = orb;
    }
  }
  if (target && target.color !== ship.color) world.setShipColor(target.color);

  let steerX = 0;
  let steerY = 0;
  if (target) {
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const distance = Math.hypot(dx, dy) || 1;
    steerX = dx / distance;
    steerY = dy / distance;
  } else {
    // Nothing worth chasing: drift back to a patrol point low on the screen.
    const dx = FIELD.width / 2 - ship.x;
    const dy = 520 - ship.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > 40) {
      steerX = dx / distance;
      steerY = dy / distance;
    }
  }
  // Repulsion from rocks and wrong-coloured orbs close by.
  const hazards = [];
  for (const rock of state.asteroids) hazards.push(rock);
  for (const orb of state.orbs) if (orb.color !== ship.color) hazards.push(orb);
  for (const hazard of hazards) {
    const dx = ship.x - hazard.x;
    const dy = ship.y - hazard.y;
    const distance = Math.hypot(dx, dy);
    const range = hazard.radius + 130;
    if (distance < range && distance > 1) {
      const push = ((range - distance) / range) * 2.6;
      steerX += (dx / distance) * push;
      steerY += (dy / distance) * push;
    }
  }
  const length = Math.hypot(steerX, steerY);
  if (length < 0.05) return { x: 0, y: 0, mouse: null };
  return { x: steerX / length, y: steerY / length, mouse: null };
}

/** Run the world forward, steered, until `seconds` pass or the game ends. */
function playFor(world, seconds, pilot) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const steering = pilot ? pilot(world) : { x: 0, y: 0, mouse: null };
    if (world.step(STEP, steering, false) & EVENT_OVER) return true;
  }
  return false;
}

/** Steer at the nearest rock or wrong-coloured orb: the way a game ends. */
function recklessPilot(world) {
  const state = world.state;
  const ship = state.ship;
  let target = null;
  let bestDistance = Infinity;
  for (const rock of state.asteroids) {
    const distance = Math.hypot(rock.x - ship.x, rock.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      target = rock;
    }
  }
  for (const orb of state.orbs) {
    if (orb.color === ship.color) continue;
    const distance = Math.hypot(orb.x - ship.x, orb.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      target = orb;
    }
  }
  if (!target) return { x: 0, y: 0, mouse: null };
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, mouse: null };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'action') {
    playFor(world, ACTION_SECONDS, autopilot);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'surge') {
    playFor(world, SURGE_SECONDS, autopilot);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    playFor(world, GOOD_SECONDS, autopilot);
    // Then a hurried player: fly straight at the nearest thing that hurts
    // and never switch colour, until the hearts run out.
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      if (world.step(STEP, recklessPilot(world), false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
    world.step(STEP, { x: 0, y: 0, mouse: null }, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
