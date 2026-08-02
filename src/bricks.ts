import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BRICK_UNITS, BRICK_TYPES } from './constants';
import type { BrickDefinition, BrickInstance } from './types';

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

function getBodyGeometry(definition: BrickDefinition): THREE.BufferGeometry {
  const cached = geometryCache.get(`body:${definition.id}`);
  if (cached) {
    return cached;
  }

  const geometry = definition.shape === 'slope' ? createSlopeBody(definition) : createBlockBody(definition);
  geometryCache.set(`body:${definition.id}`, geometry);
  return geometry;
}

function getStudGeometry(): THREE.BufferGeometry {
  const cached = geometryCache.get('stud:default');
  if (cached) {
    return cached;
  }

  const stud = new THREE.CylinderGeometry(
    BRICK_UNITS.studDiameter / 2,
    BRICK_UNITS.studDiameter / 2,
    BRICK_UNITS.studHeight,
    24,
  );
  geometryCache.set('stud:default', stud);
  return stud;
}

function getInstancedGeometry(definition: BrickDefinition): THREE.BufferGeometry {
  const key = `instanced:${definition.id}`;
  const cached = geometryCache.get(key);
  if (cached) {
    return cached;
  }

  const bodyGeometry = getBodyGeometry(definition).clone();
  if (definition.shape === 'slope') {
    geometryCache.set(key, bodyGeometry);
    return bodyGeometry;
  }

  const parts: THREE.BufferGeometry[] = [bodyGeometry];
  const studBase = getStudGeometry();
  for (let x = 0; x < definition.width; x += 1) {
    for (let z = 0; z < definition.length; z += 1) {
      const studGeometry = studBase.clone();
      studGeometry.translate(
        x - (definition.width - 1) / 2,
        definition.height + BRICK_UNITS.studHeight / 2,
        z - (definition.length - 1) / 2,
      );
      parts.push(studGeometry);
    }
  }

  const merged = mergeGeometries(parts, false);
  if (!merged) {
    geometryCache.set(key, bodyGeometry);
    return bodyGeometry;
  }

  geometryCache.set(key, merged);
  return merged;
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

function getBrickTopHeight(definition: BrickDefinition): number {
  if (definition.shape === 'slope') {
    return definition.height;
  }
  return definition.height + BRICK_UNITS.studHeight;
}

export function computeBrickBounds(brick: Pick<BrickInstance, 'typeId' | 'position' | 'rotation'>): THREE.Box3 {
  const definition = getBrickDefinition(brick.typeId);
  const halfX = definition.width / 2;
  const halfZ = definition.length / 2;
  const topY = getBrickTopHeight(definition);

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

  if (definition.shape !== 'slope') {
    const studGeometry = getStudGeometry();
    for (let x = 0; x < definition.width; x += 1) {
      for (let z = 0; z < definition.length; z += 1) {
        const stud = new THREE.Mesh(studGeometry, material);
        stud.position.set(
          x - (definition.width - 1) / 2,
          definition.height + BRICK_UNITS.studHeight / 2,
          z - (definition.length - 1) / 2,
        );
        stud.castShadow = true;
        stud.receiveShadow = true;
        group.add(stud);
      }
    }
  }

  const wrapper = new THREE.Group();
  wrapper.userData.typeId = brick.typeId;
  wrapper.userData.shape = definition.shape;
  wrapper.add(group);
  wrapper.position.set(brick.position.x, brick.position.y, brick.position.z);
  wrapper.rotation.set(brick.rotation.x, brick.rotation.y, brick.rotation.z);
  return wrapper;
}
