import type { BrickInstance } from './types';

interface SavePayload {
  version: string;
  createdAt: string;
  brickCount: number;
  bricks: Array<{
    id: string;
    typeId: string;
    color: string;
    position: [number, number, number];
    rotation: [number, number, number];
  }>;
}

export function serializeBricks(bricks: BrickInstance[]): string {
  const payload: SavePayload = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    brickCount: bricks.length,
    bricks: bricks.map((brick) => ({
      id: brick.id,
      typeId: brick.typeId,
      color: brick.color,
      position: [brick.position.x, brick.position.y, brick.position.z],
      rotation: [brick.rotation.x, brick.rotation.y, brick.rotation.z],
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export function parseBricks(raw: string): BrickInstance[] {
  const parsed = JSON.parse(raw) as SavePayload;

  if (!parsed || !Array.isArray(parsed.bricks)) {
    throw new Error('Invalid file format.');
  }

  return parsed.bricks.map((brick) => ({
    id: brick.id,
    typeId: brick.typeId,
    color: brick.color,
    position: {
      x: brick.position[0],
      y: brick.position[1],
      z: brick.position[2],
    },
    rotation: {
      x: brick.rotation[0],
      y: brick.rotation[1],
      z: brick.rotation[2],
    },
  }));
}
