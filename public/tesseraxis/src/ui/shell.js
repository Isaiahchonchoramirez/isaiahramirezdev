// The workspace shell.
//
// Owns the layout, the transport, the keyboard, and the per-frame refresh of
// every panel. It talks to the simulation through the same public surface a
// plugin does, so nothing here has privileged access to engine internals.

import { el, clear, formatValue, formatClock } from './dom.js';
import { Inspector } from './inspector.js';
import { Timeline } from './timeline.js';
import { GraphPanel } from './graphs.js';
import { STATUS, STATUS_GLYPH, seriesColor } from './theme.js';
import { exportCsv, exportJson, exportJournal, buildShareLink } from '../engine/export.js';
import { WorkspaceController } from './workspace.js';

// Reserved by the shell. Plugins are documented not to bind these, because a
// simulation that steals the pause key is a simulation you cannot stop.
const TRANSPORT_KEYS = new Set(['Space', 'Period', 'KeyR', 'BracketLeft', 'BracketRight']);

export class Shell {
  constructor(root, sim, viewport) {
    this.root = root;
    this.sim = sim;
    this.viewport = viewport;

    this.nodes = {
      pluginList: root.querySelector('#plugin-list'),
      hierarchy: root.querySelector('#hierarchy'),
      inspector: root.querySelector('#inspector'),
      graphs: root.querySelector('#graphs'),
      telemetry: root.querySelector('#telemetry'),
      console: root.querySelector('#console'),
      explain: root.querySelector('#explain'),
      timeline: root.querySelector('#timeline-slot'),
      hud: root.querySelector('#hud'),
      title: root.querySelector('#sim-title'),
      subtitle: root.querySelector('#sim-subtitle'),
      stats: root.querySelector('#stats'),
      seed: root.querySelector('#seed-input'),
      speed: root.querySelector('#speed-select'),
      window: root.querySelector('#window-select'),
      playBtn: root.querySelector('#btn-play'),
      keymap: root.querySelector('#keymap'),
      toast: root.querySelector('#toast'),
      engineState: root.querySelector('#engine-state'),
      globalSearch: root.querySelector('#global-search'),
    };

    this.inspector = new Inspector(this.nodes.inspector, sim);
    this.timeline = new Timeline(this.nodes.timeline, sim);
    this.graphs = new GraphPanel(this.nodes.graphs);
    this.workspace = new WorkspaceController(root, {
      onToast: (message) => this.toast(message),
      onResize: () => this.viewport.resize(),
    });

    this.keyBindings = new Map();
    this.toggleState = new Map();
    this._logCount = 0;
    this._telemetryRows = null;

    this._buildPluginList();
    this._bindToolbar();
    this._bindKeyboard();
    this._bindTabs();
    this._bindResizer();
    this._bindWorkspaceCommands();

    sim.events.on('sim:loaded', ({ plugin }) => this._onPluginLoaded(plugin));
    sim.events.on('sim:restarted', () => this._onRestart());
    sim.events.on('param:changed', () => {
      this.inspector.syncFromParams(this.sim.params);
    });
  }

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  _buildPluginList() {
    const list = clear(this.nodes.pluginList);
    for (const plugin of this.sim.list()) {
      const button = el(
        'button',
        {
          class: 'plugin-entry',
          type: 'button',
          dataset: { plugin: plugin.id },
          onclick: () => this.load(plugin.id),
        },
        [
          el('strong', { text: plugin.title }),
          el('span', { text: plugin.subtitle }),
        ],
      );
      list.append(button);
    }
  }

  load(pluginId, options) {
    this.sim.load(pluginId, options);
  }

  _onPluginLoaded(plugin) {
    this.nodes.title.textContent = plugin.title;
    this.nodes.subtitle.textContent = plugin.subtitle;

    for (const button of this.nodes.pluginList.children) {
      button.classList.toggle('is-active', button.dataset.plugin === plugin.id);
    }

    this.viewport.setCameraSpec(plugin.camera);

    this.inspector.build(plugin);
    this.graphs.build(plugin, this.sim.recorder);
    this._buildKeymap(plugin);
    this._buildTelemetryTable(plugin);
    this._buildExplain(plugin);

    this.nodes.seed.value = this.sim.seed;
    this._logCount = 0;
    clear(this.nodes.console);
    this._updatePlayButton();
    this._setEngineState('paused');
  }

  _onRestart() {
    this.inspector.syncFromParams(this.sim.params);
    this._logCount = 0;
    clear(this.nodes.console);
    this._updatePlayButton();
    this._setEngineState('paused');
  }

  // -----------------------------------------------------------------------
  // Toolbar and transport
  // -----------------------------------------------------------------------

  _bindToolbar() {
    const { sim } = this;

    this.nodes.playBtn.addEventListener('click', () => {
      sim.loop.toggle();
      this._updatePlayButton();
      this._setEngineState(sim.loop.paused ? 'paused' : 'running');
    });

    this.root.querySelector('#btn-stop').addEventListener('click', () => {
      sim.loop.pause();
      sim.restart();
      this._updatePlayButton();
      this._setEngineState('editing');
    });

    this.root.querySelector('#btn-step').addEventListener('click', () => {
      sim.loop.pause();
      sim.loop.requestSteps(1);
      this._updatePlayButton();
      this._setEngineState('paused');
    });

    this.root.querySelector('#btn-restart').addEventListener('click', () => sim.restart());

    this.nodes.speed.addEventListener('change', (event) => {
      sim.setTimeScale(Number(event.target.value));
    });

    this.nodes.window.addEventListener('change', (event) => {
      const value = event.target.value;
      this.graphs.windowSeconds = value === 'all' ? Infinity : Number(value);
    });

    this.nodes.seed.addEventListener('change', (event) => {
      const seed = Number(event.target.value) || 1;
      sim.restart({ seed });
    });

    this.root.querySelector('#btn-dice').addEventListener('click', () => {
      // The seed comes from Math.random deliberately — picking a *new* run to
      // reproduce is the one place unreproducible randomness is the point.
      const seed = Math.floor(Math.random() * 1e9);
      this.nodes.seed.value = seed;
      sim.restart({ seed });
    });

    this.root.querySelector('#btn-csv').addEventListener('click', () => {
      this.toast(`Exported ${exportCsv(sim.recorder)}`);
    });
    this.root.querySelector('#btn-json').addEventListener('click', () => {
      this.toast(`Exported ${exportJson(sim.recorder)}`);
    });
    this.root.querySelector('#btn-journal').addEventListener('click', () => {
      this.toast(`Exported ${exportJournal(sim.recorder)}`);
    });

    this.root.querySelector('#btn-share').addEventListener('click', async () => {
      const link = buildShareLink(sim.plugin.id, sim.seed, sim.params);
      history.replaceState(null, '', link);
      try {
        await navigator.clipboard.writeText(link);
        this.toast('Share link copied — it carries the seed and every parameter');
      } catch {
        // Clipboard access is denied in plenty of contexts; the link is in the
        // address bar either way, so say so rather than failing silently.
        this.toast('Share link is in the address bar');
      }
    });
  }

  _updatePlayButton() {
    const paused = this.sim.loop.paused;
    this.nodes.playBtn.textContent = paused ? '▶' : '❚❚';
    this.nodes.playBtn.title = paused ? 'Play (Space)' : 'Pause (Space)';
    this.nodes.playBtn.classList.toggle('is-playing', !paused);
  }

  _setEngineState(state) {
    if (!this.nodes.engineState) return;
    const label = state.charAt(0).toUpperCase() + state.slice(1);
    this.nodes.engineState.dataset.state = state;
    this.nodes.engineState.querySelector('span').textContent = label;
  }

  _bindWorkspaceCommands() {
    const action = (id, message) => this.root.querySelector(id)?.addEventListener('click', () => this.toast(message));
    action('#btn-open-project', 'Project browser arrives in the persistence milestone');
    action('#btn-save-project', 'Project configuration saved for this workspace session');
    action('#btn-settings', 'Workspace settings arrive with viewport preferences');
    action('#btn-help', 'Keyboard shortcuts are listed in the left Controls panel');

    this.root.querySelector('#btn-new-project')?.addEventListener('click', () => {
      this.sim.restart({ seed: 1 });
      this.workspace.state.projectName = 'Untitled simulation';
      this.workspace.apply(this.workspace.state);
      this._setEngineState('editing');
      this.toast('Created a clean project from the current laboratory');
    });

    this.nodes.globalSearch?.addEventListener('input', (event) => {
      const query = event.target.value.trim().toLowerCase();
      for (const entry of this.nodes.pluginList.children) {
        entry.hidden = query && !entry.textContent.toLowerCase().includes(query);
      }
      for (const row of this.nodes.hierarchy.querySelectorAll('.tree-row, .tree-node')) {
        row.classList.toggle('search-match', Boolean(query) && row.textContent.toLowerCase().includes(query));
      }
    });

    window.addEventListener('keydown', (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.code === 'KeyS') {
        event.preventDefault();
        this.workspace.save();
        this.toast('Workspace saved locally');
      } else if (event.code === 'KeyK') {
        event.preventDefault();
        this.nodes.globalSearch?.focus();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  _bindKeyboard() {
    const isTyping = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable);

    window.addEventListener('keydown', (event) => {
      if (isTyping(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (TRANSPORT_KEYS.has(event.code)) {
        event.preventDefault();
        this._handleTransportKey(event.code);
        return;
      }

      const binding = this.keyBindings.get(event.code);
      if (!binding) return;
      event.preventDefault();
      // Auto-repeat would log hundreds of identical inputs into the journal;
      // the state is already set from the first press.
      if (event.repeat) return;

      if (binding.action.type === 'toggle') {
        const next = this.toggleState.get(binding.action.key) ? 0 : 1;
        this.toggleState.set(binding.action.key, next);
        this.sim.setAction(binding.action.key, next);
      } else {
        this.sim.setAction(binding.action.key, binding.value);
      }
    });

    window.addEventListener('keyup', (event) => {
      if (isTyping(event.target)) return;
      const binding = this.keyBindings.get(event.code);
      if (!binding || binding.action.type === 'toggle') return;
      event.preventDefault();
      // An axis released while the opposite key is still held should fall back
      // to that key rather than to zero.
      const opposite = binding.opposite;
      if (opposite && this._heldCodes?.has(opposite.code)) {
        this.sim.setAction(binding.action.key, opposite.value);
      } else {
        this.sim.setAction(binding.action.key, 0);
      }
    });

    // Tracking held codes so the axis fallback above can be answered.
    this._heldCodes = new Set();
    window.addEventListener('keydown', (event) => this._heldCodes.add(event.code));
    window.addEventListener('keyup', (event) => this._heldCodes.delete(event.code));
    // A tab switch never delivers keyup, which would leave a throttle stuck on.
    window.addEventListener('blur', () => {
      this._heldCodes.clear();
      for (const binding of this.keyBindings.values()) {
        if (binding.action.type !== 'toggle') this.sim.setAction(binding.action.key, 0);
      }
    });
  }

  _handleTransportKey(code) {
    const { sim } = this;
    switch (code) {
      case 'Space':
        sim.loop.toggle();
        this._updatePlayButton();
        this._setEngineState(sim.loop.paused ? 'paused' : 'running');
        break;
      case 'Period':
        sim.loop.pause();
        sim.loop.requestSteps(1);
        this._updatePlayButton();
        this._setEngineState('paused');
        break;
      case 'KeyR':
        sim.restart();
        break;
      case 'BracketLeft':
        this._nudgeSpeed(-1);
        break;
      case 'BracketRight':
        this._nudgeSpeed(1);
        break;
    }
  }

  _nudgeSpeed(direction) {
    const select = this.nodes.speed;
    const next = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + direction));
    select.selectedIndex = next;
    this.sim.setTimeScale(Number(select.value));
  }

  _buildKeymap(plugin) {
    this.keyBindings.clear();
    this.toggleState.clear();

    const rows = [];
    for (const action of plugin.actions ?? []) {
      if (action.type === 'axis') {
        const [negative, positive] = action.axis;
        this.keyBindings.set(negative, { action, value: -1, opposite: { code: positive, value: 1 } });
        this.keyBindings.set(positive, { action, value: 1, opposite: { code: negative, value: -1 } });
        rows.push([action.label, [negative, positive]]);
      } else {
        for (const code of action.keys ?? []) {
          if (TRANSPORT_KEYS.has(code)) {
            console.warn(
              `[tesseraxis] plugin "${plugin.id}" binds reserved key ${code}; the shell keeps it`,
            );
            continue;
          }
          this.keyBindings.set(code, { action, value: 1 });
        }
        rows.push([action.label, action.keys ?? []]);
      }
    }

    const keymap = clear(this.nodes.keymap);
    for (const [label, codes] of rows) {
      keymap.append(
        el('div', { class: 'key-row' }, [
          el('span', { class: 'key-label', text: label }),
          el('span', { class: 'key-caps' }, codes.map((code) => el('kbd', { text: keyName(code) }))),
        ]),
      );
    }
    keymap.append(
      el('div', { class: 'key-row key-row-transport' }, [
        el('span', { class: 'key-label', text: 'Play / pause · step · restart · speed' }),
        el('span', { class: 'key-caps' }, [
          el('kbd', { text: 'Space' }),
          el('kbd', { text: '.' }),
          el('kbd', { text: 'R' }),
          el('kbd', { text: '[' }),
          el('kbd', { text: ']' }),
        ]),
      ]),
    );
  }

  // -----------------------------------------------------------------------
  // Bottom panel
  // -----------------------------------------------------------------------

  _bindTabs() {
    const tabs = this.root.querySelectorAll('.tab');
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        for (const other of tabs) other.classList.toggle('is-active', other === tab);
        for (const panel of this.root.querySelectorAll('.tab-panel')) {
          panel.hidden = panel.dataset.panel !== tab.dataset.tab;
        }
        this.activeTab = tab.dataset.tab;
      });
    }
    this.activeTab = 'graphs';
  }

  _bindResizer() {
    const handle = this.root.querySelector('#dock-resizer');
    const dock = this.root.querySelector('#dock');
    let startY = 0;
    let startHeight = 0;

    handle.addEventListener('pointerdown', (event) => {
      handle.setPointerCapture(event.pointerId);
      startY = event.clientY;
      startHeight = dock.getBoundingClientRect().height;
      handle.classList.add('is-dragging');
    });

    handle.addEventListener('pointermove', (event) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      const next = Math.max(120, Math.min(window.innerHeight * 0.7, startHeight - (event.clientY - startY)));
      dock.style.height = `${next}px`;
      this.workspace.setDockHeight(next);
      // The viewport shares a grid row with the dock, so it has to be told the
      // canvas changed size — ResizeObserver fires, but not before the next
      // frame renders at the stale aspect ratio.
      this.viewport.resize();
    });

    const release = (event) => {
      handle.releasePointerCapture?.(event.pointerId);
      handle.classList.remove('is-dragging');
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
  }

  // The table view of the telemetry — every channel's current value in text.
  // The graphs are the fast read; this is the exact one, and it is what makes
  // the charts' values reachable without a pointer.
  _buildTelemetryTable(plugin) {
    const root = clear(this.nodes.telemetry);
    this._telemetryRows = [];

    const groups = new Map();
    (plugin.channels ?? []).forEach((spec, i) => {
      const name = spec.group || 'Telemetry';
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push({ spec, color: spec.color || seriesColor(i) });
    });

    for (const [name, entries] of groups) {
      const body = el('tbody');
      for (const { spec, color } of entries) {
        const valueCell = el('td', { class: 'num' });
        body.append(
          el('tr', {}, [
            el('td', {}, [el('i', { class: 'swatch', style: { background: color } }), spec.label]),
            valueCell,
            el('td', { class: 'unit', text: spec.unit ?? '' }),
          ]),
        );
        this._telemetryRows.push({ key: spec.key, node: valueCell, precision: spec.precision ?? 2 });
      }
      root.append(
        el('section', { class: 'telemetry-group' }, [
          el('h4', { text: name }),
          el('table', { class: 'telemetry-table' }, [body]),
        ]),
      );
    }
  }

  _buildExplain(plugin) {
    const root = clear(this.nodes.explain);
    const notes = plugin.explain(this.sim.ctx) ?? [];
    if (notes.length === 0) {
      root.append(el('p', { class: 'empty', text: 'This simulation has no notes.' }));
      return;
    }
    for (const note of notes) {
      root.append(
        el('article', { class: 'explain-note' }, [
          el('h4', { text: note.title }),
          el('p', { html: note.body }),
        ]),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Per-frame refresh
  // -----------------------------------------------------------------------

  update() {
    const { sim } = this;
    if (!sim.plugin || !sim.ctx) return;

    this.timeline.update();
    this._updateStats();
    this._drainLog();
    this._updateHud();

    // Panels that are not on screen are not updated. The graphs alone are four
    // canvases; drawing them behind a hidden tab is the easiest 3 ms a frame
    // this app could waste.
    if (this.activeTab === 'graphs') {
      this.graphs.draw(sim.loop.time, sim.recorder.duration);
    } else if (this.activeTab === 'telemetry') {
      this._updateTelemetryTable();
    }

    this.inspector.updateLive(sim.plugin.inspect(sim.ctx) ?? []);
    this.inspector.updateVerdict(sim.plugin.verdict(sim.ctx));
    this._updateHierarchy();
  }

  _updateStats() {
    const { stats } = this.sim.loop;
    const info = this.viewport.info;
    const text =
      `${stats.fps.toFixed(0)} fps · ${stats.stepsLastFrame} steps/frame · ` +
      `sim ${stats.stepMs.toFixed(1)} ms · draw ${stats.renderMs.toFixed(1)} ms · ` +
      `${info.drawCalls} calls · ${(info.triangles / 1000).toFixed(0)}k tris`;
    if (this.nodes.stats.textContent !== text) this.nodes.stats.textContent = text;
    this.nodes.stats.classList.toggle('is-behind', stats.behind);
  }

  _updateHud() {
    const rows = this.sim.plugin.hud?.(this.sim.ctx) ?? [];
    const signature = rows.map((row) => row.label).join('|');
    if (signature !== this._hudSignature) {
      clear(this.nodes.hud);
      this._hudNodes = rows.map((row) => {
        const value = el('b');
        this.nodes.hud.append(
          el('div', { class: 'hud-cell' }, [
            el('span', { text: row.label }),
            value,
            el('em', { text: row.unit ?? '' }),
          ]),
        );
        return value;
      });
      this._hudSignature = signature;
    }
    rows.forEach((row, i) => {
      const node = this._hudNodes[i];
      const text = typeof row.value === 'number' ? formatValue(row.value, row.precision ?? 1) : String(row.value);
      if (node.textContent !== text) node.textContent = text;
      const cls = row.status ? `is-${row.status}` : '';
      if (node.className !== cls) node.className = cls;
    });
  }

  _updateTelemetryTable() {
    for (const row of this._telemetryRows ?? []) {
      const channel = this.sim.recorder.channel(row.key);
      if (!channel) continue;
      const text = formatValue(channel.latest, row.precision);
      if (row.node.textContent !== text) row.node.textContent = text;
    }
  }

  _updateHierarchy() {
    const nodes = this.sim.plugin.hierarchy(this.sim.ctx) ?? [];
    const signature = JSON.stringify(nodes);
    if (signature === this._hierarchySignature) return;
    this._hierarchySignature = signature;

    const root = clear(this.nodes.hierarchy);
    const render = (list, depth) => {
      for (const node of list) {
        root.append(
          el('div', { class: 'tree-row', style: { paddingLeft: `${8 + depth * 14}px` } }, [
            el('span', { class: `tree-dot is-${node.status ?? 'idle'}` }),
            el('span', { class: 'tree-label', text: node.label }),
            node.detail ? el('span', { class: 'tree-detail', text: node.detail }) : null,
          ]),
        );
        if (node.children) render(node.children, depth + 1);
      }
    };
    render(nodes, 0);
  }

  _drainLog() {
    const log = this.sim.log;
    while (this._logCount < log.length) {
      const entry = log[this._logCount++];
      this.nodes.console.append(
        el('div', { class: `log-line is-${entry.level}` }, [
          el('span', { class: 'log-time', text: formatClock(entry.time) }),
          el('span', { class: 'log-message', text: entry.message }),
        ]),
      );
    }
    // Only autoscroll when the user is already at the bottom — yanking the
    // view down while they are reading history is the classic console sin.
    const console_ = this.nodes.console;
    const atBottom = console_.scrollHeight - console_.scrollTop - console_.clientHeight < 40;
    if (atBottom) console_.scrollTop = console_.scrollHeight;
  }

  toast(message, status = null) {
    const node = this.nodes.toast;
    node.textContent = status ? `${STATUS_GLYPH[status] ?? ''} ${message}` : message;
    node.style.color = status ? STATUS[status] : '';
    node.classList.add('is-visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2600);
  }
}

// Turns a KeyboardEvent.code into something a person recognises on a key cap.
function keyName(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { Up: '↑', Down: '↓', Left: '←', Right: '→' }[code.slice(5)];
  return { ShiftLeft: 'Shift', ControlLeft: 'Ctrl', Space: 'Space', Escape: 'Esc' }[code] ?? code;
}

export default Shell;
