import type * as THREE from 'three';

export type Tool = 'build' | 'select' | 'erase';

export interface BrickDefinition {
  id: string;
  name: string;
  category: string;
  width: number;
  length: number;
  height: number;
  shape:
    | 'block'
    | 'plate'
    | 'tile'
    | 'slope'
    | 'wedge'
    | 'round'
    | 'quarter_round'
    | 'arch'
    | 'cylinder'
    | 'chest'
    | 'flag';
}

export interface BrickInstance {
  id: string;
  typeId: string;
  color: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  boundingBox?: THREE.Box3;
}

export interface AppState {
  activeTool: Tool;
  activeBrickType: string;
  activeColor: string;
  snapToGrid: boolean;
  rotation: { x: number; y: number; z: number };
  selectedBrickId: string | null;
  bricks: BrickInstance[];
}

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbitControls: import('three/addons/controls/OrbitControls.js').OrbitControls;
  worldRoot: THREE.Group;
  buildPlane: THREE.Mesh;
}
