/***** ICON BUILDER *****/
export function icon(name, size = 16, attrs = {}) {
  let style = `width:${size}px;height:${size}px;`;
  if (attrs.color) style += `color:${attrs.color};`;
  const styleAttr = style + (attrs.style || '');
  return `<svg class="icon" style="${styleAttr}" aria-hidden="true"><use href="assets/icons.svg#${name}"/></svg>`;
}

export function iconEl(name, size = 16, attrs = {}) {
  const div = document.createElement('div');
  div.innerHTML = icon(name, size, attrs);
  return div.firstElementChild;
}
