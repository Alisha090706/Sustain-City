import { BuildingDef, TileType } from '@/types/game';

export const BUILDINGS: Record<string, BuildingDef> = {
  road:         { type: 'road',         emoji: '🛣️',  name: 'Road',         cost: 10,   income: 0,   pollution: 0,   radius: 0, unlockLevel: 1, needs: [] },
  residential:  { type: 'residential',  emoji: '🏠',  name: 'House',        cost: 50,   income: 8,   pollution: 0,   radius: 0, unlockLevel: 1, needs: ['Road', 'Water', 'Power'] },
  water_plant:  { type: 'water_plant',  emoji: '💧',  name: 'Water Plant',  cost: 100,  income: 0,   pollution: 5,   radius: 3, unlockLevel: 1, needs: ['Road'] },
  factory:      { type: 'factory',      emoji: '🏭',  name: 'Factory',      cost: 150,  income: 30,  pollution: 40,  radius: 2, unlockLevel: 2, needs: ['Road', 'Water'] },
  solar_plant:  { type: 'solar_plant',  emoji: '☀️',  name: 'Solar Plant',  cost: 200,  income: 0,   pollution: 0,   radius: 3, unlockLevel: 1, needs: ['Road'] },
  park:         { type: 'park',         emoji: '🌳',  name: 'Park',         cost: 80,   income: 0,   pollution: -15, radius: 2, unlockLevel: 4, needs: ['Road'] },
  hospital:     { type: 'hospital',     emoji: '🏥',  name: 'Hospital',     cost: 250,  income: 0,   pollution: 0,   radius: 3, unlockLevel: 5, needs: ['Road', 'Power'] },
  school:       { type: 'school',       emoji: '🏫',  name: 'School',       cost: 200,  income: 0,   pollution: 0,   radius: 3, unlockLevel: 6, needs: ['Road', 'Power'] },
  wind_turbine: { type: 'wind_turbine', emoji: '🌀',  name: 'Wind Turbine', cost: 180,  income: 5,   pollution: -5,  radius: 3, unlockLevel: 7, needs: ['Road'] },
  recycling:    { type: 'recycling',    emoji: '♻️',  name: 'Recycling',    cost: 160,  income: 0,   pollution: -20, radius: 2, unlockLevel: 8, needs: ['Road'] },
  transit:      { type: 'transit',      emoji: '🚌',  name: 'Transit Hub',  cost: 220,  income: 10,  pollution: -10, radius: 4, unlockLevel: 9, needs: ['Road'] },
  green_tower:  { type: 'green_tower',  emoji: '🏙️',  name: 'Green Tower',  cost: 300,  income: 15,  pollution: 0,   radius: 0, unlockLevel: 9, needs: ['Road', 'Water', 'Power'] },
  eco_dome:     { type: 'eco_dome',     emoji: '🌍',  name: 'Eco Dome',     cost: 500,  income: 0,   pollution: -30, radius: 4, unlockLevel: 10, needs: ['Road', 'Power'] },
};

export const BUILDING_LIST: BuildingDef[] = Object.values(BUILDINGS);

export const LEVEL_XP_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 450,
  5: 700,
  6: 1050,
  7: 1480,
  8: 2000,
  9: 2660,
  10: 3500,
};

export function getBuildingDef(type: TileType): BuildingDef | undefined {
  return BUILDINGS[type];
}
