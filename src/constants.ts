export const BRICK_UNITS = {
  studSize: 1,
  brickHeight: 1.2,
  plateHeight: 0.4,
  studDiameter: 0.56,
  studHeight: 0.15,
};

export const ROTATION_STEP = Math.PI / 2;

export const BRICK_TYPES = [
  // Core bricks
  { id: '1x1_brick', name: 'Brick 1x1', category: 'Core Bricks', width: 1, length: 1, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '1x2_brick', name: 'Brick 1x2', category: 'Core Bricks', width: 1, length: 2, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '1x3_brick', name: 'Brick 1x3', category: 'Core Bricks', width: 1, length: 3, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '1x4_brick', name: 'Brick 1x4', category: 'Core Bricks', width: 1, length: 4, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x2_brick', name: 'Brick 2x2', category: 'Core Bricks', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x3_brick', name: 'Brick 2x3', category: 'Core Bricks', width: 2, length: 3, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x4_brick', name: 'Brick 2x4', category: 'Core Bricks', width: 2, length: 4, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '2x6_brick', name: 'Brick 2x6', category: 'Core Bricks', width: 2, length: 6, height: BRICK_UNITS.brickHeight, shape: 'block' as const },
  { id: '4x4_brick', name: 'Brick 4x4', category: 'Core Bricks', width: 4, length: 4, height: BRICK_UNITS.brickHeight, shape: 'block' as const },

  // Plates
  { id: '1x1_plate', name: 'Plate 1x1', category: 'Plates', width: 1, length: 1, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '1x2_plate', name: 'Plate 1x2', category: 'Plates', width: 1, length: 2, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '1x3_plate', name: 'Plate 1x3', category: 'Plates', width: 1, length: 3, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '1x4_plate', name: 'Plate 1x4', category: 'Plates', width: 1, length: 4, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '2x2_plate', name: 'Plate 2x2', category: 'Plates', width: 2, length: 2, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '2x3_plate', name: 'Plate 2x3', category: 'Plates', width: 2, length: 3, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '2x4_plate', name: 'Plate 2x4', category: 'Plates', width: 2, length: 4, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },
  { id: '4x4_plate', name: 'Plate 4x4', category: 'Plates', width: 4, length: 4, height: BRICK_UNITS.plateHeight, shape: 'plate' as const },

  // Tiles
  { id: '1x1_tile', name: 'Tile 1x1', category: 'Tiles', width: 1, length: 1, height: BRICK_UNITS.plateHeight * 0.9, shape: 'tile' as const },
  { id: '1x2_tile', name: 'Tile 1x2', category: 'Tiles', width: 1, length: 2, height: BRICK_UNITS.plateHeight * 0.9, shape: 'tile' as const },
  { id: '1x3_tile', name: 'Tile 1x3', category: 'Tiles', width: 1, length: 3, height: BRICK_UNITS.plateHeight * 0.9, shape: 'tile' as const },
  { id: '2x2_tile', name: 'Tile 2x2', category: 'Tiles', width: 2, length: 2, height: BRICK_UNITS.plateHeight * 0.9, shape: 'tile' as const },
  { id: '2x4_tile', name: 'Tile 2x4', category: 'Tiles', width: 2, length: 4, height: BRICK_UNITS.plateHeight * 0.9, shape: 'tile' as const },

  // Slopes and wedges
  { id: '1x2_slope', name: 'Slope 1x2', category: 'Slopes', width: 1, length: 2, height: BRICK_UNITS.brickHeight, shape: 'slope' as const },
  { id: '2x2_slope', name: 'Slope 2x2', category: 'Slopes', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'slope' as const },
  { id: '2x3_slope', name: 'Slope 2x3', category: 'Slopes', width: 2, length: 3, height: BRICK_UNITS.brickHeight, shape: 'slope' as const },
  { id: '2x4_slope', name: 'Slope 2x4', category: 'Slopes', width: 2, length: 4, height: BRICK_UNITS.brickHeight, shape: 'slope' as const },
  { id: '2x2_wedge', name: 'Wedge 2x2', category: 'Slopes', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'wedge' as const },
  { id: '2x4_wedge', name: 'Wedge 2x4', category: 'Slopes', width: 2, length: 4, height: BRICK_UNITS.brickHeight, shape: 'wedge' as const },

  // Rounded pieces
  { id: '1x1_round', name: 'Round 1x1', category: 'Rounded', width: 1, length: 1, height: BRICK_UNITS.brickHeight, shape: 'round' as const },
  { id: '2x2_round', name: 'Round 2x2', category: 'Rounded', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'round' as const },
  { id: '2x2_quarter_round', name: 'Quarter Round 2x2', category: 'Rounded', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'quarter_round' as const },
  { id: '4x4_round_plate', name: 'Round Plate 4x4', category: 'Rounded', width: 4, length: 4, height: BRICK_UNITS.plateHeight, shape: 'round' as const },

  // Arches and cylinders
  { id: '1x3_arch', name: 'Arch 1x3', category: 'Arches', width: 1, length: 3, height: BRICK_UNITS.brickHeight * 1.4, shape: 'arch' as const },
  { id: '1x4_arch', name: 'Arch 1x4', category: 'Arches', width: 1, length: 4, height: BRICK_UNITS.brickHeight * 1.4, shape: 'arch' as const },
  { id: '2x2_arch', name: 'Arch 2x2', category: 'Arches', width: 2, length: 2, height: BRICK_UNITS.brickHeight * 1.4, shape: 'arch' as const },
  { id: '2x2_cylinder', name: 'Cylinder 2x2', category: 'Arches', width: 2, length: 2, height: BRICK_UNITS.brickHeight, shape: 'cylinder' as const },

  // Decorative / themed
  { id: 'small_chest', name: 'Chest Small', category: 'Decorative', width: 2, length: 2, height: BRICK_UNITS.brickHeight * 1.2, shape: 'chest' as const },
  { id: 'long_chest', name: 'Chest Long', category: 'Decorative', width: 2, length: 3, height: BRICK_UNITS.brickHeight * 1.2, shape: 'chest' as const },
  { id: 'flag_short', name: 'Flag Short', category: 'Decorative', width: 1, length: 1, height: BRICK_UNITS.brickHeight * 2.4, shape: 'flag' as const },
  { id: 'flag_tall', name: 'Flag Tall', category: 'Decorative', width: 1, length: 1, height: BRICK_UNITS.brickHeight * 3.6, shape: 'flag' as const },
  { id: 'banner_panel', name: 'Banner Panel', category: 'Decorative', width: 1, length: 2, height: BRICK_UNITS.brickHeight * 2, shape: 'flag' as const },
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
