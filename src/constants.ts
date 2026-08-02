export const BRICK_UNITS = {
  studSize: 1,
  brickHeight: 1.2,
  plateHeight: 0.4,
  studDiameter: 0.56,
  studHeight: 0.15,
};

export const ROTATION_STEP = Math.PI / 2;

export const BRICK_TYPES = [
  { id: '1x1', width: 1, length: 1, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x1', width: 2, length: 1, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x2', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '4x2', width: 4, length: 2, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x2_slope', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'slope' as const },
];

export const DEFAULT_COLORS = [
  '#E53935',
  '#1E88E5',
  '#43A047',
  '#FDD835',
  '#FB8C00',
  '#6D4C41',
  '#00897B',
  '#8E24AA',
  '#546E7A',
  '#F5F5F5',
  '#111111',
  '#EF6C99',
];
