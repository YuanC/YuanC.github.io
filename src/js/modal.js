/* Project detail panel. Owns its own DOM, focus handling and keyboard traps;
   the graph talks to it only through open/close and the onClose callback. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

const el = {};

let onCloseRequest = null;
let lastFocused = null;
let isOpen = false;

export function initModal ({ onClose }) {
  onCloseRequest = onClose;

  el.root = document.getElementById('modal');
  el.container = el.root.querySelector('.container');
  el.title = el.root.querySelector('.name');
  el.tech = el.root.querySelector('.tech');
  el.time = el.root.querySelector('.time');
  el.picture = el.root.querySelector('.picture');
  el.description = el.root.querySelector('.description');
  el.links = el.root.querySelector('.links');
  el.closeButton = el.root.querySelector('#modalCloseButton');

  el.closeButton.addEventListener('click', closeModal);
  el.root.addEventListener('keydown', onKeyDown);
}

export function isModalOpen () {
  return isOpen;
}

export function openModal (node, colours) {
  lastFocused = document.activeElement;

  render(node, colours);

  el.root.classList.add('modal-show');
  el.root.removeAttribute('aria-hidden');
  isOpen = true;

  // Long descriptions must start at the top. Focus the dialog itself rather
  // than a control at the bottom, and suppress the browser's scroll-into-view,
  // or opening a tall project lands the reader at the end of the panel.
  el.root.scrollTop = 0;
  el.container.scrollTop = 0;
  el.root.focus({ preventScroll: true });
}

export function closeModal () {
  if (!isOpen) return;

  isOpen = false;
  el.root.classList.remove('modal-show');
  el.root.setAttribute('aria-hidden', 'true');

  // Send focus back to the node that opened us so keyboard users keep their place.
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  lastFocused = null;

  if (onCloseRequest) onCloseRequest();
}

function render (node, colours) {
  const { primary, secondary } = colours[node.category];

  el.root.style.backgroundColor = primary;
  el.root.style.color = secondary;
  el.root.style.borderColor = secondary;

  el.title.textContent = node.name;
  el.time.textContent = `${MONTHS[node.month]} ${node.year}`;

  // Descriptions are authored by hand in nodedata.json and may contain markup.
  el.description.innerHTML = node.description;

  el.picture.style.backgroundImage = `url("${node.img}")`;
  el.picture.setAttribute('aria-label', `Screenshot of ${node.name}`);

  el.closeButton.style.color = secondary;
  el.closeButton.style.borderColor = secondary;

  const technologies = node.technologies || [];
  el.tech.textContent = technologies.join(', ');
  el.tech.classList.toggle('hidden', technologies.length === 0);

  renderLinks(node.links || [], secondary);
}

function renderLinks (links, accent) {
  el.links.textContent = '';

  for (const link of links) {
    const anchor = document.createElement('a');
    anchor.textContent = link.source;
    anchor.href = link.link;
    anchor.style.color = accent;
    anchor.style.borderColor = accent + '38';

    // Only external pages get a new tab; mailto: and local downloads stay put.
    if (/^https?:/i.test(link.link)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }

    el.links.appendChild(anchor);
  }
}

function onKeyDown (event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (event.key !== 'Tab') return;

  // Keep tabbing inside the dialog while it is up.
  const focusable = el.root.querySelectorAll('a[href], button');
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  // The dialog itself holds focus on open, so shift-tabbing off it wraps too.
  if (event.shiftKey && (active === first || active === el.root)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
