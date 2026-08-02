import './style.css';
import { ROTATION_STEP } from './constants';
import { getCatalog } from './bricks';
import { createScene } from './scene';
import { AppStore } from './state';
import { createUi } from './ui';
import { PlacementController } from './placement';
import { parseBricks, serializeBricks } from './persistence';
import type { AppState, BrickInstance } from './types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root not found.');
}

const initialState: AppState = {
  activeTool: 'build',
  activeBrickType: '2x2',
  activeColor: '#E53935',
  snapToGrid: true,
  rotation: { x: 0, y: 0, z: 0 },
  selectedBrickId: null,
  bricks: [],
};

const store = new AppStore(initialState);

const ui = createUi(app, getCatalog(), {
  onToolChange: (tool) => store.set({ activeTool: tool }),
  onBrickTypeChange: (typeId) => store.set({ activeBrickType: typeId }),
  onColorChange: (color) => store.set({ activeColor: color }),
  onRotateX: () => {
    const rotation = store.getState().rotation;
    store.set({ rotation: { ...rotation, x: Math.round((rotation.x + ROTATION_STEP) / ROTATION_STEP) * ROTATION_STEP } });
  },
  onRotateY: () => {
    const rotation = store.getState().rotation;
    store.set({ rotation: { ...rotation, y: Math.round((rotation.y + ROTATION_STEP) / ROTATION_STEP) * ROTATION_STEP } });
  },
  onRotateZ: () => {
    const rotation = store.getState().rotation;
    store.set({ rotation: { ...rotation, z: Math.round((rotation.z + ROTATION_STEP) / ROTATION_STEP) * ROTATION_STEP } });
  },
  onSnapToggle: () => store.set({ snapToGrid: !store.getState().snapToGrid }),
  onUndo: () => placement.undo(),
  onRedo: () => placement.redo(),
  onClear: () => {
    syncBricks([]);
  },
  onExport: () => {
    const text = serializeBricks(store.getState().bricks);
    const blob = new Blob([text], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `build-studio-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  },
  onImport: async (file) => {
    const text = await file.text();
    const bricks = parseBricks(text);
    syncBricks(bricks);
  },
  onMoveXNeg: () => {
    placement.nudgeSelected(-0.25, 0, 0);
  },
  onMoveXPos: () => {
    placement.nudgeSelected(0.25, 0, 0);
  },
  onMoveYNeg: () => {
    placement.nudgeSelected(0, -0.25, 0);
  },
  onMoveYPos: () => {
    placement.nudgeSelected(0, 0.25, 0);
  },
  onMoveZNeg: () => {
    placement.nudgeSelected(0, 0, -0.25);
  },
  onMoveZPos: () => {
    placement.nudgeSelected(0, 0, 0.25);
  },
});

const viewport = document.querySelector<HTMLElement>('#viewport');
if (!viewport) {
  throw new Error('Viewport mount not found.');
}

const scene = createScene(viewport);

function syncBricks(bricks: BrickInstance[]): void {
  store.setBricks(bricks);
  placement.setBricks(bricks);
}

const placement = new PlacementController({
  mount: scene.renderer.domElement,
  sceneContext: scene,
  store,
  onBricksChanged: syncBricks,
  onSelectedBrickChanged: (selectedBrickId) => {
    store.set({ selectedBrickId });
  },
});

store.subscribe((state) => {
  ui.setBrickCount(state.bricks.length);
  ui.setSnapState(state.snapToGrid);
  ui.setToolState(state.activeTool);
  ui.setSelectedBrick(state.selectedBrickId);
  ui.setHintContext({
    tool: state.activeTool,
    snapEnabled: state.snapToGrid,
    selectedBrickId: state.selectedBrickId,
  });
});

