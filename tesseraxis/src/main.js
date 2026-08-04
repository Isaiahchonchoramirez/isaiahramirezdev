import { Simulation } from './engine/simulation.js';
import { parseShareLink } from './engine/export.js';
import { Viewport } from './render/viewport.js';
import { Shell } from './ui/shell.js';
import rocketLanding from './plugins/rocket-landing/index.js';
import swarm from './plugins/swarm/index.js';
import vehicleDynamics from './plugins/vehicle/index.js';
import ballistics from './plugins/ballistics/index.js';
import chemistry from './plugins/chemistry/index.js';

const root = document.querySelector('#app');
const canvas = document.querySelector('#viewport');
const simulation = new Simulation({ hz: 120 });
simulation.register(rocketLanding);
simulation.register(swarm);
simulation.register(vehicleDynamics);
simulation.register(ballistics);
simulation.register(chemistry);

const viewport = new Viewport(canvas);
simulation.viewport = viewport;

const shell = new Shell(root, simulation, viewport);

// Global drawing is reattached after every load because loading a plugin
// intentionally replaces all loop systems and render callbacks.
simulation.events.on('sim:loaded', () => {
  let last = performance.now();
  simulation.loop.onRender(() => {
    const now = performance.now();
    viewport.update(Math.min(0.1, (now - last) / 1000));
    last = now;
    shell.update();
    viewport.render();
  });
});

const shared = parseShareLink();
const pluginId = shared && simulation.plugins.has(shared.pluginId)
  ? shared.pluginId
  : rocketLanding.id;

shell.load(pluginId, shared ? { seed: shared.seed, params: shared.params } : undefined);

// A laboratory should open ready to run, but not advance before the user has
// had a chance to read the initial conditions.
simulation.loop.pause();

window.tesseraxis = { simulation, viewport, shell };
