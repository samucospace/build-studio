import * as THREE from 'three';
import { BRICK_TYPES } from './constants';
import type { BrickDefinition, BrickInstance } from './types';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

interface BrickRenderGroup {
  key: string;
  typeId: string;
  color: string;
  shape: BrickDefinition['shape'];
  mesh: THREE.InstancedMesh;
  brickIds: string[];
}

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function normalizePivotToBottomCenter(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {
    return;
  }

  const centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  geometry.translate(-centerX, -box.min.y, -centerZ);
}

function createBlockBody(definition: BrickDefinition): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(definition.width, definition.height, definition.length);
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createSlopeBody(definition: BrickDefinition): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-definition.width / 2, 0);
  shape.lineTo(definition.width / 2, 0);
  shape.lineTo(-definition.width / 2, definition.height);
  shape.lineTo(-definition.width / 2, 0);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: definition.length,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -definition.length / 2);
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createWedgeBody(definition: BrickDefinition): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-definition.width / 2, 0);
  shape.lineTo(definition.width / 2, 0);
  shape.lineTo(0, definition.height);
  shape.lineTo(-definition.width / 2, 0);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: definition.length,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -definition.length / 2);
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createRoundBody(definition: BrickDefinition): THREE.BufferGeometry {
  const radius = Math.min(definition.width, definition.length) / 2;
  const geometry = new THREE.CylinderGeometry(radius, radius, definition.height, 28);
  geometry.rotateX(Math.PI / 2);
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createQuarterRoundBody(definition: BrickDefinition): THREE.BufferGeometry {
  const radius = Math.min(definition.width, definition.length);
  const arc = new THREE.Shape();
  arc.moveTo(0, 0);
  arc.absarc(0, 0, radius, 0, Math.PI / 2, false);
  arc.lineTo(0, 0);

  const geometry = new THREE.ExtrudeGeometry(arc, {
    depth: definition.height,
    bevelEnabled: false,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-radius / 2, definition.height / 2, -radius / 2);
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createArchBody(definition: BrickDefinition): THREE.BufferGeometry {
  const pillarWidth = Math.max(0.28, definition.width * 0.32);
  const spanHeight = definition.height;
  const topThickness = Math.max(0.22, definition.width * 0.28);

  const leftPillar = new THREE.BoxGeometry(pillarWidth, spanHeight, definition.length);
  leftPillar.translate(-(definition.width - pillarWidth) / 2, spanHeight / 2, 0);

  const rightPillar = new THREE.BoxGeometry(pillarWidth, spanHeight, definition.length);
  rightPillar.translate((definition.width - pillarWidth) / 2, spanHeight / 2, 0);

  const topBar = new THREE.BoxGeometry(definition.width, topThickness, definition.length);
  topBar.translate(0, spanHeight + topThickness / 2, 0);

  const merged = mergeGeometries([leftPillar, rightPillar, topBar], false);
  const geometry = merged ?? topBar;
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createCylinderBody(definition: BrickDefinition): THREE.BufferGeometry {
  const radius = Math.min(definition.width, definition.length) / 2;
  const geometry = new THREE.CylinderGeometry(radius, radius, definition.height, 24);
  geometry.rotateX(Math.PI / 2);
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createChestBody(definition: BrickDefinition): THREE.BufferGeometry {
  const baseHeight = definition.height * 0.58;
  const lidHeight = definition.height * 0.42;

  const base = new THREE.BoxGeometry(definition.width, baseHeight, definition.length);
  base.translate(0, baseHeight / 2, 0);

  const lidRadius = Math.min(definition.width, lidHeight) / 2;
  const lid = new THREE.CylinderGeometry(lidRadius, lidRadius, definition.length, 18, 1, false, 0, Math.PI);
  lid.rotateZ(Math.PI / 2);
  lid.translate(0, baseHeight + lidHeight * 0.5, 0);

  const merged = mergeGeometries([base, lid], false);
  const geometry = merged ?? base;
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createFlagBody(definition: BrickDefinition): THREE.BufferGeometry {
  const poleRadius = Math.max(0.08, Math.min(definition.width, definition.length) * 0.11);
  const poleHeight = definition.height;
  const pole = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 10);
  pole.translate(-definition.width * 0.26, poleHeight / 2, 0);

  const clothHeight = Math.max(0.45, definition.height * 0.34);
  const clothLength = Math.max(0.6, definition.length * 1.1);
  const cloth = new THREE.BoxGeometry(Math.max(0.08, definition.width * 0.12), clothHeight, clothLength);
  cloth.translate(0, poleHeight - clothHeight * 0.65, clothLength * 0.08);

  const merged = mergeGeometries([pole, cloth], false);
  const geometry = merged ?? pole;
  normalizePivotToBottomCenter(geometry);
  return geometry;
}

function createGeometryForShape(definition: BrickDefinition): THREE.BufferGeometry {
  switch (definition.shape) {
    case 'block':
    case 'plate':
    case 'tile':
      return createBlockBody(definition);
    case 'slope':
      return createSlopeBody(definition);
    case 'wedge':
      return createWedgeBody(definition);
    case 'round':
      return createRoundBody(definition);
    case 'quarter_round':
      return createQuarterRoundBody(definition);
    case 'arch':
      return createArchBody(definition);
    case 'cylinder':
      return createCylinderBody(definition);
    case 'chest':
      return createChestBody(definition);
    case 'flag':
      return createFlagBody(definition);
    default:
      return createBlockBody(definition);
  }
}

function getBodyGeometry(definition: BrickDefinition): THREE.BufferGeometry {
  const cached = geometryCache.get(`body:${definition.id}`);
  if (cached) {
    return cached;
  }

  const geometry = createGeometryForShape(definition);
  geometryCache.set(`body:${definition.id}`, geometry);
  return geometry;
}

function getInstancedGeometry(definition: BrickDefinition): THREE.BufferGeometry {
  const key = `instanced:${definition.id}`;
  const cached = geometryCache.get(key);
  if (cached) {
    return cached;
  }

  const bodyGeometry = getBodyGeometry(definition).clone();
  geometryCache.set(key, bodyGeometry);
  return bodyGeometry;
}

function getMaterial(color: string, ghost: boolean): THREE.MeshStandardMaterial {
  if (ghost) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.5,
    });
  }

  const key = `mat:${color}`;
  const cached = materialCache.get(key);
  if (cached) {
    return cached;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.2,
    metalness: 0.05,
  });
  materialCache.set(key, material);
  return material;
}

function makeInstanceMatrix(brick: Pick<BrickInstance, 'position' | 'rotation'>): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(brick.rotation.x, brick.rotation.y, brick.rotation.z),
  );
  matrix.compose(
    new THREE.Vector3(brick.position.x, brick.position.y, brick.position.z),
    quaternion,
    new THREE.Vector3(1, 1, 1),
  );
  return matrix;
}

function buildRenderGroups(bricks: BrickInstance[]): Map<string, BrickInstance[]> {
  const groups = new Map<string, BrickInstance[]>();
  for (const brick of bricks) {
    const key = `${brick.typeId}|${brick.color}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(brick);
      continue;
    }
    groups.set(key, [brick]);
  }
  return groups;
}

export function computeBrickBounds(brick: Pick<BrickInstance, 'typeId' | 'position' | 'rotation'>): THREE.Box3 {
  const definition = getBrickDefinition(brick.typeId);
  const halfX = definition.width / 2;
  const halfZ = definition.length / 2;
  const topY = definition.height;

  const corners: THREE.Vector3[] = [];
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(brick.rotation.x, brick.rotation.y, brick.rotation.z),
  );
  const position = new THREE.Vector3(brick.position.x, brick.position.y, brick.position.z);

  for (const x of [-halfX, halfX]) {
    for (const y of [0, topY]) {
      for (const z of [-halfZ, halfZ]) {
        corners.push(new THREE.Vector3(x, y, z).applyQuaternion(quaternion).add(position));
      }
    }
  }

  return new THREE.Box3().setFromPoints(corners);
}

export function createInstancedBrickGroups(bricks: BrickInstance[]): BrickRenderGroup[] {
  const grouped = buildRenderGroups(bricks);
  const matrix = new THREE.Matrix4();
  const entries: BrickRenderGroup[] = [];

  for (const [key, list] of grouped.entries()) {
    const [typeId, color] = key.split('|');
    const definition = getBrickDefinition(typeId);
    const geometry = getInstancedGeometry(definition);
    const material = getMaterial(color, false);
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const brickIds: string[] = [];
    for (let index = 0; index < list.length; index += 1) {
      const brick = list[index];
      matrix.copy(makeInstanceMatrix(brick));
      mesh.setMatrixAt(index, matrix);
      brickIds.push(brick.id);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.kind = 'instanced-bricks';
    mesh.userData.brickIds = brickIds;
    mesh.userData.typeId = typeId;
    mesh.userData.shape = definition.shape;

    entries.push({
      key,
      typeId,
      color,
      shape: definition.shape,
      mesh,
      brickIds,
    });
  }

  return entries;
}

export function getBrickDefinition(typeId: string): BrickDefinition {
  const definition = BRICK_TYPES.find((item) => item.id === typeId);
  if (!definition) {
    return BRICK_TYPES[0];
  }
  return definition;
}

export function getCatalog(): BrickDefinition[] {
  return BRICK_TYPES;
}

export function createBrickMesh(
  brick: Pick<BrickInstance, 'typeId' | 'color' | 'position' | 'rotation'>,
  ghost = false,
): THREE.Object3D {
  const definition = getBrickDefinition(brick.typeId);
  const body = getBodyGeometry(definition);
  const group = new THREE.Group();

  const material = getMaterial(brick.color, ghost);

  const bodyMesh = new THREE.Mesh(body, material);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const wrapper = new THREE.Group();
  wrapper.userData.typeId = brick.typeId;
  wrapper.userData.shape = definition.shape;
  wrapper.add(group);
  wrapper.position.set(brick.position.x, brick.position.y, brick.position.z);
  wrapper.rotation.set(brick.rotation.x, brick.rotation.y, brick.rotation.z);
  return wrapper;
}
