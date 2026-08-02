import { DEFAULT_COLORS } from './constants';
import type { BrickDefinition, Tool } from './types';

interface UiHandlers {
  onToolChange: (tool: Tool) => void;
  onBrickTypeChange: (typeId: string) => void;
  onColorChange: (color: string) => void;
  onRotateX: () => void;
  onRotateY: () => void;
  onRotateZ: () => void;
  onSnapToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onMoveXNeg: () => void;
  onMoveXPos: () => void;
  onMoveYNeg: () => void;
  onMoveYPos: () => void;
  onMoveZNeg: () => void;
  onMoveZPos: () => void;
}

export interface UiApi {
  setBrickCount: (count: number) => void;
  setSnapState: (enabled: boolean) => void;
  setToolState: (tool: Tool) => void;
  setSelectedBrick: (brickId: string | null) => void;
  setHintContext: (context: { tool: Tool; snapEnabled: boolean; selectedBrickId: string | null }) => void;
  setActiveBrickType: (typeId: string) => void;
}

export function createUi(host: HTMLElement, catalog: BrickDefinition[], handlers: UiHandlers): UiApi {
  host.innerHTML = `
    <div id="studio">
      <aside id="sidebar">
        <h2>Bricks</h2>
        <input id="brick-search" type="search" placeholder="Filter bricks by name..." />
        <div id="brick-filters">
          <select id="shape-filter" class="filter-select">
            <option value="__all">All shapes</option>
          </select>
          <button id="clear-filters" type="button">Clear</button>
        </div>
        <div id="filter-meta">
          <span id="result-count">0 results</span>
          <div id="active-filter-badges"></div>
        </div>
        <div id="category-chips"></div>
        <div id="brick-palette"></div>
        <h2>Colors</h2>
        <div id="color-palette"></div>
        <label class="inline-field">Custom
          <input id="custom-color" type="color" value="#E53935" />
        </label>
      </aside>
      <main id="viewport-wrap">
        <div id="topbar">
          <strong>Brick Build Studio</strong>
          <span class="topbar-spacer"></span>
          <button id="open-help" type="button">Help</button>
          <div class="toolbar-row">
            <button id="tool-build">Build</button>
            <button id="tool-select">Select</button>
            <button id="tool-erase">Erase</button>
          </div>
          <div class="toolbar-row">
            <button id="undo">Undo</button>
            <button id="redo">Redo</button>
            <button id="clear">Clear</button>
          </div>
          <div class="toolbar-row">
            <button id="export">Export</button>
            <label class="upload-btn">Import
              <input id="import" type="file" accept="application/json" />
            </label>
          </div>
          <span id="selected-brick">Selected: none</span>
          <span id="brick-count">0 bricks</span>
        </div>
        <div id="help-panel" aria-hidden="true">
          <div class="help-card" role="dialog" aria-modal="true" aria-label="Controls help">
            <div class="help-header">
              <strong>Help and Controls</strong>
              <button id="close-help" type="button">Close</button>
            </div>
            <div id="controls-hints"></div>
          </div>
        </div>
        <div id="viewport"></div>
        <div id="floating-controls">
          <button id="rot-x">Rotate X (T)</button>
          <button id="rot-y">Rotate Y (R)</button>
          <button id="rot-z">Rotate Z (F)</button>
          <button id="snap-toggle">Snap: ON (G)</button>
          <button id="move-x-neg">-X</button>
          <button id="move-x-pos">+X</button>
          <button id="move-y-neg">-Y</button>
          <button id="move-y-pos">+Y</button>
          <button id="move-z-neg">-Z</button>
          <button id="move-z-pos">+Z</button>
        </div>
      </main>
    </div>
  `;

  const palette = host.querySelector<HTMLDivElement>('#brick-palette');
  const searchInput = host.querySelector<HTMLInputElement>('#brick-search');
  const shapeFilter = host.querySelector<HTMLSelectElement>('#shape-filter');
  const clearFilters = host.querySelector<HTMLButtonElement>('#clear-filters');
  const categoryChips = host.querySelector<HTMLDivElement>('#category-chips');
  const resultCount = host.querySelector<HTMLSpanElement>('#result-count');
  const activeFilterBadges = host.querySelector<HTMLDivElement>('#active-filter-badges');
  const colorPalette = host.querySelector<HTMLDivElement>('#color-palette');
  const count = host.querySelector<HTMLSpanElement>('#brick-count');
  const selectedText = host.querySelector<HTMLSpanElement>('#selected-brick');
  const snapButton = host.querySelector<HTMLButtonElement>('#snap-toggle');
  const hints = host.querySelector<HTMLDivElement>('#controls-hints');
  const openHelp = host.querySelector<HTMLButtonElement>('#open-help');
  const closeHelp = host.querySelector<HTMLButtonElement>('#close-help');
  const helpPanel = host.querySelector<HTMLDivElement>('#help-panel');

  if (!palette || !searchInput || !shapeFilter || !clearFilters || !categoryChips || !resultCount || !activeFilterBadges || !colorPalette || !count || !selectedText || !snapButton || !hints || !openHelp || !closeHelp || !helpPanel) {
    throw new Error('UI mount failed.');
  }

  const helpCard = helpPanel.querySelector<HTMLDivElement>('.help-card');
  if (!helpCard) {
    throw new Error('Help card mount failed.');
  }

  let helpOpen = false;
  let touchStartX = 0;
  let touchCurrentX = 0;

  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  };

  const toggleHelp = (open: boolean): void => {
    helpOpen = open;
    helpPanel.classList.toggle('open', open);
    helpPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    helpCard.style.transform = '';
  };

  openHelp.addEventListener('click', () => toggleHelp(true));
  closeHelp.addEventListener('click', () => toggleHelp(false));
  helpPanel.addEventListener('click', (event) => {
    if (event.target === helpPanel) {
      toggleHelp(false);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (!helpOpen) {
      return;
    }
    if (event.key === 'Escape' && !isEditableTarget(event.target)) {
      event.preventDefault();
      toggleHelp(false);
    }
  });

  helpCard.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      return;
    }
    touchStartX = event.touches[0].clientX;
    touchCurrentX = touchStartX;
  }, { passive: true });

  helpCard.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 1) {
      return;
    }
    touchCurrentX = event.touches[0].clientX;
    const delta = Math.max(0, touchCurrentX - touchStartX);
    helpCard.style.transform = `translateX(${Math.min(delta, 120)}px)`;
  }, { passive: true });

  helpCard.addEventListener('touchend', () => {
    const delta = touchCurrentX - touchStartX;
    if (delta > 80) {
      toggleHelp(false);
      return;
    }
    helpCard.style.transform = '';
  });

  let currentTool: Tool = 'build';
  let snapEnabled = true;
  let selectedBrickId: string | null = null;
  let activeBrickType = catalog[0]?.id ?? '';
  let selectedCategory = '__all';
  let selectedShape = '__all';

  const categories = Array.from(new Set(catalog.map((item) => item.category)));
  const shapes = Array.from(new Set(catalog.map((item) => item.shape)));

  const toShapeLabel = (shape: string): string => shape.replace(/_/g, ' ');

  const applyFilterReset = (kind: 'search' | 'category' | 'shape'): void => {
    if (kind === 'search') {
      searchInput.value = '';
    }
    if (kind === 'category') {
      selectedCategory = '__all';
    }
    if (kind === 'shape') {
      selectedShape = '__all';
      shapeFilter.value = '__all';
    }

    renderCategoryChips();
    renderPalette();
  };

  const renderFilterMeta = (visibleCount: number): void => {
    resultCount.textContent = `${visibleCount} result${visibleCount === 1 ? '' : 's'}`;

    const badges: Array<{ kind: 'search' | 'category' | 'shape'; label: string }> = [];
    const query = searchInput.value.trim();
    if (query.length > 0) {
      badges.push({ kind: 'search', label: `Search: ${query}` });
    }
    if (selectedCategory !== '__all') {
      badges.push({ kind: 'category', label: `Category: ${selectedCategory}` });
    }
    if (selectedShape !== '__all') {
      badges.push({ kind: 'shape', label: `Shape: ${toShapeLabel(selectedShape)}` });
    }

    activeFilterBadges.innerHTML = '';
    if (badges.length === 0) {
      return;
    }

    for (const badgeDef of badges) {
      const badge = document.createElement('span');
      badge.className = 'filter-badge';

      const label = document.createElement('span');
      label.className = 'filter-badge-label';
      label.textContent = badgeDef.label;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'filter-badge-remove';
      removeButton.textContent = 'x';
      removeButton.title = `Remove ${badgeDef.label}`;
      removeButton.setAttribute('aria-label', `Remove ${badgeDef.label}`);
      removeButton.addEventListener('click', () => {
        applyFilterReset(badgeDef.kind);
      });

      badge.appendChild(label);
      badge.appendChild(removeButton);
      activeFilterBadges.appendChild(badge);
    }
  };

  for (const shape of shapes) {
    const option = document.createElement('option');
    option.value = shape;
    option.textContent = toShapeLabel(shape);
    shapeFilter.appendChild(option);
  }

  const renderCategoryChips = (): void => {
    categoryChips.innerHTML = '';

    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = `chip-btn ${selectedCategory === '__all' ? 'active' : ''}`;
    allButton.textContent = 'All categories';
    allButton.addEventListener('click', () => {
      selectedCategory = '__all';
      renderCategoryChips();
      renderPalette();
    });
    categoryChips.appendChild(allButton);

    for (const category of categories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip-btn ${selectedCategory === category ? 'active' : ''}`;
      button.textContent = category;
      button.addEventListener('click', () => {
        selectedCategory = category;
        renderCategoryChips();
        renderPalette();
      });
      categoryChips.appendChild(button);
    }
  };

  const renderHints = (): void => {
    const lines: string[] = [];

    lines.push('<p><strong>Global:</strong> G toggles snap, R/T/F rotate, Shift+Click erases.</p>');

    if (currentTool === 'build') {
      lines.push('<p><strong>Build Mode:</strong> Click to place previewed brick. Red ghost means collision/invalid placement.</p>');
      if (snapEnabled) {
        lines.push('<p><strong>Snap ON:</strong> Placement snaps to stud grid and brick-height levels.</p>');
      } else {
        lines.push('<p><strong>Snap OFF:</strong> Place with free precision using raycast position.</p>');
      }
    }

    if (currentTool === 'select') {
      if (selectedBrickId) {
        lines.push('<p><strong>Select Mode:</strong> Drag to move selected brick. Hold Shift while dragging for vertical drag.</p>');
        if (snapEnabled) {
          lines.push('<p><strong>Snap ON:</strong> Drag movement snaps to grid; vertical drag snaps by brick height.</p>');
        } else {
          lines.push('<p><strong>Snap OFF:</strong> Drag is freeform. Arrow keys move X/Z, PageUp/PageDown move Y.</p>');
        }
        lines.push('<p><strong>Selected Brick:</strong> Delete removes it.</p>');
      } else {
        lines.push('<p><strong>Select Mode:</strong> Click a brick to select it, then drag to move.</p>');
      }
    }

    if (currentTool === 'erase') {
      lines.push('<p><strong>Erase Mode:</strong> Click any brick to remove it.</p>');
    }

    hints.innerHTML = lines.join('');
  };

  const renderPalette = (): void => {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = catalog.filter((definition) => {
      if (selectedCategory !== '__all' && definition.category !== selectedCategory) {
        return false;
      }
      if (selectedShape !== '__all' && definition.shape !== selectedShape) {
        return false;
      }
      if (!query) {
        return true;
      }
      return definition.name.toLowerCase().includes(query) || definition.id.toLowerCase().includes(query);
    });

    renderFilterMeta(filtered.length);

    palette.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'palette-empty';
      empty.textContent = 'No matching bricks.';
      palette.appendChild(empty);
      return;
    }

    const byCategory = new Map<string, BrickDefinition[]>();
    for (const definition of filtered) {
      const existing = byCategory.get(definition.category);
      if (existing) {
        existing.push(definition);
      } else {
        byCategory.set(definition.category, [definition]);
      }
    }

    for (const [category, items] of byCategory.entries()) {
      const section = document.createElement('section');
      section.className = 'palette-category';

      const title = document.createElement('h3');
      title.textContent = category;
      section.appendChild(title);

      const list = document.createElement('div');
      list.className = 'palette-list';

      for (const definition of items) {
        const button = document.createElement('button');
        button.className = 'palette-item palette-row';
        if (definition.id === activeBrickType) {
          button.classList.add('active');
        }
        button.innerHTML = `<span class="brick-name">${definition.name}</span><span class="brick-id">${definition.id}</span>`;
        button.addEventListener('click', () => {
          activeBrickType = definition.id;
          handlers.onBrickTypeChange(definition.id);
          renderPalette();
        });
        list.appendChild(button);
      }

      section.appendChild(list);
      palette.appendChild(section);
    }
  };

  searchInput.addEventListener('input', renderPalette);
  shapeFilter.addEventListener('change', () => {
    selectedShape = shapeFilter.value;
    renderPalette();
  });
  clearFilters.addEventListener('click', () => {
    searchInput.value = '';
    selectedCategory = '__all';
    selectedShape = '__all';
    shapeFilter.value = '__all';
    renderCategoryChips();
    renderPalette();
  });
  renderCategoryChips();
  renderPalette();

  for (const color of DEFAULT_COLORS) {
    const button = document.createElement('button');
    button.className = 'swatch';
    button.style.background = color;
    button.title = color;
    button.addEventListener('click', () => handlers.onColorChange(color));
    colorPalette.appendChild(button);
  }

  host.querySelector<HTMLButtonElement>('#tool-build')?.addEventListener('click', () => handlers.onToolChange('build'));
  host.querySelector<HTMLButtonElement>('#tool-select')?.addEventListener('click', () => handlers.onToolChange('select'));
  host.querySelector<HTMLButtonElement>('#tool-erase')?.addEventListener('click', () => handlers.onToolChange('erase'));

  host.querySelector<HTMLButtonElement>('#rot-x')?.addEventListener('click', handlers.onRotateX);
  host.querySelector<HTMLButtonElement>('#rot-y')?.addEventListener('click', handlers.onRotateY);
  host.querySelector<HTMLButtonElement>('#rot-z')?.addEventListener('click', handlers.onRotateZ);
  host.querySelector<HTMLButtonElement>('#snap-toggle')?.addEventListener('click', handlers.onSnapToggle);
  host.querySelector<HTMLButtonElement>('#undo')?.addEventListener('click', handlers.onUndo);
  host.querySelector<HTMLButtonElement>('#redo')?.addEventListener('click', handlers.onRedo);
  host.querySelector<HTMLButtonElement>('#clear')?.addEventListener('click', handlers.onClear);
  host.querySelector<HTMLButtonElement>('#export')?.addEventListener('click', handlers.onExport);
  host.querySelector<HTMLButtonElement>('#move-x-neg')?.addEventListener('click', handlers.onMoveXNeg);
  host.querySelector<HTMLButtonElement>('#move-x-pos')?.addEventListener('click', handlers.onMoveXPos);
  host.querySelector<HTMLButtonElement>('#move-y-neg')?.addEventListener('click', handlers.onMoveYNeg);
  host.querySelector<HTMLButtonElement>('#move-y-pos')?.addEventListener('click', handlers.onMoveYPos);
  host.querySelector<HTMLButtonElement>('#move-z-neg')?.addEventListener('click', handlers.onMoveZNeg);
  host.querySelector<HTMLButtonElement>('#move-z-pos')?.addEventListener('click', handlers.onMoveZPos);
  host.querySelector<HTMLInputElement>('#custom-color')?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    handlers.onColorChange(target.value);
  });

  host.querySelector<HTMLInputElement>('#import')?.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
      return;
    }
    handlers.onImport(target.files[0]);
    target.value = '';
  });

  return {
    setBrickCount: (brickCount) => {
      count.textContent = `${brickCount} brick${brickCount === 1 ? '' : 's'}`;
    },
    setSnapState: (enabled) => {
      snapEnabled = enabled;
      snapButton.textContent = `Snap: ${enabled ? 'ON' : 'OFF'} (G)`;
      renderHints();
    },
    setToolState: (tool) => {
      currentTool = tool;
      const all = host.querySelectorAll<HTMLButtonElement>('#tool-build, #tool-select, #tool-erase');
      all.forEach((button) => button.classList.remove('active'));
      host.querySelector<HTMLButtonElement>(`#tool-${tool}`)?.classList.add('active');
      renderHints();
    },
    setSelectedBrick: (brickId) => {
      selectedBrickId = brickId;
      selectedText.textContent = `Selected: ${brickId ?? 'none'}`;
      renderHints();
    },
    setHintContext: (context) => {
      currentTool = context.tool;
      snapEnabled = context.snapEnabled;
      selectedBrickId = context.selectedBrickId;
      renderHints();
    },
    setActiveBrickType: (typeId) => {
      activeBrickType = typeId;
      renderPalette();
    },
  };
}
