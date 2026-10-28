const paths = {
  ship: '<path d="M4 12 12 9l8 3-2 7H6zM8 10V5h8v5M12 2v3M3 21c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/>',
  review: '<path d="M7 3h10l3 3v15H4V3zM8 9h8M8 13h8M8 17h5"/>',
  route: '<path d="M5 19V9a4 4 0 0 1 4-4h6M12 2l3 3-3 3M9 19h10V9M16 12l3-3 3 3"/><circle cx="5" cy="19" r="2"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
  settings: '<path d="m9 3 1-2h4l1 2 3 2 2 1v4l-2 1-1 3 1 2-3 3-2-1h-3l-2 1-3-3 1-2-1-3-2-1V6l2-1z" transform="translate(0 1)"/><circle cx="12" cy="10" r="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7 4.8l10 5.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  rotate: '<ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="4" ry="9"/>',
  frame: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>'
};
export function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cube}</svg>`; }
export function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
