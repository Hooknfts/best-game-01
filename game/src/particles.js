// Sparks, bursts and floating score popups: short-lived, drawn additively, and
// the only thing the world spawns for pure feedback.
export function createParticles() {
  const sparks = [];
  const popups = [];

  return {
    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.3 + Math.random() * 0.7);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 0.45 + Math.random() * 0.35,
          age: 0,
          size: 2 + Math.random() * 3.5,
          color,
        });
      }
    },
    trail(x, y, color) {
      sparks.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, life: 0.35, age: 0, size: 2.5, color });
    },
    popup(x, y, text, color) {
      popups.push({ x, y, text, color, life: 0.9, age: 0 });
    },
    step(dt) {
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.age += dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vx *= 1 - 2.4 * dt;
        spark.vy *= 1 - 2.4 * dt;
        if (spark.age >= spark.life) sparks.splice(i, 1);
      }
      for (let i = popups.length - 1; i >= 0; i -= 1) {
        const popup = popups[i];
        popup.age += dt;
        popup.y -= 46 * dt;
        if (popup.age >= popup.life) popups.splice(i, 1);
      }
    },
    get sparks() {
      return sparks;
    },
    get popups() {
      return popups;
    },
  };
}
