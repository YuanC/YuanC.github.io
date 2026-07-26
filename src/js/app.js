/* Node Layout Implementation */

import { forceSimulation, forceCollide, forceManyBody, forceX, forceY } from 'd3-force';
import { select } from 'd3-selection';

import { initModal, openModal, closeModal, isModalOpen } from './modal.js';

const STATE = { VIEW: 0, MODAL: 1, MODAL_OPENING: 2, MODAL_CLOSING: 3 };

const TOOLTIP_PADDING = [16, 12];
const RESIZE_DEBOUNCE_MS = 150;
/* Clamp the frame delta so a backgrounded tab does not resume with one huge step. */
const MAX_FRAME_SECONDS = 1 / 15;

const data = { nodes: [], colours: {}, sizes: {}, backgroundColours: [] };
const forces = { collide: null, manyBody: null, x: null, y: null };
const svgs = {
  borders: null,
  circles: null,
  transition: { el: null, node: null, rCurrent: 0, rTarget: 0 },
  titleTooltipText: null,
  titleTooltipRect: null
};

let desktop, svg, simulation, config;
let width = 0;
let height = 0;
let hovernode = null;
let animationId = null;
let inFrame = false;
let wakeRequested = false;
let lastFrameTime = 0;
let resizeTimer = null;
let state = STATE.VIEW;

/* Load data */
async function init () {
  desktop = document.getElementById('desktop');

  let resdata;
  try {
    const response = await fetch('dist/data/nodedata.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    resdata = await response.json();
  } catch (error) {
    showLoadError(error);
    return;
  }

  data.nodes = resdata.nodes;
  data.colours = resdata.colours;
  data.sizes = resdata.sizes;
  data.backgroundColours = resdata.backgroundColours;
  config = resdata.config;

  initModal({ onClose: onModalClosed });

  svg = select(desktop).append('svg')
    .attr('role', 'group')
    .attr('aria-label', 'Project gallery');

  width = desktop.clientWidth;
  height = desktop.clientHeight;

  // Set initial position, size, and a stable id for each node's image pattern.
  data.nodes.forEach((n, i) => {
    n.r = data.sizes[n.size];
    n.rDefault = n.r;
    n.x = (Math.random() * config.SPAWN_RANGE - config.SPAWN_RANGE / 2) + width / 2;
    n.y = (Math.random() * config.SPAWN_RANGE - config.SPAWN_RANGE / 2) + height / 2;
    n.patternId = `node-pattern-${i}`;
  });

  state = STATE.VIEW;
  randomizeBackground();
  redraw();

  window.addEventListener('resize', onResize);
}

/* Initialize/restart instance */
function redraw () {
  // Selections are about to be torn down, so drop anything pointing into them.
  if (hovernode) {
    hovernode.r = hovernode.rDefault;
    hovernode = null;
  }
  svgs.titleTooltipText = null;
  svgs.titleTooltipRect = null;

  svg.selectAll('*').remove();

  simulation = forceSimulation();
  simulation.stop(); // ticks are driven by renderFrame, not d3's internal timer

  // Sizing svg
  width = desktop.clientWidth;
  height = desktop.clientHeight;
  svg.attr('width', width).attr('height', height);

  resetForces();

  simulation
    .nodes(data.nodes)
    .force('manyBody', forces.manyBody)
    .force('x', forces.x)
    .force('y', forces.y)
    .force('collide', forces.collide)
    .velocityDecay(0.6);

  // Image fills. These attributes never change, so they are set once here
  // rather than on every frame.
  const patterns = svg.append('defs')
    .selectAll('pattern')
    .data(data.nodes)
    .enter().append('pattern')
    .attr('class', 'img-patterns')
    .attr('id', n => n.patternId)
    .attr('patternContentUnits', 'objectBoundingBox')
    .attr('viewBox', '0 0 1 1')
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .attr('width', '100%')
    .attr('height', '100%');

  patterns.append('image')
    .attr('xlink:href', n => n.img)
    .attr('width', '1')
    .attr('height', '1')
    .attr('preserveAspectRatio', 'xMidYMid slice');

  const node = svg.selectAll('.node')
    .data(data.nodes)
    .enter().append('g')
    .attr('class', 'node')
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', n => n.name);

  node.append('circle')
    .attr('class', 'border-circle')
    .style('fill', n => data.colours[n.category].primary);

  node.append('circle')
    .attr('class', 'img-circle')
    .style('fill', n => `url(#${n.patternId})`);

  svg.append('circle').attr('id', 'transition-circle').attr('r', 0);

  svgs.borders = node.selectAll('.border-circle');
  svgs.circles = node.selectAll('.img-circle');
  svgs.transition.el = svg.select('#transition-circle');

  // A resize can land while the modal is up; rebuild the wipe circle to match
  // the new viewport instead of leaving a stale radius behind.
  if (state !== STATE.VIEW && svgs.transition.node) {
    const n = svgs.transition.node;
    svgs.transition.rTarget = transitionRadius(n.x, n.y, width, height);
    if (state === STATE.MODAL) svgs.transition.rCurrent = svgs.transition.rTarget;
    svgs.transition.el
      .style('fill', data.colours[n.category].primary)
      .attr('cx', n.x)
      .attr('cy', n.y)
      .attr('r', Math.max(svgs.transition.rCurrent, 0));
  }

  /* POINTER, FOCUS AND KEYBOARD EVENTS */
  node
    .on('pointerenter', onNodeEnter)
    .on('pointerleave', onNodeLeave)
    .on('focus', onNodeEnter)
    .on('blur', onNodeLeave)
    .on('click', onNodeActivate)
    .on('keydown', onNodeKeyDown);

  simulation.nodes(data.nodes).alpha(1);
  if (state !== STATE.MODAL) startLoop();
}

/* Frame */
function renderFrame (now) {
  animationId = null;
  inFrame = true;
  wakeRequested = false;

  const dt = Math.min((now - lastFrameTime) / 1000, MAX_FRAME_SECONDS);
  lastFrameTime = now;

  // Kept true while there is still something to animate. When it ends up false
  // the loop parks itself instead of burning frames on a settled layout.
  let busy = false;
  const transitionSpeed = svgs.transition.rTarget / config.TRANSITION_DURATION;

  switch (state) {
    case STATE.MODAL_OPENING:
      svgs.transition.rCurrent += transitionSpeed * dt;

      if (svgs.transition.rCurrent >= svgs.transition.rTarget) {
        svgs.transition.el.attr('r', svgs.transition.rTarget);
        state = STATE.MODAL;
        randomizeBackground();
        openModal(svgs.transition.node, data.colours);
      } else {
        svgs.transition.el.attr('r', svgs.transition.rCurrent);
        busy = true;
      }
      break;

    case STATE.MODAL_CLOSING:
      svgs.transition.rCurrent -= transitionSpeed * dt;
      busy = true;

      if (svgs.transition.rCurrent <= svgs.transition.node.r) {
        svgs.transition.el.attr('r', 0);
        state = STATE.VIEW;
      } else {
        svgs.transition.el.attr('r', svgs.transition.rCurrent);
      }
      break;

    case STATE.MODAL:
      break; // the modal covers the graph; nothing underneath needs drawing

    default:
      if (simulation.alpha() > simulation.alphaMin()) {
        simulation.tick();
        busy = true;
      }
      drawNodes();
  }

  inFrame = false;

  // wakeRequested covers handlers that fired during this frame (openModal moves
  // focus, which blurs a node); without it their startLoop() would be swallowed.
  if (busy || wakeRequested) {
    animationId = window.requestAnimationFrame(renderFrame);
  }
}

function drawNodes () {
  svgs.borders
    .attr('r', n => n.r)
    .attr('cx', n => n.x)
    .attr('cy', n => n.y);

  svgs.circles
    .attr('r', n => n.r - (n === hovernode ? config.IMG_BORDER_FOCUS : config.IMG_BORDER))
    .attr('cx', n => n.x)
    .attr('cy', n => n.y);

  if (hovernode && svgs.titleTooltipText) {
    const x = hovernode.x;
    const y = hovernode.y - hovernode.r - config.IMG_BORDER_FOCUS;
    svgs.titleTooltipText.attr('x', x).attr('y', y);
    svgs.titleTooltipRect.attr('x', x).attr('y', y);
  }
}

/* NODE INTERACTION */

function onNodeEnter (event, n) {
  if (hovernode === n || state !== STATE.VIEW) return;

  if (hovernode) hovernode.r = hovernode.rDefault;

  n.r = n.rDefault + config.HOVER_RAD_CHANGE;
  hovernode = n;
  showTooltip(n);
  wakeSimulation();
}

function onNodeLeave (event, n) {
  if (hovernode !== n) return;

  n.r = n.rDefault;
  hovernode = null;
  removeTooltip();
  wakeSimulation();
}

function onNodeActivate (event, n) {
  if (state !== STATE.VIEW) return;

  svgs.transition.node = n;
  svgs.transition.rCurrent = n.r;
  svgs.transition.rTarget = transitionRadius(n.x, n.y, width, height);

  svgs.transition.el
    .style('fill', data.colours[n.category].primary)
    .attr('cx', n.x)
    .attr('cy', n.y)
    .attr('r', svgs.transition.rCurrent);

  state = STATE.MODAL_OPENING;
  startLoop();
}

function onNodeKeyDown (event, n) {
  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
  event.preventDefault(); // stop Space from scrolling the page
  onNodeActivate(event, n);
}

function onModalClosed () {
  if (state !== STATE.MODAL) return;
  state = STATE.MODAL_CLOSING;
  startLoop();
}

/* TOOLTIP */

function showTooltip (n) {
  removeTooltip();

  svgs.titleTooltipText = svg.append('text')
    .style('fill', data.colours[n.category].secondary)
    .attr('font-weight', 600)
    .attr('text-anchor', 'middle')
    .attr('aria-hidden', 'true')
    .text(n.name);

  const bbox = svgs.titleTooltipText.node().getBBox();
  const [padX, padY] = TOOLTIP_PADDING;
  const pillWidth = bbox.width + padX;
  const pillHeight = bbox.height + padY;

  // The pill shares the label's x/y, so the offset has to centre it on the
  // glyphs: the text is anchor-middle horizontally, and bbox.y is the glyph top
  // measured from the baseline (negative), so half the padding sits either side.
  svgs.titleTooltipRect = svg.insert('rect', 'text')
    .style('fill', data.colours[n.category].primary)
    .style('rx', '4')
    .attr('aria-hidden', 'true')
    .attr('transform', `translate(${-pillWidth / 2}, ${bbox.y - padY / 2})`)
    .attr('width', pillWidth)
    .attr('height', pillHeight);
}

/* Safe to call repeatedly: touch fires enter/leave in pairs that can overlap
   with focus/blur from the same tap. */
function removeTooltip () {
  if (svgs.titleTooltipText) {
    svgs.titleTooltipText.remove();
    svgs.titleTooltipText = null;
  }
  if (svgs.titleTooltipRect) {
    svgs.titleTooltipRect.remove();
    svgs.titleTooltipRect = null;
  }
}

/* SIMULATION */

/* When data changes */
function resetForces () {
  forces.collide = forceCollide()
    .radius(n => n.r + config.NODE_MARGIN)
    .iterations(40)
    .strength(config.FORCE_COLLIDE_STR);

  forces.manyBody = forceManyBody().strength(config.FORCE_MANYBODY_STR);

  forces.x = forceX(width / 2).strength(config.FORCE_XY_STR);
  forces.y = forceY(height / 2).strength(config.FORCE_XY_STR);
}

/* Re-heat the layout and make sure frames are being produced again */
function wakeSimulation () {
  simulation.nodes(data.nodes);
  simulation.alpha(1);
  startLoop();
}

function startLoop () {
  // Re-arm at the end of the current frame rather than queueing a second one.
  if (inFrame) {
    wakeRequested = true;
    return;
  }
  if (animationId !== null) return;
  lastFrameTime = window.performance.now();
  animationId = window.requestAnimationFrame(renderFrame);
}

function stopLoop () {
  wakeRequested = false;
  if (animationId === null) return;
  window.cancelAnimationFrame(animationId);
  animationId = null;
}

/* MISC */

function onResize () {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    stopLoop();
    redraw();
  }, RESIZE_DEBOUNCE_MS);
}

function randomizeBackground () {
  const colours = data.backgroundColours;
  const colour = colours[Math.floor(Math.random() * colours.length)];
  desktop.style.background = `radial-gradient(transparent, ${colour})`;
}

function transitionRadius (x, y, w, h) {
  const corners = [[0, 0], [0, h], [w, 0], [w, h]];
  return Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
}

function showLoadError (error) {
  const banner = document.getElementById('load-error');
  const detail = document.getElementById('load-error-detail');

  // Opening index.html straight off disk is the common case: browsers refuse to
  // fetch a local JSON file from a file:// origin, so say so rather than
  // blaming the network.
  if (detail) {
    detail.textContent = window.location.protocol === 'file:'
      ? 'This page was opened directly from disk (file://), and browsers block loading local data files that way. Serve the folder over HTTP instead — from the project root run "npm run dev", then open the URL it prints.'
      : `Something went wrong fetching the project data (${error}). Try reloading the page.`;
  }

  if (banner) banner.hidden = false;
  if (desktop) desktop.hidden = true;
  console.error('Could not load project data:', error);
}

// Keyboard users can also leave the modal with Escape from anywhere on the page.
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isModalOpen()) closeModal();
});

init();
