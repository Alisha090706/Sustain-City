export type TileType =
  | 'empty' | 'road' | 'residential' | 'water_plant' | 'factory'
  | 'solar_plant' | 'park' | 'hospital' | 'school' | 'wind_turbine'
  | 'recycling' | 'transit' | 'green_tower' | 'eco_dome';

export interface Tile {
  id: string;
  x: number;
  y: number;
  type: TileType;
  active: boolean;
  pollution: number;
  happiness: number;
  waterSupplied: boolean;
  powered: boolean;
  roadConnected: boolean;
  justPlaced?: boolean;
  abandoned?: boolean;
}

export interface BuildingDef {
  type: TileType;
  emoji: string;
  name: string;
  cost: number;
  income: number;
  pollution: number;
  radius: number;
  unlockLevel: number;
  needs: string[];
}

export interface Objective {
  type: 'build_count' | 'build_active' | 'maintain_min' | 'maintain_max' | 'earn_total' | 'reach_value' | 'sustain_cycles' | 'radius_coverage';
  target: string;
  value: number;
  current: number;
  cycles?: number;
  sustainedCycles?: number;
  source?: string;
  radius?: number;
}

export interface Mission {
  id: string;
  levelRequired: number;
  title: string;
  description: string;
  objectives: Objective[];
  reward: { xp: number; money: number; unlocks?: TileType[] };
}

export interface CrisisState {
  protestCycles: number;       // consecutive cycles with happiness < 40
  environmentalCrisis: boolean; // pollution > 80
  economicCollapse: boolean;    // money < 0
}

export interface GameState {
  grid: Tile[][];
  money: number;
  xp: number;
  level: number;
  cycles: number;
  totalIncomeEarned: number;
  currentMissionIndex: number;
  completedMissions: string[];
  unlockedBuildings: TileType[];
  selectedBuilding: TileType | null;
  demolishMode: boolean;
  avgHappiness: number;
  avgPollution: number;
  lastCycleIncome: number;
  gameComplete: boolean;
  sustainCounters: Record<string, number>;
  crisis: CrisisState;
  lowHappinessCycles: Record<string, number>; // tile id -> consecutive cycles < 25
  abandonedCount: number;
}

export interface FloatingTextItem {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}
