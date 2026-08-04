const STORAGE_KEY = 'tesseraxis.workspace.v2';

const PRESETS = {
  simulation: { left: true, right: true, dock: true, dockHeight: 300 },
  analysis: { left: false, right: true, dock: true, dockHeight: 460 },
  debugging: { left: true, right: true, dock: true, dockHeight: 390 },
  presentation: { left: false, right: false, dock: false, dockHeight: 240 },
  beginner: { left: true, right: true, dock: false, dockHeight: 240 },
  engineering: { left: true, right: true, dock: true, dockHeight: 360 },
};

export class WorkspaceController {
  constructor(root, { onToast = () => {}, onResize = () => {} } = {}) {
    this.root = root;
    this.onToast = onToast;
    this.onResize = onResize;
    this.nodes = {
      project: root.querySelector('#project-name'),
      preset: root.querySelector('#layout-select'),
      leftToggle: root.querySelector('#btn-left-panel'),
      rightToggle: root.querySelector('#btn-right-panel'),
      dockToggle: root.querySelector('#btn-dock'),
      leftMini: root.querySelector('#btn-left-panel-mini'),
      rightClose: root.querySelector('#btn-right-panel-close'),
      dock: root.querySelector('#dock'),
    };
    this.state = this._restore();
    this._bind();
    this.apply(this.state, false);
  }

  _restore() {
    const compactDefaults = globalThis.matchMedia?.('(max-width: 1100px)').matches
      ? { left: false, right: false }
      : {};
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { projectName: 'Untitled simulation', preset: 'simulation', ...PRESETS.simulation, ...compactDefaults, ...saved };
    } catch {
      return { projectName: 'Untitled simulation', preset: 'simulation', ...PRESETS.simulation, ...compactDefaults };
    }
  }

  _bind() {
    this.nodes.project?.addEventListener('change', () => {
      this.state.projectName = this.nodes.project.value.trim() || 'Untitled simulation';
      this.nodes.project.value = this.state.projectName;
      this.save();
    });
    this.nodes.preset?.addEventListener('change', () => this.usePreset(this.nodes.preset.value));
    this.nodes.leftToggle?.addEventListener('click', () => this.toggle('left'));
    this.nodes.leftMini?.addEventListener('click', () => this.toggle('left'));
    this.nodes.rightToggle?.addEventListener('click', () => this.toggle('right'));
    this.nodes.rightClose?.addEventListener('click', () => this.toggle('right'));
    this.nodes.dockToggle?.addEventListener('click', () => this.toggle('dock'));
  }

  usePreset(name) {
    const preset = PRESETS[name] ?? PRESETS.simulation;
    this.apply({ ...this.state, ...preset, preset: name });
    this.onToast(`Layout changed to ${labelFor(name)}`);
  }

  toggle(region) {
    this.apply({ ...this.state, [region]: !this.state[region], preset: 'custom' });
  }

  apply(next, persist = true) {
    this.state = { ...this.state, ...next };
    this.root.classList.toggle('left-collapsed', !this.state.left);
    this.root.classList.toggle('right-collapsed', !this.state.right);
    this.root.classList.toggle('dock-collapsed', !this.state.dock);
    if (this.nodes.dock && this.state.dock) this.nodes.dock.style.height = `${this.state.dockHeight}px`;
    if (this.nodes.project) this.nodes.project.value = this.state.projectName;
    if (this.nodes.preset) this.nodes.preset.value = PRESETS[this.state.preset] ? this.state.preset : 'custom';
    this._syncToggle(this.nodes.leftToggle, this.state.left, 'hierarchy');
    this._syncToggle(this.nodes.rightToggle, this.state.right, 'inspector');
    this._syncToggle(this.nodes.dockToggle, this.state.dock, 'data workspace');
    if (persist) this.save();
    requestAnimationFrame(this.onResize);
  }

  setDockHeight(height) {
    this.state.dockHeight = Math.round(height);
    this.state.preset = 'custom';
    if (this.nodes.preset) this.nodes.preset.value = 'custom';
    this.save();
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  reset() {
    this.apply({ projectName: this.state.projectName, preset: 'simulation', ...PRESETS.simulation });
    this.onToast('Workspace layout reset');
  }

  _syncToggle(button, expanded, label) {
    if (!button) return;
    button.setAttribute('aria-pressed', String(expanded));
    button.title = `${expanded ? 'Hide' : 'Show'} ${label}`;
  }
}

function labelFor(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const WORKSPACE_PRESETS = PRESETS;
