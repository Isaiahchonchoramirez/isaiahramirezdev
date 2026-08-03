// The inspector.
//
// Nothing in here is written per simulation. A plugin declares its parameters
// as data and the controls are generated from that declaration, which is what
// makes "add a new simulation" a matter of describing one rather than building
// another panel.

import { el, clear, formatValue } from './dom.js';
import { groupParams } from '../sdk/plugin.js';
import { STATUS, STATUS_GLYPH } from './theme.js';

export class Inspector {
  constructor(container, sim) {
    this.container = container;
    this.sim = sim;
    this.controls = new Map();
    this.liveRoot = null;
    this.verdictRoot = null;
  }

  build(plugin) {
    clear(this.container);
    this.controls.clear();

    this.verdictRoot = el('div', { class: 'verdict-slot' });
    this.container.append(this.verdictRoot);

    this.liveRoot = el('div', { class: 'inspect-live' });
    this.container.append(this.liveRoot);

    for (const group of groupParams(plugin.params ?? [])) {
      this.container.append(this._buildGroup(group));
    }
  }

  _buildGroup(group) {
    const body = el('div', { class: 'param-group-body' });
    for (const spec of group.items) body.append(this._buildControl(spec));

    // Groups are collapsible and start open. A run with thirty parameters is
    // unreadable as one flat list, and remembering which group the user closed
    // matters less than never hiding something by default.
    const details = el('details', { class: 'param-group', open: true }, [
      el('summary', {}, [group.name]),
      body,
    ]);
    return details;
  }

  _buildControl(spec) {
    const sim = this.sim;
    const value = sim.params[spec.key];

    if (spec.type === 'boolean') {
      const input = el('input', {
        type: 'checkbox',
        checked: !!value,
        onchange: (event) => sim.setParam(spec.key, event.target.checked),
      });
      const row = el('label', { class: 'param param-toggle' }, [
        el('span', { class: 'param-label', text: spec.label, title: spec.help ?? '' }),
        input,
      ]);
      this.controls.set(spec.key, { spec, set: (v) => (input.checked = !!v) });
      return row;
    }

    if (spec.type === 'select') {
      const select = el(
        'select',
        { onchange: (event) => sim.setParam(spec.key, event.target.value) },
        spec.options.map((option) =>
          el('option', { value: option.value, selected: option.value === value }, [option.label]),
        ),
      );
      const row = el('label', { class: 'param param-select' }, [
        el('span', { class: 'param-label', text: spec.label, title: spec.help ?? '' }),
        select,
      ]);
      this.controls.set(spec.key, { spec, set: (v) => (select.value = v) });
      return row;
    }

    // Numeric: a slider for feel and a number box for precision, kept in sync.
    // Tuning a gain needs both — you sweep with the slider to find the region
    // and type to reproduce a value exactly.
    const readout = el('input', {
      class: 'param-number',
      type: 'number',
      value: fmt(value, spec.step),
      step: spec.step ?? 0.01,
      min: spec.min,
      max: spec.max,
    });

    const slider = el('input', {
      class: 'param-slider',
      type: 'range',
      min: spec.min ?? 0,
      max: spec.max ?? 1,
      step: spec.step ?? 0.01,
      value,
    });

    const commit = (raw) => {
      let next = Number(raw);
      if (!Number.isFinite(next)) return;
      if (spec.min !== undefined) next = Math.max(spec.min, next);
      if (spec.max !== undefined) next = Math.min(spec.max, next);
      slider.value = next;
      readout.value = fmt(next, spec.step);
      sim.setParam(spec.key, next);
    };

    slider.addEventListener('input', (event) => commit(event.target.value));
    readout.addEventListener('change', (event) => commit(event.target.value));

    const row = el('div', { class: `param${spec.rebuild ? ' param-rebuild' : ''}` }, [
      el('div', { class: 'param-head' }, [
        el('span', { class: 'param-label', text: spec.label, title: spec.help ?? '' }),
        el('span', { class: 'param-unit', text: spec.unit ?? '' }),
        readout,
      ]),
      slider,
      // Parameters that describe the vehicle as built cannot change mid-flight
      // without making the run describe something that never existed, so the
      // control says so rather than silently restarting.
      spec.rebuild ? el('span', { class: 'param-note', text: 'restarts the run' }) : null,
      spec.help ? el('p', { class: 'param-help', text: spec.help }) : null,
    ]);

    this.controls.set(spec.key, {
      spec,
      set: (v) => {
        slider.value = v;
        readout.value = fmt(v, spec.step);
      },
    });
    return row;
  }

  // Pushes external parameter changes (a share link, a preset) back into the
  // controls without firing their change handlers.
  syncFromParams(params) {
    for (const [key, control] of this.controls) {
      if (key in params) control.set(params[key]);
    }
  }

  // Live readouts, rebuilt from the plugin's inspect() every frame it is
  // visible. Rebuilding the DOM at 60 Hz would be wasteful, so rows are
  // created once per section shape and only their values are written after.
  updateLive(sections) {
    const root = this.liveRoot;
    if (!root) return;

    const signature = sections.map((s) => `${s.title}:${s.rows.length}`).join('|');
    if (signature !== this._liveSignature) {
      clear(root);
      this._liveRows = [];
      for (const section of sections) {
        const body = el('div', { class: 'inspect-body' });
        for (const row of section.rows) {
          const valueNode = el('span', { class: 'readout-value' });
          body.append(
            el('div', { class: 'readout' }, [
              el('span', { class: 'readout-label', text: row.label }),
              valueNode,
            ]),
          );
          this._liveRows.push(valueNode);
        }
        root.append(
          el('section', { class: 'inspect-section' }, [
            el('h4', { text: section.title }),
            body,
          ]),
        );
      }
      this._liveSignature = signature;
    }

    let i = 0;
    for (const section of sections) {
      for (const row of section.rows) {
        const node = this._liveRows[i++];
        const text =
          typeof row.value === 'number'
            ? formatValue(row.value, row.precision ?? 2, row.unit ?? '')
            : String(row.value);
        if (node.textContent !== text) node.textContent = text;
        const cls = `readout-value${row.status ? ` is-${row.status}` : ''}`;
        if (node.className !== cls) node.className = cls;
      }
    }
  }

  // The outcome card. Status is carried by a glyph and a word as well as by
  // colour, so it survives a colourblind reader, a greyscale print, and
  // forced-colors mode.
  updateVerdict(verdict) {
    const root = this.verdictRoot;
    if (!root) return;

    if (!verdict) {
      if (root.childNodes.length) clear(root);
      this._verdictSignature = null;
      return;
    }

    const signature = JSON.stringify(verdict);
    if (signature === this._verdictSignature) return;
    this._verdictSignature = signature;

    clear(root);
    root.append(
      el('div', { class: `verdict is-${verdict.status}` }, [
        el('div', { class: 'verdict-head' }, [
          el('span', {
            class: 'verdict-glyph',
            text: STATUS_GLYPH[verdict.status] ?? '•',
            style: { color: STATUS[verdict.status] ?? 'inherit' },
          }),
          el('strong', { text: verdict.headline }),
        ]),
        el(
          'div',
          { class: 'verdict-rows' },
          (verdict.rows ?? []).map((row) =>
            el('div', { class: 'readout' }, [
              el('span', { class: 'readout-label', text: row.label }),
              el('span', {
                class: `readout-value${row.status ? ` is-${row.status}` : ''}`,
                text:
                  typeof row.value === 'number'
                    ? formatValue(row.value, row.precision ?? 2, row.unit ?? '')
                    : String(row.value),
              }),
            ]),
          ),
        ),
        // The threshold each number was judged against, spelled out. A verdict
        // that does not show its criteria is an opinion.
        verdict.criteria ? el('p', { class: 'verdict-criteria', text: verdict.criteria }) : null,
      ]),
    );
  }
}

// Matches the displayed precision to the control's own step, so a slider with
// step 0.001 does not show a value rounded to two places.
function fmt(value, step = 0.01) {
  if (!Number.isFinite(value)) return '0';
  const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step || 0.01))));
  return value.toFixed(decimals);
}

export default Inspector;
