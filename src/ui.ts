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
}

export function createUi(host: HTMLElement, catalog: BrickDefinition[], handlers: UiHandlers): UiApi {
  host.innerHTML = `
    <div id="studio">
      <aside id="sidebar">
        <h2>Bricks</h2>
        <div id="brick-palette"></div>
        <h2>Colors</h2>
        <div id="color-palette"></div>
        <label class="inline-field">Custom
          <input id="custom-color" type="color" value="#E53935" />
        </label>
        <h2>Controls</h2>
        <div id="controls-hints"></div>
      </aside>
      <main id="viewport-wrap">
        <div id="topbar">
          <strong>Brick Build Studio</strong>
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
  const colorPalette = host.querySelector<HTMLDivElement>('#color-palette');
  const count = host.querySelector<HTMLSpanElement>('#brick-count');
  const selectedText = host.querySelector<HTMLSpanElement>('#selected-brick');
  const snapButton = host.querySelector<HTMLButtonElement>('#snap-toggle');
  const hints = host.querySelector<HTMLDivElement>('#controls-hints');

  if (!palette || !colorPalette || !count || !selectedText || !snapButton || !hints) {
    throw new Error('UI mount failed.');
  }

  let currentTool: Tool = 'build';
  let snapEnabled = true;
  let selectedBrickId: string | null = null;

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

  for (const definition of catalog) {
    const button = document.createElement('button');
    button.textContent = definition.id;
    button.className = 'palette-item';
    button.addEventListener('click', () => handlers.onBrickTypeChange(definition.id));
    palette.appendChild(button);
  }

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
  };
}
