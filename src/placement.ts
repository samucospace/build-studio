import * as THREE from 'three';
import { BRICK_UNITS, ROTATION_STEP } from './constants';
import {
  computeBrickBounds,
  createBrickMesh,
  createInstancedBrickGroups,
  getBrickDefinition,
} from './bricks';
import type { AppStore } from './state';
import type { BrickInstance, SceneContext } from './types';

interface PlacementOptions {
  mount: HTMLElement;
  sceneContext: SceneContext;
  store: AppStore;
  onBricksChanged: (bricks: BrickInstance[]) => void;
  onSelectedBrickChanged: (selectedBrickId: string | null) => void;
}

interface HistoryEntry {
  bricks: BrickInstance[];
}

interface BrickHit {
  brickId: string;
  point: THREE.Vector3;
}

const UP = new THREE.Vector3(0, 1, 0);
const EPSILON = 1e-5;

function cloneBricks(bricks: BrickInstance[]): BrickInstance[] {
  return bricks.map((brick) => ({
    ...brick,
    position: { ...brick.position },
    rotation: { ...brick.rotation },
  }));
}

function quantizeQuarterTurn(value: number): number {
  return Math.round(value / ROTATION_STEP) * ROTATION_STEP;
}

function snapCoord(target: number, widthOrLength: number): number {
  const isOdd = widthOrLength % 2 === 1;
  if (isOdd) {
    return Math.round(target);
  }
  return Math.floor(target) + 0.5;
}

function getYawEffectiveFootprint(typeId: string, yaw: number): { width: number; length: number } {
  const definition = getBrickDefinition(typeId);
  const quarter = ((Math.round(yaw / ROTATION_STEP) % 4) + 4) % 4;
  if (quarter % 2 === 0) {
    return { width: definition.width, length: definition.length };
  }
  return { width: definition.length, length: definition.width };
}

function toWorldNormal(intersection: THREE.Intersection): THREE.Vector3 {
  if (!intersection.face) {
    return UP.clone();
  }
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
  return intersection.face.normal.clone().applyMatrix3(normalMatrix).normalize();
}

function getBrickOwner(object: THREE.Object3D): THREE.Object3D | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.brickId) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function getIntersectionBrickId(intersection: THREE.Intersection): string | null {
  if (intersection.instanceId !== undefined && intersection.instanceId !== null && intersection.object instanceof THREE.InstancedMesh) {
    const brickIds = intersection.object.userData.brickIds as string[] | undefined;
    if (brickIds && intersection.instanceId < brickIds.length) {
      return brickIds[intersection.instanceId];
    }
  }

  const owner = getBrickOwner(intersection.object);
  if (!owner || !owner.userData.brickId) {
    return null;
  }
  return owner.userData.brickId as string;
}

function overlapDepth(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

function boxesOverlapWithVolume(a: THREE.Box3, b: THREE.Box3): boolean {
  const xOverlap = overlapDepth(a.min.x, a.max.x, b.min.x, b.max.x);
  const yOverlap = overlapDepth(a.min.y, a.max.y, b.min.y, b.max.y);
  const zOverlap = overlapDepth(a.min.z, a.max.z, b.min.z, b.max.z);
  return xOverlap > EPSILON && yOverlap > EPSILON && zOverlap > EPSILON;
}

function isSlopeTopConnectionAttempt(
  intersection: THREE.Intersection,
  normal: THREE.Vector3,
  bricksById: Map<string, BrickInstance>,
): boolean {
  const brickId = getIntersectionBrickId(intersection);
  if (!brickId) {
    return false;
  }

  const brick = bricksById.get(brickId);
  if (!brick) {
    return false;
  }

  const definition = getBrickDefinition(brick.typeId);
  if (definition.shape !== 'slope') {
    return false;
  }

  // Upward-facing hits on slope bricks should not accept top connections.
  return normal.y > 0.2;
}

export class PlacementController {
  private readonly options: PlacementOptions;

  private readonly raycaster = new THREE.Raycaster();

  private readonly mouse = new THREE.Vector2();

  private readonly renderRoot = new THREE.Group();

  private readonly instancedMeshes: THREE.InstancedMesh[] = [];

  private readonly brickLookup = new Map<string, BrickInstance>();

  private readonly undoStack: HistoryEntry[] = [];

  private readonly redoStack: HistoryEntry[] = [];

  private ghostMesh: THREE.Object3D;

  private selectedOverlay: THREE.Object3D | null = null;

  private hasGhost = false;

  private canPlaceGhost = false;

  private selectedBrickId: string | null = null;

  private lastPointerEvent: PointerEvent | null = null;

  private isDraggingSelection = false;

  private dragPointerId: number | null = null;

  private dragMoved = false;

  private suppressNextClick = false;

  private dragOffset = new THREE.Vector3();

  private readonly dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private dragVerticalActive = false;

  private dragVerticalStartPointerY = 0;

  private dragVerticalStartY = 0;

  public constructor(options: PlacementOptions) {
    this.options = options;
    const initial = this.options.store.getState();
    this.ghostMesh = createBrickMesh(
      {
        typeId: initial.activeBrickType,
        color: initial.activeColor,
        position: { x: 0, y: 0, z: 0 },
        rotation: { ...initial.rotation },
      },
      true,
    );
    this.ghostMesh.visible = false;
    this.options.sceneContext.worldRoot.add(this.renderRoot);
    this.options.sceneContext.worldRoot.add(this.ghostMesh);

    this.options.mount.addEventListener('pointermove', this.onPointerMove);
    this.options.mount.addEventListener('pointerdown', this.onPointerDown);
    this.options.mount.addEventListener('pointerup', this.onPointerUp);
    this.options.mount.addEventListener('pointercancel', this.onPointerUp);
    this.options.mount.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);

    this.options.store.subscribe((state) => {
      this.refreshGhost(state.activeBrickType, state.activeColor);
      if (this.lastPointerEvent) {
        this.updateGhost(this.lastPointerEvent);
      }
    });
  }

  public dispose(): void {
    this.options.mount.removeEventListener('pointermove', this.onPointerMove);
    this.options.mount.removeEventListener('pointerdown', this.onPointerDown);
    this.options.mount.removeEventListener('pointerup', this.onPointerUp);
    this.options.mount.removeEventListener('pointercancel', this.onPointerUp);
    this.options.mount.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  public setBricks(bricks: BrickInstance[]): void {
    this.rebuildInstancedMeshes(bricks);
    if (this.selectedBrickId && !this.brickLookup.has(this.selectedBrickId)) {
      this.setSelectedBrick(null);
    }
    this.refreshSelectionOverlay();
  }

  public nudgeSelected(dx: number, dy: number, dz: number): boolean {
    const state = this.options.store.getState();
    if (state.snapToGrid || !this.selectedBrickId) {
      return false;
    }

    const selected = state.bricks.find((brick) => brick.id === this.selectedBrickId);
    if (!selected) {
      return false;
    }

    const moved: BrickInstance = {
      ...selected,
      position: {
        x: selected.position.x + dx,
        y: Math.max(0, selected.position.y + dy),
        z: selected.position.z + dz,
      },
      rotation: { ...selected.rotation },
    };

    if (this.wouldCollide(moved, selected.id)) {
      return false;
    }

    this.pushUndo();
    this.redoStack.length = 0;
    const updated = state.bricks.map((brick) => (brick.id === selected.id ? moved : brick));
    this.options.onBricksChanged(updated);
    return true;
  }

  public undo(): void {
    if (this.undoStack.length === 0) {
      return;
    }
    const current = cloneBricks(this.options.store.getState().bricks);
    const previous = this.undoStack.pop();
    if (!previous) {
      return;
    }
    this.redoStack.push({ bricks: current });
    this.options.onBricksChanged(cloneBricks(previous.bricks));
  }

  public redo(): void {
    if (this.redoStack.length === 0) {
      return;
    }
    const current = cloneBricks(this.options.store.getState().bricks);
    const next = this.redoStack.pop();
    if (!next) {
      return;
    }
    this.undoStack.push({ bricks: current });
    this.options.onBricksChanged(cloneBricks(next.bricks));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    if (event.ctrlKey && !event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
        return;
      }

      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        this.redo();
        return;
      }
    }

    const state = this.options.store.getState();
    const lower = event.key.toLowerCase();

    if (event.key === 'Delete' && this.selectedBrickId) {
      this.deleteSelectedBrick();
      return;
    }

    if (lower === 'g') {
      this.options.store.set({ snapToGrid: !state.snapToGrid });
      return;
    }

    if (state.activeTool === 'select' && this.selectedBrickId) {
      if (lower === 'r' || lower === 't' || lower === 'f') {
        this.rotateSelectedBrick(lower);
        return;
      }

      if (!state.snapToGrid) {
        if (event.key === 'ArrowUp') {
          this.nudgeSelected(0, 0, -0.25);
          return;
        }
        if (event.key === 'ArrowDown') {
          this.nudgeSelected(0, 0, 0.25);
          return;
        }
        if (event.key === 'ArrowLeft') {
          this.nudgeSelected(-0.25, 0, 0);
          return;
        }
        if (event.key === 'ArrowRight') {
          this.nudgeSelected(0.25, 0, 0);
          return;
        }
        if (event.key === 'PageUp') {
          this.nudgeSelected(0, 0.25, 0);
          return;
        }
        if (event.key === 'PageDown') {
          this.nudgeSelected(0, -0.25, 0);
          return;
        }
      }
    }

    if (event.key.toLowerCase() === 'r') {
      this.options.store.set({ rotation: { ...state.rotation, y: quantizeQuarterTurn(state.rotation.y + ROTATION_STEP) } });
    }
    if (event.key.toLowerCase() === 't') {
      this.options.store.set({ rotation: { ...state.rotation, x: quantizeQuarterTurn(state.rotation.x + ROTATION_STEP) } });
    }
    if (event.key.toLowerCase() === 'f') {
      this.options.store.set({ rotation: { ...state.rotation, z: quantizeQuarterTurn(state.rotation.z + ROTATION_STEP) } });
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.lastPointerEvent = event;
    this.setRayFromEvent(event);

    if (this.isDraggingSelection && this.dragPointerId === event.pointerId) {
      this.dragSelectedBrickFromPointer(event);
      return;
    }

    this.updateGhost(event);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const state = this.options.store.getState();
    if (state.activeTool !== 'select') {
      return;
    }

    this.setRayFromEvent(event);
    const hit = this.findBrickHitResult();
    if (!hit) {
      this.setSelectedBrick(null);
      return;
    }

    this.setSelectedBrick(hit.brickId);

    const brick = this.brickLookup.get(hit.brickId);
    if (!brick) {
      return;
    }

    this.isDraggingSelection = true;
    this.dragPointerId = event.pointerId;
    this.dragMoved = false;
    this.dragVerticalActive = false;
    this.options.mount.setPointerCapture(event.pointerId);
    this.options.sceneContext.orbitControls.enabled = false;

    this.pushUndo();
    this.redoStack.length = 0;

    this.dragPlane.set(new THREE.Vector3(0, 1, 0), -brick.position.y);
    const dragPlaneHit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, dragPlaneHit)) {
      this.dragOffset.set(
        brick.position.x - dragPlaneHit.x,
        0,
        brick.position.z - dragPlaneHit.z,
      );
    } else {
      this.dragOffset.set(0, 0, 0);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.isDraggingSelection || this.dragPointerId !== event.pointerId) {
      return;
    }

    if (this.options.mount.hasPointerCapture(event.pointerId)) {
      this.options.mount.releasePointerCapture(event.pointerId);
    }
    this.options.sceneContext.orbitControls.enabled = true;

    this.isDraggingSelection = false;
    this.dragPointerId = null;
    this.dragVerticalActive = false;
    this.suppressNextClick = this.dragMoved;
    this.dragMoved = false;
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }

    this.setRayFromEvent(event);
    this.updateGhost(event);
    const state = this.options.store.getState();

    if (state.activeTool === 'select') {
      this.selectAtCursor();
      return;
    }

    if (event.shiftKey || state.activeTool === 'erase') {
      this.eraseAtCursor();
      return;
    }

    if (!this.hasGhost || !this.canPlaceGhost) {
      return;
    }

    this.pushUndo();
    const brick: BrickInstance = {
      id: crypto.randomUUID(),
      typeId: state.activeBrickType,
      color: state.activeColor,
      position: {
        x: this.ghostMesh.position.x,
        y: this.ghostMesh.position.y,
        z: this.ghostMesh.position.z,
      },
      rotation: {
        x: this.ghostMesh.rotation.x,
        y: this.ghostMesh.rotation.y,
        z: this.ghostMesh.rotation.z,
      },
    };
    this.redoStack.length = 0;
    this.options.onBricksChanged([...state.bricks, brick]);
  };

  private pushUndo(): void {
    this.undoStack.push({ bricks: cloneBricks(this.options.store.getState().bricks) });
    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
  }

  private refreshGhost(typeId: string, color: string): void {
    this.options.sceneContext.worldRoot.remove(this.ghostMesh);
    this.ghostMesh = createBrickMesh(
      {
        typeId,
        color,
        position: { x: 0, y: 0, z: 0 },
        rotation: { ...this.options.store.getState().rotation },
      },
      true,
    );
    this.ghostMesh.visible = this.hasGhost;
    this.options.sceneContext.worldRoot.add(this.ghostMesh);
  }

  private updateGhost(event: MouseEvent | PointerEvent): void {
    const state = this.options.store.getState();
    if (state.activeTool !== 'build') {
      this.hasGhost = false;
      this.canPlaceGhost = false;
      this.ghostMesh.visible = false;
      return;
    }

    const rect = this.options.mount.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.options.sceneContext.camera);

    const targets: THREE.Object3D[] = [
      this.options.sceneContext.buildPlane,
      ...this.instancedMeshes,
    ];

    const intersections = this.raycaster.intersectObjects(targets, true);
    if (intersections.length === 0) {
      this.hasGhost = false;
      this.canPlaceGhost = false;
      this.ghostMesh.visible = false;
      return;
    }

    const first = intersections[0];
    const normal = toWorldNormal(first);
    if (isSlopeTopConnectionAttempt(first, normal, this.brickLookup)) {
      this.hasGhost = false;
      this.canPlaceGhost = false;
      this.ghostMesh.visible = false;
      return;
    }

    const target = first.point.clone().addScaledVector(normal, 0.1);
    const snapped = this.computePlacementPosition(target, normal, state.activeBrickType, state.rotation, state.snapToGrid);
    const candidate: BrickInstance = {
      id: 'ghost',
      typeId: state.activeBrickType,
      color: state.activeColor,
      position: { x: snapped.x, y: snapped.y, z: snapped.z },
      rotation: { ...state.rotation },
    };
    this.canPlaceGhost = !this.wouldCollide(candidate);

    this.ghostMesh.position.copy(snapped);
    this.ghostMesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    this.hasGhost = true;
    this.ghostMesh.visible = true;
    this.setGhostValidity(this.canPlaceGhost);
  }

  private computePlacementPosition(
    target: THREE.Vector3,
    _normal: THREE.Vector3,
    typeId: string,
    rotation: { x: number; y: number; z: number },
    snapToGrid: boolean,
  ): THREE.Vector3 {
    if (!snapToGrid) {
      return new THREE.Vector3(target.x, Math.max(0, target.y), target.z);
    }

    const effective = getYawEffectiveFootprint(typeId, rotation.y);
    const y = Math.max(0, Math.round(target.y / BRICK_UNITS.brickHeight) * BRICK_UNITS.brickHeight);
    const x = snapCoord(target.x, effective.width);
    const z = snapCoord(target.z, effective.length);
    return new THREE.Vector3(x, y, z);
  }

  private eraseAtCursor(): void {
    const hit = this.findBrickHit();
    if (!hit) {
      return;
    }

    this.pushUndo();
    this.redoStack.length = 0;
    const current = this.options.store.getState().bricks;
    this.options.onBricksChanged(current.filter((brick) => brick.id !== hit));
    if (this.selectedBrickId === hit) {
      this.setSelectedBrick(null);
    }
  }

  private selectAtCursor(): void {
    const hit = this.findBrickHitResult();
    this.setSelectedBrick(hit?.brickId ?? null);
  }

  private setSelectedBrick(brickId: string | null): void {
    this.selectedBrickId = brickId;
    this.options.onSelectedBrickChanged(brickId);
    this.refreshSelectionOverlay();
  }

  private refreshSelectionOverlay(): void {
    if (this.selectedOverlay) {
      this.options.sceneContext.worldRoot.remove(this.selectedOverlay);
      this.selectedOverlay = null;
    }

    if (!this.selectedBrickId) {
      return;
    }

    const brick = this.brickLookup.get(this.selectedBrickId);
    if (!brick) {
      return;
    }

    const overlay = createBrickMesh(brick, true);
    overlay.renderOrder = 1000;
    overlay.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) {
        return;
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.color.set('#00bcd4');
          material.opacity = 0.25;
          material.depthWrite = false;
        }
      }
    });
    this.selectedOverlay = overlay;
    this.options.sceneContext.worldRoot.add(overlay);
  }

  private rebuildInstancedMeshes(bricks: BrickInstance[]): void {
    this.instancedMeshes.length = 0;
    this.brickLookup.clear();
    this.renderRoot.clear();

    for (const brick of bricks) {
      this.brickLookup.set(brick.id, brick);
    }

    const groups = createInstancedBrickGroups(bricks);
    for (const group of groups) {
      this.instancedMeshes.push(group.mesh);
      this.renderRoot.add(group.mesh);
    }
  }

  private setGhostValidity(valid: boolean): void {
    this.ghostMesh.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) {
        return;
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.opacity = valid ? 0.5 : 0.2;
          material.color.set(valid ? this.options.store.getState().activeColor : '#b71c1c');
        }
      }
    });
  }

  private findBrickHit(): string | null {
    const hit = this.findBrickHitResult();
    return hit?.brickId ?? null;
  }

  private findBrickHitResult(): BrickHit | null {
    const intersections = this.raycaster.intersectObjects(this.instancedMeshes, true);
    for (const intersection of intersections) {
      const brickId = getIntersectionBrickId(intersection);
      if (brickId) {
        return {
          brickId,
          point: intersection.point.clone(),
        };
      }
    }
    return null;
  }

  private setRayFromEvent(event: MouseEvent | PointerEvent): void {
    const rect = this.options.mount.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.options.sceneContext.camera);
  }

  private dragSelectedBrickFromPointer(event: PointerEvent): void {
    if (!this.selectedBrickId) {
      return;
    }

    const selected = this.options.store.getState().bricks.find((brick) => brick.id === this.selectedBrickId);
    if (!selected) {
      return;
    }

    const state = this.options.store.getState();
    const effective = getYawEffectiveFootprint(selected.typeId, selected.rotation.y);
    let nextX = selected.position.x;
    let nextY = selected.position.y;
    let nextZ = selected.position.z;

    if (event.shiftKey) {
      if (!this.dragVerticalActive) {
        this.dragVerticalActive = true;
        this.dragVerticalStartPointerY = event.clientY;
        this.dragVerticalStartY = selected.position.y;
      }

      const deltaPixels = event.clientY - this.dragVerticalStartPointerY;
      const dragScale = 0.02;
      nextY = this.dragVerticalStartY - deltaPixels * dragScale;

      if (state.snapToGrid) {
        nextY = Math.max(0, Math.round(nextY / BRICK_UNITS.brickHeight) * BRICK_UNITS.brickHeight);
      } else {
        nextY = Math.max(0, nextY);
      }
    } else {
      if (this.dragVerticalActive) {
        this.dragVerticalActive = false;
        const dragPlaneHit = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, dragPlaneHit)) {
          this.dragOffset.set(
            selected.position.x - dragPlaneHit.x,
            0,
            selected.position.z - dragPlaneHit.z,
          );
        }
      }

      const dragPlaneHit = new THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(this.dragPlane, dragPlaneHit)) {
        return;
      }

      nextX = dragPlaneHit.x + this.dragOffset.x;
      nextY = selected.position.y;
      nextZ = dragPlaneHit.z + this.dragOffset.z;

      if (state.snapToGrid) {
        nextX = snapCoord(nextX, effective.width);
        nextY = Math.max(0, Math.round(nextY / BRICK_UNITS.brickHeight) * BRICK_UNITS.brickHeight);
        nextZ = snapCoord(nextZ, effective.length);
      }
    }

    const candidate: BrickInstance = {
      ...selected,
      position: {
        x: nextX,
        y: Math.max(0, nextY),
        z: nextZ,
      },
      rotation: { ...selected.rotation },
    };

    if (this.wouldCollide(candidate, selected.id)) {
      return;
    }

    const dx = Math.abs(candidate.position.x - selected.position.x);
    const dy = Math.abs(candidate.position.y - selected.position.y);
    const dz = Math.abs(candidate.position.z - selected.position.z);
    if (dx < EPSILON && dy < EPSILON && dz < EPSILON) {
      return;
    }

    this.dragMoved = true;
    const updated = this.options.store
      .getState()
      .bricks.map((brick) => (brick.id === selected.id ? candidate : brick));
    this.options.onBricksChanged(updated);
  }

  private deleteSelectedBrick(): void {
    if (!this.selectedBrickId) {
      return;
    }

    this.pushUndo();
    this.redoStack.length = 0;
    const current = this.options.store.getState().bricks;
    this.options.onBricksChanged(current.filter((brick) => brick.id !== this.selectedBrickId));
    this.setSelectedBrick(null);
  }

  private rotateSelectedBrick(axisKey: 'r' | 't' | 'f'): void {
    if (!this.selectedBrickId) {
      return;
    }

    const current = this.options.store.getState().bricks;
    const selected = current.find((brick) => brick.id === this.selectedBrickId);
    if (!selected) {
      return;
    }

    const nextRotation = { ...selected.rotation };
    if (axisKey === 'r') {
      nextRotation.y = quantizeQuarterTurn(nextRotation.y + ROTATION_STEP);
    }
    if (axisKey === 't') {
      nextRotation.x = quantizeQuarterTurn(nextRotation.x + ROTATION_STEP);
    }
    if (axisKey === 'f') {
      nextRotation.z = quantizeQuarterTurn(nextRotation.z + ROTATION_STEP);
    }

    const candidate: BrickInstance = {
      ...selected,
      position: { ...selected.position },
      rotation: nextRotation,
    };

    if (this.wouldCollide(candidate, selected.id)) {
      return;
    }

    this.pushUndo();
    this.redoStack.length = 0;
    const updated = current.map((brick) => (brick.id === selected.id ? candidate : brick));
    this.options.onBricksChanged(updated);
  }

  private wouldCollide(candidate: BrickInstance, ignoreBrickId?: string): boolean {
    const candidateBox = computeBrickBounds(candidate);
    const current = this.options.store.getState().bricks;

    for (const brick of current) {
      if (ignoreBrickId && brick.id === ignoreBrickId) {
        continue;
      }
      const box = computeBrickBounds(brick);
      if (boxesOverlapWithVolume(candidateBox, box)) {
        return true;
      }
    }

    return false;
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }
}
