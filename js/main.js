const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
const toast = document.querySelector('[data-toast]');

const updateHeader = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 28);
};

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuToggle?.addEventListener('click', () => {
  const isOpen = header.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    header.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px' });

document.querySelectorAll('[data-reveal]').forEach((item) => revealObserver.observe(item));

// Keep the ambient hero sequence lightweight when it is off-screen or when
// the visitor has requested reduced motion.
const heroVideo = document.querySelector('[data-hero-video]');
const reduceMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

if (heroVideo) {
  const updateHeroPlayback = (isVisible = true) => {
    if (reduceMotionPreference.matches || !isVisible) {
      heroVideo.pause();
      return;
    }
    heroVideo.play().catch(() => {});
  };

  const videoObserver = new IntersectionObserver(([entry]) => {
    updateHeroPlayback(entry.isIntersecting);
  }, { threshold: 0.05 });

  videoObserver.observe(heroVideo);
  reduceMotionPreference.addEventListener?.('change', () => updateHeroPlayback(true));
}

// Lightweight neural sphere: a spherical point field with local AI-style associations.
const neuralCanvas = document.querySelector('[data-neural-sphere]');
const neuralStage = document.querySelector('[data-neural-stage]');

if (neuralCanvas && neuralStage) {
  const context = neuralCanvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointCount = 78;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points = Array.from({ length: pointCount }, (_, index) => {
    const y = 1 - (index / (pointCount - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;
    return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
  });

  const links = [];
  points.forEach((point, index) => {
    const neighbors = points
      .map((candidate, candidateIndex) => ({
        index: candidateIndex,
        distance: Math.hypot(point.x - candidate.x, point.y - candidate.y, point.z - candidate.z),
      }))
      .filter((item) => item.index > index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    neighbors.forEach((neighbor) => links.push([index, neighbor.index]));
  });

  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  const resizeNeuralCanvas = () => {
    const bounds = neuralCanvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    neuralCanvas.width = Math.round(width * ratio);
    neuralCanvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const rotatePoint = (point, angleY, angleX) => {
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    return {
      x: x1,
      y: point.y * cosX - z1 * sinX,
      z: point.y * sinX + z1 * cosX,
    };
  };

  const drawNeuralSphere = (time = 0) => {
    if (!width || !height) resizeNeuralCanvas();
    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;
    const angleY = time * 0.000075 + pointerX * 0.28;
    const angleX = -0.13 + pointerY * 0.18;
    const radius = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;

    context.clearRect(0, 0, width, height);
    const projected = points.map((point) => {
      const rotated = rotatePoint(point, angleY, angleX);
      const perspective = 1 + rotated.z * 0.11;
      return {
        x: centerX + rotated.x * radius * perspective,
        y: centerY + rotated.y * radius * perspective,
        z: rotated.z,
      };
    });

    links.forEach(([fromIndex, toIndex], linkIndex) => {
      const from = projected[fromIndex];
      const to = projected[toIndex];
      const depth = (from.z + to.z) / 2;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      const isMagentaLink = linkIndex % 9 === 0;
      context.strokeStyle = depth > 0
        ? isMagentaLink
          ? `rgba(255, 61, 174, ${0.14 + depth * 0.23})`
          : `rgba(74, 245, 255, ${0.12 + depth * 0.22})`
        : `rgba(184, 92, 255, ${0.06 + (depth + 1) * 0.05})`;
      context.lineWidth = depth > 0 ? 0.9 : 0.55;
      context.stroke();
    });

    projected
      .map((point, index) => ({ ...point, index }))
      .sort((a, b) => a.z - b.z)
      .forEach((point) => {
        const pulse = (Math.sin(time * 0.002 + point.index * 1.7) + 1) / 2;
        const size = 1.15 + (point.z + 1) * 1.05 + (point.index % 13 === 0 ? pulse * 1.8 : 0);
        context.beginPath();
        context.arc(point.x, point.y, size, 0, Math.PI * 2);
        const isMagentaNode = point.index % 11 === 0;
        context.fillStyle = point.z > 0
          ? isMagentaNode
            ? `rgba(255, 61, 174, ${0.52 + point.z * 0.42})`
            : `rgba(74, 245, 255, ${0.45 + point.z * 0.47})`
          : `rgba(184, 92, 255, ${0.13 + (point.z + 1) * 0.13})`;
        context.fill();
      });

    if (!reduceMotion) window.requestAnimationFrame(drawNeuralSphere);
  };

  neuralStage.addEventListener('pointermove', (event) => {
    const bounds = neuralStage.getBoundingClientRect();
    targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  });
  neuralStage.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
  window.addEventListener('resize', resizeNeuralCanvas);
  resizeNeuralCanvas();
  drawNeuralSphere();
}

const buildBenchmarkTable = (dataset, tableDefinition) => {
  const wrap = document.createElement('div');
  wrap.className = 'benchmark-table-wrap';

  const table = document.createElement('table');
  table.className = 'results-table results-table-wide';

  const caption = document.createElement('caption');
  const captionTitle = document.createElement('strong');
  const captionNote = document.createElement('span');
  captionTitle.textContent = tableDefinition.caption;
  captionNote.textContent = tableDefinition.note;
  caption.append(captionTitle, captionNote);
  table.append(caption);

  const head = document.createElement('thead');
  const groupRow = document.createElement('tr');
  const methodHead = document.createElement('th');
  methodHead.scope = 'col';
  methodHead.rowSpan = 2;
  methodHead.textContent = 'Method';
  groupRow.append(methodHead);

  tableDefinition.groups.forEach((group) => {
    const th = document.createElement('th');
    th.scope = 'colgroup';
    th.colSpan = group.columns.length;
    th.textContent = group.label;
    groupRow.append(th);
  });

  const metricRow = document.createElement('tr');
  const columns = tableDefinition.groups.flatMap((group) => group.columns);
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = `${column} ↑`;
    metricRow.append(th);
  });
  head.append(groupRow, metricRow);
  table.append(head);

  const distinctRanks = columns.map((_, columnIndex) => (
    [...new Set(dataset.rows.map((row) => row[tableDefinition.values][columnIndex]))]
      .sort((a, b) => b - a)
  ));

  const body = document.createElement('tbody');
  dataset.rows.forEach((row) => {
    const tr = document.createElement('tr');
    if (row.method === dataset.leader) tr.classList.add('leader');
    const method = document.createElement('th');
    method.scope = 'row';
    method.textContent = row.method;
    tr.append(method);

    row[tableDefinition.values].forEach((value, columnIndex) => {
      const td = document.createElement('td');
      td.textContent = Number(value).toFixed(dataset.precision);
      if (value === distinctRanks[columnIndex][0]) td.classList.add('best');
      else if (value === distinctRanks[columnIndex][1]) td.classList.add('second-best');
      tr.append(td);
    });
    body.append(tr);
  });
  table.append(body);
  wrap.append(table);
  return wrap;
};

document.querySelectorAll('[data-benchmark-tables]').forEach((container) => {
  const dataset = window.SPHERIVERSE_BENCHMARKS?.[container.dataset.benchmarkTables];
  if (!dataset) return;
  container.replaceChildren(...dataset.tables.map((table) => buildBenchmarkTable(dataset, table)));
});

const tabs = [...document.querySelectorAll('[data-tab]')];
const panels = [...document.querySelectorAll('[data-panel]')];

const activateTab = (key) => {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === key;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  panels.forEach((panel) => {
    const active = panel.dataset.panel === key;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
};

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    activateTab(next.dataset.tab);
    next.focus();
  });
});

// Five major categories reveal their fine-grained, five-second scene clips.
// Video sources are attached only when a panel is opened to keep first load light.
const sceneTabs = [...document.querySelectorAll('[data-scene-tab]')];
const scenePanels = [...document.querySelectorAll('[data-scene-panel]')];

const loadSceneVideo = (video) => {
  const source = video.querySelector('source[data-src]');
  if (!source || source.src) return;
  source.src = source.dataset.src;
  video.load();
};

const sceneVideoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target;
    const panel = video.closest('[data-scene-panel]');
    if (entry.isIntersecting && !panel?.hidden && !reduceMotionPreference.matches) {
      loadSceneVideo(video);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.28 });

document.querySelectorAll('[data-scene-video]').forEach((video) => {
  sceneVideoObserver.observe(video);
});

const activateSceneTab = (key) => {
  sceneTabs.forEach((tab) => {
    const active = tab.dataset.sceneTab === key;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  scenePanels.forEach((panel) => {
    const active = panel.dataset.scenePanel === key;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
    panel.querySelectorAll('[data-scene-video]').forEach((video) => {
      if (!active) {
        video.pause();
        return;
      }
      loadSceneVideo(video);
      if (!reduceMotionPreference.matches) video.play().catch(() => {});
    });
  });
};

sceneTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateSceneTab(tab.dataset.sceneTab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = sceneTabs[(index + direction + sceneTabs.length) % sceneTabs.length];
    activateSceneTab(next.dataset.sceneTab);
    next.focus();
  });
});

if (sceneTabs.length) activateSceneTab(sceneTabs[0].dataset.sceneTab);

const lightbox = document.querySelector('[data-lightbox-dialog]');
const lightboxImage = document.querySelector('[data-lightbox-image]');
const lightboxClose = document.querySelector('[data-lightbox-close]');

document.querySelectorAll('[data-lightbox]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = trigger.dataset.lightbox;
    lightbox.showModal();
  });
});

lightboxClose?.addEventListener('click', () => lightbox.close());
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
};

document.querySelectorAll('[data-coming-soon]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showToast('Coming soon.');
  });
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy);
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source.textContent);
      button.textContent = 'Copied';
      showToast('BibTeX copied to clipboard.');
      window.setTimeout(() => { button.textContent = 'Copy BibTeX'; }, 1800);
    } catch {
      showToast('Select the BibTeX text and copy it manually.');
    }
  });
});
