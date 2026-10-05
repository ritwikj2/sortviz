import { ALGORITHMS, seededShuffle } from './algorithms.js';

const imageInput = document.getElementById('image-input');
const imageMessage = document.getElementById('image-message');
const preview = document.getElementById('preview');
const gridInput = document.getElementById('grid-size');
const seedInput = document.getElementById('seed');
const speedInput = document.getElementById('speed');
const speedOutput = document.getElementById('speed-value');
const playButton = document.getElementById('play');
const stepButton = document.getElementById('step');
const options = document.getElementById('algorithm-options');
const panelContainer = document.getElementById('panels');
const raceStatus = document.getElementById('race-status');
const numberFormat = new Intl.NumberFormat();
const rootStyles = getComputedStyle(document.documentElement);
const compareColor = rootStyles.getPropertyValue('--compare').trim();
const writeColor = rootStyles.getPropertyValue('--write').trim();

let source;
let gridSize;
let shuffled = [];
let panels = [];
let playing = false;
let animationFrame = null;
let loadingImage = false;
let imageRequest = 0;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeDemo() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 768;
  const ctx = canvas.getContext('2d');
  ctx.scale(768, 768);
  const sky = ctx.createLinearGradient(0, 0, 1, 1);
  sky.addColorStop(0, '#264b70');
  sky.addColorStop(0.46, '#86bec3');
  sky.addColorStop(1, '#f1c599');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#ffdf94';
  ctx.beginPath();
  ctx.arc(0.72, 0.29, 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#587f8f';
  ctx.beginPath();
  ctx.moveTo(0, 0.56);
  ctx.lineTo(0.31, 0.28);
  ctx.lineTo(0.58, 0.58);
  ctx.lineTo(0.9, 0.43);
  ctx.lineTo(1, 0.54);
  ctx.lineTo(1, 1);
  ctx.lineTo(0, 1);
  ctx.fill();
  for (let layer = 0; layer < 8; layer++) {
    const top = 0.5 + layer * 0.07;
    ctx.fillStyle = ['#286c73', '#35847d', '#76a48a', '#d3ba86', '#e3a46e', '#ce805e', '#945c52', '#543e49'][layer];
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.bezierCurveTo(0.3, top + 0.23, 0.62, top - 0.18, 1, top + 0.08);
    ctx.lineTo(1, 1);
    ctx.lineTo(0, 1);
    ctx.fill();
  }
  return canvas;
}

function showImageMessage(message, error = false) {
  imageMessage.textContent = message;
  imageMessage.dataset.error = String(error);
}

function drawPreview() {
  // Match the preview's 104px desktop size in index.html and styles.css.
  preview.width = preview.height = Math.round(104 * (window.devicePixelRatio || 1));
  const ctx = preview.getContext('2d');
  ctx.drawImage(source, 0, 0, preview.width, preview.height);
}

async function loadImage(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showImageMessage('Choose an image file, or drop one here.', true);
    return;
  }
  const request = ++imageRequest;
  pause();
  loadingImage = true;
  updateControls();
  showImageMessage('Loading image…');
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    await image.decode();
    if (request !== imageRequest) return;
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) throw new Error('Empty image');
    const crop = Math.min(width, height);
    const scale = Math.min(1, 1024 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.max(1, Math.round(crop * scale));
    canvas.getContext('2d').drawImage(
      image, (width - crop) / 2, (height - crop) / 2, crop, crop,
      0, 0, canvas.width, canvas.height,
    );
    source = canvas;
    drawPreview();
    resetRace();
    showImageMessage('Image ready · centered square. Drop or paste to replace it.');
  } catch (error) {
    console.error('Could not load image:', error);
    if (request === imageRequest) {
      showImageMessage('Could not decode that image. Try another image file.', true);
    }
  } finally {
    URL.revokeObjectURL(url);
    if (request === imageRequest) {
      loadingImage = false;
      updateControls();
    }
  }
}

function useDemo() {
  imageRequest++;
  loadingImage = false;
  source = makeDemo();
  imageInput.value = '';
  drawPreview();
  resetRace();
  showImageMessage('Demo landscape · drop or paste your own image anywhere.');
}

function panelPixels() {
  return Math.round(320 * (window.devicePixelRatio || 1));
}

function tileBounds(panel, index) {
  const size = panel.canvas.width;
  const column = index % gridSize;
  const row = Math.floor(index / gridSize);
  const x = Math.round(column * size / gridSize);
  const y = Math.round(row * size / gridSize);
  return {
    x, y,
    width: Math.round((column + 1) * size / gridSize) - x,
    height: Math.round((row + 1) * size / gridSize) - y,
  };
}

function drawTile(panel, index) {
  const { x, y, width, height } = tileBounds(panel, index);
  const key = panel.array[index];
  const tileSize = source.width / gridSize;
  panel.ctx.clearRect(x, y, width, height);
  panel.ctx.drawImage(
    source, (key % gridSize) * tileSize, Math.floor(key / gridSize) * tileSize,
    tileSize, tileSize, x, y, width, height,
  );
}

function renderPanel(panel, full = false) {
  if (full) {
    for (let i = 0; i < panel.array.length; i++) drawTile(panel, i);
  } else {
    for (const index of panel.dirty) drawTile(panel, index);
  }
  panel.dirty.clear();
  if (panel.highlight) {
    panel.ctx.strokeStyle = panel.highlight.type === 'compare' ? compareColor : writeColor;
    panel.ctx.lineWidth = Math.max(1, 1.5 * (window.devicePixelRatio || 1));
    const inset = panel.ctx.lineWidth / 2;
    for (const index of panel.highlight.indices) {
      const { x, y, width, height } = tileBounds(panel, index);
      panel.ctx.strokeRect(x + inset, y + inset, width - inset * 2, height - inset * 2);
    }
  }
  for (const key of ['comparisons', 'writes', 'steps']) {
    panel.counters[key].textContent = numberFormat.format(panel[key]);
  }
}

function setStatus(panel, status) {
  panel.status = status;
  panel.badge.dataset.status = status;
  panel.badge.textContent = status === 'gave-up' ? 'Gave up' : status[0].toUpperCase() + status.slice(1);
  panel.badge.title = status === 'done' ? `Finished in ${numberFormat.format(panel.steps)} steps` : '';
}

function createPanel(algorithm) {
  const article = element('article', 'panel');
  article.dataset.algorithm = algorithm.id;
  const heading = element('div', 'panel-heading');
  const titleGroup = element('div');
  const title = element('h2', '', algorithm.name);
  title.id = `title-${algorithm.id}`;
  article.setAttribute('aria-labelledby', title.id);
  titleGroup.append(title, element('p', 'complexity', algorithm.complexity));
  const badge = element('span', 'badge', 'Idle');
  heading.append(titleGroup, badge);
  const canvas = element('canvas', 'picture');
  canvas.width = canvas.height = panelPixels();
  canvas.setAttribute('aria-label', `${algorithm.name} panel`);
  canvas.setAttribute('role', 'img');
  const stats = element('dl', 'stats');
  const counters = {};
  for (const [key, label] of [['comparisons', 'Comparisons'], ['writes', 'Writes'], ['steps', 'Steps']]) {
    const group = element('div');
    counters[key] = element('dd', '', '0');
    counters[key].dataset.stat = key;
    group.append(element('dt', '', label), counters[key]);
    stats.append(group);
  }
  article.append(heading, canvas, stats);
  const array = shuffled.slice();
  const panel = {
    name: algorithm.name,
    article, canvas, ctx: canvas.getContext('2d'), badge, counters,
    array, generator: algorithm.run(array), dirty: new Set(), highlight: null,
    comparisons: 0, writes: 0, steps: 0, complete: false, status: 'idle',
  };
  setStatus(panel, 'idle');
  renderPanel(panel, true);
  return panel;
}

function updateControls() {
  const finished = panels.filter((panel) => panel.complete).length;
  const unavailable = loadingImage || !panels.length || finished === panels.length;
  playButton.disabled = stepButton.disabled = unavailable;
  playButton.textContent = playing ? 'Pause' : 'Play';
  playButton.setAttribute('aria-pressed', String(playing));
  document.getElementById('empty-state').hidden = panels.length !== 0;
  document.getElementById('selection-count').textContent = `${panels.length} selected`;
  let message = `${panels.length} ready · ${numberFormat.format(gridSize ** 2)} tiles each`;
  if (!panels.length) message = 'Choose your lineup';
  else if (finished === panels.length) message = 'Race complete';
  else if (playing) message = `Running · ${finished} of ${panels.length} finished`;
  else if (panels.some((panel) => panel.steps)) message = `Paused · ${finished} of ${panels.length} finished`;
  const gaveUp = panels.filter((panel) => panel.status === 'gave-up').length;
  const errors = panels.filter((panel) => panel.status === 'error').length;
  if (gaveUp) message += ` · ${gaveUp} gave up`;
  if (errors) message += ` · ${errors} error`;
  if (raceStatus.textContent !== message) raceStatus.textContent = message;
}

function pause() {
  playing = false;
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  for (const panel of panels) {
    if (!panel.complete) setStatus(panel, panel.steps ? 'paused' : 'idle');
  }
  updateControls();
}

function resetRace() {
  pause();
  const selected = new Set(Array.from(options.querySelectorAll('input:checked'), (input) => input.value));
  panels = ALGORITHMS.filter(({ id }) => selected.has(id)).map(createPanel);
  panelContainer.replaceChildren(...panels.map((panel) => panel.article));
  updateControls();
}

function reshuffle() {
  shuffled = seededShuffle(gridSize ** 2, seedInput.value);
  resetRace();
}

function newShuffle() {
  seedInput.value = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  reshuffle();
}

function readGridSize() {
  gridSize = Math.min(32, Number(gridInput.value) || 12);
  gridInput.value = String(gridSize);
}

function advancePanel(panel, budget) {
  if (panel.complete) return;
  setStatus(panel, playing ? 'running' : 'paused');
  if (panel.highlight) {
    for (const index of panel.highlight.indices) panel.dirty.add(index);
  }
  try {
    for (let step = 0; step < budget; step++) {
      const result = panel.generator.next();
      if (result.done) {
        panel.complete = true;
        panel.highlight = null;
        if (result.value?.gaveUp) setStatus(panel, 'gave-up');
        else setStatus(panel, panel.array.every((value, i) => value === i) ? 'done' : 'error');
        break;
      }
      const event = result.value;
      panel.steps++;
      const indices = event.type === 'write' ? [event.i] : [event.i, event.j];
      if (event.type === 'compare') panel.comparisons++;
      else {
        panel.writes += event.type === 'swap' ? 2 : 1;
        for (const index of indices) panel.dirty.add(index);
      }
      panel.highlight = { type: event.type, indices };
    }
  } catch (error) {
    console.error(`${panel.name} failed:`, error);
    panel.complete = true;
    panel.highlight = null;
    setStatus(panel, 'error');
  }
  if (panel.highlight) {
    for (const index of panel.highlight.indices) panel.dirty.add(index);
  }
  renderPanel(panel);
}

function advance(budget) {
  for (const panel of panels) advancePanel(panel, budget);
  updateControls();
}

function animate() {
  animationFrame = null;
  if (!playing) return;
  const min = Number(speedInput.min);
  const max = Number(speedInput.max);
  advance(Math.max(min, Math.min(max, Number(speedInput.value) || min)));
  if (panels.every((panel) => panel.complete)) pause();
  else animationFrame = requestAnimationFrame(animate);
}

function togglePlay() {
  if (playing) {
    pause();
  } else if (!playButton.disabled) {
    playing = true;
    for (const panel of panels) {
      if (!panel.complete) setStatus(panel, 'running');
    }
    updateControls();
    animationFrame = requestAnimationFrame(animate);
  }
}

function stepOnce() {
  if (stepButton.disabled) return;
  pause();
  advance(1);
}

for (const algorithm of ALGORITHMS) {
  const label = element('label', 'algorithm-option');
  const input = element('input');
  input.type = 'checkbox';
  input.value = algorithm.id;
  input.checked = algorithm.enabledByDefault;
  label.append(input, element('span', '', algorithm.name));
  options.append(label);
}

options.addEventListener('change', resetRace);
playButton.addEventListener('click', togglePlay);
stepButton.addEventListener('click', stepOnce);
document.getElementById('reset').addEventListener('click', resetRace);
document.getElementById('shuffle').addEventListener('click', newShuffle);
document.getElementById('demo').addEventListener('click', useDemo);
imageInput.addEventListener('change', () => {
  loadImage(imageInput.files[0]);
  imageInput.value = '';
});
seedInput.addEventListener('change', reshuffle);
seedInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') reshuffle();
});
gridInput.addEventListener('change', () => {
  readGridSize();
  reshuffle();
});
if (matchMedia('(prefers-reduced-motion: reduce)').matches) speedInput.value = '4';
// Match the mobile breakpoint in styles.css.
document.querySelector('.lineup').open = !matchMedia('(max-width: 620px)').matches;
function updateSpeed() {
  speedOutput.textContent = `${speedInput.value} steps / frame`;
}
speedInput.addEventListener('input', updateSpeed);
updateSpeed();

document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.target.closest('input:not([type="checkbox"]):not([type="range"]):not([type="file"]), textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  if (event.key === ' ' && event.target.closest('button, a, summary, input')) return;
  if (event.key === 'ArrowRight' && event.target.matches('input[type="range"]')) return;
  const actions = { ' ': togglePlay, ArrowRight: stepOnce, r: resetRace, s: newShuffle };
  const action = actions[event.key] || actions[event.key.toLowerCase()];
  if (action) {
    event.preventDefault();
    action();
  }
});

let dragDepth = 0;
document.addEventListener('dragenter', (event) => {
  if (!Array.from(event.dataTransfer.types).includes('Files')) return;
  event.preventDefault();
  dragDepth++;
  document.body.classList.add('dragging');
});
document.addEventListener('dragover', (event) => {
  if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault();
});
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) document.body.classList.remove('dragging');
});
document.addEventListener('drop', (event) => {
  dragDepth = 0;
  document.body.classList.remove('dragging');
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files);
  loadImage(files.find((file) => file.type.startsWith('image/')) || files[0]);
});
document.addEventListener('paste', (event) => {
  const item = Array.from(event.clipboardData?.items || []).find((entry) => entry.type.startsWith('image/'));
  if (item) {
    event.preventDefault();
    loadImage(item.getAsFile());
  }
});
window.addEventListener('resize', () => {
  const pixels = panelPixels();
  for (const panel of panels) {
    if (panel.canvas.width !== pixels) {
      panel.canvas.width = panel.canvas.height = pixels;
      renderPanel(panel, true);
    }
  }
  drawPreview();
});

readGridSize();
source = makeDemo();
drawPreview();
newShuffle();
