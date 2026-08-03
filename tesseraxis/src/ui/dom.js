// Small DOM helpers.
//
// The shell is built imperatively rather than through a framework: this app
// ships as plain modules with no build step, and a hand-rolled 40-line element
// helper is a better trade here than pulling a runtime in for what amounts to
// a few hundred nodes that mostly update their text content.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'style') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined && value !== false) {
      node.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const qs = (selector, root = document) => root.querySelector(selector);

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// Number formatting for readouts.
//
// Engineering values here span from 1e-3 (gimbal radians) to 1e6 (thrust in
// newtons) and a single toFixed cannot serve both. Switching on magnitude keeps
// a column of readouts the same width without ever showing "0.00" for a value
// that is merely small.
export function formatValue(value, precision = 2, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  let text;
  if (abs >= 1e6) text = `${(value / 1e6).toFixed(2)}M`;
  else if (abs >= 1e4) text = `${(value / 1e3).toFixed(1)}k`;
  else if (abs !== 0 && abs < 1e-3) text = value.toExponential(1);
  else text = value.toFixed(precision);
  return unit ? `${text} ${unit}` : text;
}

// mm:ss.mmm — mission-clock style, so the timeline and the event log read the
// same way a flight log does.
export function formatClock(seconds) {
  const sign = seconds < 0 ? '-' : '+';
  const abs = Math.abs(seconds);
  const minutes = Math.floor(abs / 60);
  const rest = abs - minutes * 60;
  return `T${sign}${String(minutes).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
}

// A labelled readout row: label on the left, value right-aligned in tabular
// figures so a column of them lines up.
export function readout(label, value, options = {}) {
  return el('div', { class: 'readout' }, [
    el('span', { class: 'readout-label', text: label }),
    el('span', {
      class: `readout-value${options.status ? ` is-${options.status}` : ''}`,
      text: value,
      title: options.title ?? '',
    }),
  ]);
}
