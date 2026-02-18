import { useState, useCallback, useEffect } from 'react';
import { GameState, Tile, TileType, FloatingTextItem, CrisisState } from '@/types/game';
import { BUILDINGS, LEVEL_XP_THRESHOLDS, getBuildingDef } from '@/data/buildings';
import { ALL_MISSIONS } from '@/data/missions';

const GRID_SIZE = 10;

function createEmptyGrid(): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        id: `${x}_${y}`, x, y, type: 'empty', active: false,
        pollution: 0, happiness: 0, waterSupplied: false,
        powered: false, roadConnected: false, abandoned: false,
      });
    }
    grid.push(row);
  }
  return grid;
}

/** Euclidean distance — used for ALL radius checks */
function euclidean(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function hasAdjacentRoad(tile: { x: number; y: number }, grid: Tile[][]): boolean {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs.some(([dx, dy]) => {
    const nx = tile.x + dx, ny = tile.y + dy;
    if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) return false;
    return grid[ny][nx].type === 'road';
  });
}

function isInRadius(tile: { x: number; y: number }, grid: Tile[][], types: TileType | TileType[], radius: number): boolean {
  const typeArr = Array.isArray(types) ? types : [types];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const other = grid[y][x];
      if (typeArr.includes(other.type) && other.active !== false) {
        if (euclidean(tile, other) <= radius) return true;
      }
    }
  }
  return false;
}

function tilesInRadius(tile: { x: number; y: number }, radius: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (euclidean(tile, { x, y }) <= radius && !(x === tile.x && y === tile.y)) {
        result.push({ x, y });
      }
    }
  }
  return result;
}

export function checkDependencies(type: TileType, tile: { x: number; y: number }, grid: Tile[][]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (type !== 'road' && !hasAdjacentRoad(tile, grid)) {
    missing.push('Needs road access');
  }
  if (type === 'residential' || type === 'green_tower') {
    if (!isInRadius(tile, grid, 'water_plant', 3)) missing.push('Needs water (💧 within 3)');
    if (!isInRadius(tile, grid, ['solar_plant', 'wind_turbine'], 3)) missing.push('Needs power (☀️/🌀 within 3)');
  }
  if (type === 'factory') {
    if (!isInRadius(tile, grid, 'water_plant', 3)) missing.push('Needs water supply');
  }
  if (['hospital', 'school'].includes(type)) {
    if (!isInRadius(tile, grid, ['solar_plant', 'wind_turbine'], 3)) missing.push('Needs power');
  }
  if (type === 'eco_dome') {
    if (!isInRadius(tile, grid, ['solar_plant', 'wind_turbine'], 3)) missing.push('Needs power');
  }
  return { valid: missing.length === 0, missing };
}

function recalcDependencies(grid: Tile[][]): Tile[][] {
  const newGrid = grid.map(row => row.map(t => ({ ...t })));
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = newGrid[y][x];
      if (tile.type === 'empty') continue;
      const { valid } = checkDependencies(tile.type, tile, newGrid);
      tile.active = valid;
      tile.roadConnected = tile.type === 'road' || hasAdjacentRoad(tile, newGrid);
      tile.waterSupplied = isInRadius(tile, newGrid, 'water_plant', 3);
      tile.powered = isInRadius(tile, newGrid, ['solar_plant', 'wind_turbine'], 3);
    }
  }
  return newGrid;
}

/** Calculate per-tile happiness based on local neighborhood effects */
function calcTileHappiness(tile: Tile, flat: Tile[]): number {
  let h = 80;
  for (const other of flat) {
    if (!other.active || (other.x === tile.x && other.y === tile.y)) continue;
    const d = euclidean(tile, other);
    if (other.type === 'factory' && d <= 2)      h -= 25 * (1 - d / 3);
    if (other.type === 'park' && d <= 2)          h += 20 * (1 - d / 3);
    if (other.type === 'hospital' && d <= 3)      h += 12 * (1 - d / 4);
    if (other.type === 'school' && d <= 3)        h += 12 * (1 - d / 4);
    if (other.type === 'transit' && d <= 4)       h += 8  * (1 - d / 5);
    if (other.type === 'recycling' && d <= 2)     h += 10 * (1 - d / 3);
    if (other.type === 'eco_dome' && d <= 5)      h += 25 * (1 - d / 6);
  }
  if (!tile.waterSupplied) h -= 20;
  if (!tile.powered) h -= 20;
  if (!tile.roadConnected) h -= 15;
  return clamp(h, 0, 100);
}

/** Calculate income for a single tile based on happiness */
function calcTileIncome(tile: Tile): number {
  if (!tile.active) return 0;
  if (tile.type === 'residential' || tile.type === 'green_tower') {
    const base = tile.type === 'residential' ? 8 : 20;
    if (tile.abandoned || tile.happiness < 25) return 0;
    return base * (tile.happiness / 100);
  }
  if (tile.type === 'factory') return 30;
  if (tile.type === 'wind_turbine') return 5;
  if (tile.type === 'transit') return 10;
  if (tile.type === 'eco_dome') return 30;
  return 0;
}

function runCycleCalc(grid: Tile[][], crisis: CrisisState, lowHappinessCycles: Record<string, number>): {
  income: number; avgHappiness: number; avgPollution: number;
  updatedGrid: Tile[][]; newLowHappinessCycles: Record<string, number>;
  abandonedCount: number; newlyAbandoned: string[];
} {
  const g = grid.map(row => row.map(t => ({ ...t })));
  const flat = g.flat();

  // Step 1: Pollution per tile
  for (const tile of flat) {
    let poll = 0;
    for (const other of flat) {
      if (!other.active) continue;
      const dist = euclidean(tile, other);
      if (other.type === 'factory' && dist <= 2)      poll += 40 * (1 - dist / 3);
      if (other.type === 'park' && dist <= 2)          poll -= 15 * (1 - dist / 3);
      if (other.type === 'recycling' && dist <= 2)     poll -= 20 * (1 - dist / 3);
      if (other.type === 'transit' && dist <= 4)       poll -= 10 * (1 - dist / 5);
      if (other.type === 'eco_dome' && dist <= 4)      poll -= 30 * (1 - dist / 5);
      if (other.type === 'wind_turbine' && dist <= 3)  poll -= 5 * (1 - dist / 4);
    }
    g[tile.y][tile.x].pollution = clamp(poll, 0, 100);
  }

  // Step 2: Happiness per residential (LOCAL effects)
  const resFlatUpdated = g.flat();
  const residentialTiles: Tile[] = [];
  for (const t of resFlatUpdated) {
    if ((t.type === 'residential' || t.type === 'green_tower')) {
      t.happiness = calcTileHappiness(t, resFlatUpdated);
      // Environmental crisis extra penalty
      if (crisis.environmentalCrisis) t.happiness = clamp(t.happiness - 20, 0, 100);
      residentialTiles.push(t);
      g[t.y][t.x] = t;
    }
  }

  // Step 3: Abandonment tracking
  const newLHC = { ...lowHappinessCycles };
  const newlyAbandoned: string[] = [];
  let abandonedCount = 0;
  for (const t of residentialTiles) {
    if (t.happiness < 25) {
      newLHC[t.id] = (newLHC[t.id] || 0) + 1;
      if (newLHC[t.id] >= 4) {
        g[t.y][t.x].abandoned = true;
        if (!t.abandoned) newlyAbandoned.push(t.id);
      }
    } else {
      newLHC[t.id] = 0;
      g[t.y][t.x].abandoned = false;
    }
    if (g[t.y][t.x].abandoned) abandonedCount++;
  }

  // Step 4: Income
  let income = 0;
  for (const row of g) {
    for (const t of row) {
      let tileIncome = calcTileIncome(t);
      // Protest penalty
      if ((t.type === 'residential' || t.type === 'green_tower') && crisis.protestCycles >= 3) {
        tileIncome *= 0.5;
      } else if ((t.type === 'residential' || t.type === 'green_tower') && crisis.protestCycles >= 1) {
        tileIncome *= 0.7;
      }
      income += tileIncome;
    }
  }

  // Environmental crisis: +20% costs (reduce income)
  if (crisis.environmentalCrisis) income *= 0.8;

  const avgHappiness = residentialTiles.length > 0
    ? residentialTiles.reduce((s, t) => s + t.happiness, 0) / residentialTiles.length : 0;

  let totalPoll = 0;
  for (const row of g) for (const t of row) totalPoll += t.pollution;
  const avgPollution = totalPoll / (GRID_SIZE * GRID_SIZE);

  return {
    income: Math.round(income), avgHappiness: Math.round(avgHappiness),
    avgPollution: Math.round(avgPollution), updatedGrid: g,
    newLowHappinessCycles: newLHC, abandonedCount, newlyAbandoned,
  };
}

function countBuildings(grid: Tile[][], type: TileType): number {
  let count = 0;
  for (const row of grid) for (const t of row) if (t.type === type) count++;
  return count;
}

function countActiveBuildings(grid: Tile[][], type: TileType): number {
  let count = 0;
  for (const row of grid) for (const t of row) if (t.type === type && t.active) count++;
  return count;
}

function getLevelFromXP(xp: number): number {
  let level = 1;
  for (let l = 10; l >= 1; l--) {
    if (xp >= (LEVEL_XP_THRESHOLDS[l] || 0)) { level = l; break; }
  }
  return level;
}

export function getPollutionPreview(pos: { x: number; y: number }, type: TileType): { x: number; y: number }[] {
  const def = getBuildingDef(type);
  if (!def || def.pollution <= 0) return [];
  const radius = def.radius || 2;
  return tilesInRadius(pos, radius);
}

/** Compute happiness breakdown for tooltip */
export function getHappinessBreakdown(tile: Tile, grid: Tile[][]): { label: string; value: number }[] {
  const flat = grid.flat();
  const items: { label: string; value: number }[] = [{ label: 'Base', value: 80 }];
  for (const other of flat) {
    if (!other.active || (other.x === tile.x && other.y === tile.y)) continue;
    const d = euclidean(tile, other);
    if (other.type === 'factory' && d <= 2) items.push({ label: `🏭 Factory nearby`, value: -Math.round(25 * (1 - d / 3)) });
    if (other.type === 'park' && d <= 2) items.push({ label: `🌳 Park nearby`, value: +Math.round(20 * (1 - d / 3)) });
    if (other.type === 'hospital' && d <= 3) items.push({ label: `🏥 Hospital nearby`, value: +Math.round(12 * (1 - d / 4)) });
    if (other.type === 'school' && d <= 3) items.push({ label: `🏫 School nearby`, value: +Math.round(12 * (1 - d / 4)) });
    if (other.type === 'transit' && d <= 4) items.push({ label: `🚌 Transit nearby`, value: +Math.round(8 * (1 - d / 5)) });
    if (other.type === 'recycling' && d <= 2) items.push({ label: `♻️ Recycling nearby`, value: +Math.round(10 * (1 - d / 3)) });
    if (other.type === 'eco_dome' && d <= 5) items.push({ label: `🌍 Eco Dome nearby`, value: +Math.round(25 * (1 - d / 6)) });
  }
  if (!tile.waterSupplied) items.push({ label: 'No water', value: -20 });
  if (!tile.powered) items.push({ label: 'No power', value: -20 });
  if (!tile.roadConnected) items.push({ label: 'No road', value: -15 });
  return items;
}

/** Get factory impact info for tooltip */
export function getFactoryImpact(tile: Tile, grid: Tile[][]): { affectedHomes: number; estimatedLoss: number } {
  const flat = grid.flat();
  let affectedHomes = 0;
  let estimatedLoss = 0;
  for (const other of flat) {
    if ((other.type === 'residential' || other.type === 'green_tower') && other.active) {
      const d = euclidean(tile, other);
      if (d <= 2) {
        affectedHomes++;
        const happDrop = 25 * (1 - d / 3);
        const base = other.type === 'residential' ? 8 : 20;
        estimatedLoss += base * (happDrop / 100);
      }
    }
  }
  return { affectedHomes, estimatedLoss: Math.round(estimatedLoss) };
}

/** Get park benefit info for tooltip */
export function getParkBenefit(tile: Tile, grid: Tile[][]): { affectedHomes: number; estimatedGain: number } {
  const flat = grid.flat();
  let affectedHomes = 0;
  let estimatedGain = 0;
  for (const other of flat) {
    if ((other.type === 'residential' || other.type === 'green_tower') && other.active) {
      const d = euclidean(tile, other);
      if (d <= 2) {
        affectedHomes++;
        const happBoost = 20 * (1 - d / 3);
        const base = other.type === 'residential' ? 8 : 20;
        estimatedGain += base * (happBoost / 100);
      }
    }
  }
  return { affectedHomes, estimatedGain: Math.round(estimatedGain) };
}

/**
 * Check missions using FRESH computed state.
 */
function checkMissions(s: GameState, setMissionCompleteId: (id: string | null) => void, setLevelUpFlag: (v: boolean) => void): GameState {
  const currentMission = ALL_MISSIONS[s.currentMissionIndex];
  // Only skip if there's no mission at all — do NOT gate on levelRequired since
  // missions are sequential and the player may have reached this mission before
  // their XP-level catches up (or vice-versa).
  if (!currentMission) return s;

  const flat = s.grid.flat();
  const newSustainCounters = { ...s.sustainCounters };

  const allComplete = currentMission.objectives.every((obj, objIndex) => {
    const key = `${currentMission.id}_${objIndex}`;

    switch (obj.type) {
      case 'build_count':
        return countBuildings(s.grid, obj.target as TileType) >= obj.value;

      case 'build_active':
        return countActiveBuildings(s.grid, obj.target as TileType) >= obj.value;

      case 'radius_coverage': {
        const sources = flat.filter(t => t.type === (obj.source as TileType) && t.active);
        const targets = flat.filter(t => t.type === (obj.target as TileType));
        const covered = targets.filter(target =>
          sources.some(src => euclidean(src, target) <= (obj.radius || 3))
        );
        return covered.length >= obj.value;
      }

      case 'maintain_min': {
        let current = 0;
        if (obj.target === 'happiness') current = s.avgHappiness;
        else if (obj.target === 'cycle_income') current = s.lastCycleIncome;
        return current >= obj.value;
      }

      case 'maintain_max': {
        let current = 0;
        if (obj.target === 'pollution') current = s.avgPollution;
        return current <= obj.value;
      }

      case 'earn_total':
        return s.totalIncomeEarned >= obj.value;

      case 'reach_value': {
        if (obj.target === 'all_residential_active' || obj.target === 'all_residential_powered') {
          const res = flat.filter(t => t.type === 'residential' || t.type === 'green_tower');
          return res.length > 0 && res.every(t => t.active);
        } else if (obj.target === 'all_powered') {
          const buildings = flat.filter(t => t.type !== 'empty' && t.type !== 'road');
          return buildings.length > 0 && buildings.every(t => t.active);
        } else if (obj.target === 'happy_residential_count') {
          return flat.filter(t => (t.type === 'residential' || t.type === 'green_tower') && t.happiness > 75).length >= obj.value;
        } else if (obj.target === 'all_factories_recycled') {
          const factories = flat.filter(t => t.type === 'factory');
          return factories.length > 0 && factories.every(f => isInRadius(f, s.grid, 'recycling', 2));
        } else if (obj.target === 'total_residential') {
          return flat.filter(t => (t.type === 'residential' || t.type === 'green_tower') && t.active).length >= obj.value;
        } else if (obj.target === 'all_active') {
          const buildings = flat.filter(t => t.type !== 'empty');
          return buildings.length > 0 && buildings.every(t => t.active);
        }
        return false;
      }

      case 'sustain_cycles': {
        let met = false;
        if (obj.target === 'happiness') met = s.avgHappiness >= obj.value;
        else if (obj.target === 'pollution_max') met = s.avgPollution <= obj.value;
        else if (obj.target === 'income' || obj.target === 'income_min') met = s.lastCycleIncome >= obj.value;
        else if (obj.target === 'all_powered' || obj.target === 'all_active') {
          const buildings = flat.filter(t => t.type !== 'empty' && t.type !== 'road');
          met = buildings.length > 0 && buildings.every(t => t.active);
        } else if (obj.target === 'wind_income') {
          let wi = 0;
          for (const t of flat) if (t.type === 'wind_turbine' && t.active) wi += 5;
          met = wi >= obj.value;
        } else if (obj.target === 'transit_income') {
          let ti = 0;
          for (const t of flat) if (t.type === 'transit' && t.active) ti += 10;
          met = ti >= obj.value;
        } else if (obj.target === 'all_happy') {
          const res = flat.filter(t => t.type === 'residential' || t.type === 'green_tower');
          met = res.length > 0 && res.every(t => t.happiness >= obj.value);
        }

        const prev = newSustainCounters[key] || 0;
        newSustainCounters[key] = met ? prev + 1 : 0;
        return newSustainCounters[key] >= (obj.cycles || 0);
      }
    }
    return false;
  });

  const stateWithCounters = { ...s, sustainCounters: newSustainCounters };

  if (allComplete) {
    const reward = currentMission.reward;
    const newXP = s.xp + reward.xp;
    const newLevel = getLevelFromXP(newXP);
    const newUnlocks = [...s.unlockedBuildings];
    if (reward.unlocks) reward.unlocks.forEach(u => { if (!newUnlocks.includes(u)) newUnlocks.push(u); });

    setMissionCompleteId(currentMission.id);
    setTimeout(() => setMissionCompleteId(null), 2500);

    if (newLevel > s.level) {
      setLevelUpFlag(true);
      setTimeout(() => setLevelUpFlag(false), 2500);
    }

    const isLast = s.currentMissionIndex >= ALL_MISSIONS.length - 1;

    return {
      ...stateWithCounters,
      xp: newXP,
      level: newLevel,
      money: s.money + reward.money,
      currentMissionIndex: s.currentMissionIndex + 1,
      completedMissions: [...s.completedMissions, currentMission.id],
      unlockedBuildings: newUnlocks,
      gameComplete: isLast,
    };
  }

  return stateWithCounters;
}

/** Compute objective current value for display */
export function getObjectiveProgress(obj: typeof ALL_MISSIONS[0]['objectives'][0], state: GameState): { current: number; target: number; label: string } {
  const flat = state.grid.flat();
  const target = obj.type === 'sustain_cycles' ? (obj.cycles || obj.value) : obj.value;

  switch (obj.type) {
    case 'build_count': {
      const c = countBuildings(state.grid, obj.target as TileType);
      return { current: c, target, label: `Build ${obj.target}: ${c}/${target}` };
    }
    case 'build_active': {
      const c = countActiveBuildings(state.grid, obj.target as TileType);
      return { current: c, target, label: `Active ${obj.target}: ${c}/${target}` };
    }
    case 'radius_coverage': {
      const sources = flat.filter(t => t.type === (obj.source as TileType) && t.active);
      const targets = flat.filter(t => t.type === (obj.target as TileType));
      const covered = targets.filter(t2 => sources.some(src => euclidean(src, t2) <= (obj.radius || 3)));
      return { current: covered.length, target, label: `${obj.source} cover ${obj.target}: ${covered.length}/${target}` };
    }
    case 'maintain_min': {
      let v = 0;
      if (obj.target === 'happiness') v = state.avgHappiness;
      else if (obj.target === 'cycle_income') v = state.lastCycleIncome;
      return { current: v, target, label: `${obj.target} ≥ ${target}: ${v}` };
    }
    case 'maintain_max': {
      let v = 0;
      if (obj.target === 'pollution') v = state.avgPollution;
      return { current: v <= target ? target : target, target, label: `${obj.target} ≤ ${target}: ${v}${v <= target ? ' ✅' : ''}` };
    }
    case 'earn_total':
      return { current: Math.min(state.totalIncomeEarned, target), target, label: `Income: $${state.totalIncomeEarned}/$${target}` };
    case 'reach_value': {
      let current = 0;
      if (obj.target === 'all_residential_active' || obj.target === 'all_residential_powered') {
        const res = flat.filter(t => t.type === 'residential' || t.type === 'green_tower');
        current = res.length > 0 && res.every(t => t.active) ? 1 : 0;
      } else if (obj.target === 'all_powered') {
        const buildings = flat.filter(t => t.type !== 'empty' && t.type !== 'road');
        current = buildings.length > 0 && buildings.every(t => t.active) ? 1 : 0;
      } else if (obj.target === 'happy_residential_count') {
        current = flat.filter(t => (t.type === 'residential' || t.type === 'green_tower') && t.happiness > 75).length;
      } else if (obj.target === 'total_residential') {
        current = flat.filter(t => (t.type === 'residential' || t.type === 'green_tower') && t.active).length;
      }
      return { current, target, label: `${obj.target}: ${current >= target ? '✅' : `${current}/${target}`}` };
    }
    case 'sustain_cycles': {
      const key_prefix = `${ALL_MISSIONS[0]?.id}`; // Will be overridden by caller
      return { current: 0, target, label: `${obj.target}: 0/${target} cycles` };
    }
  }
  return { current: 0, target: obj.value, label: obj.target };
}

export function useGameState() {
  const [state, setState] = useState<GameState>({
    grid: recalcDependencies(createEmptyGrid()),
    money: 500,
    xp: 0,
    level: 1,
    cycles: 0,
    totalIncomeEarned: 0,
    currentMissionIndex: 0,
    completedMissions: [],
    unlockedBuildings: ['road', 'residential', 'water_plant', 'solar_plant'],
    selectedBuilding: null,
    demolishMode: false,
    avgHappiness: 0,
    avgPollution: 0,
    lastCycleIncome: 0,
    gameComplete: false,
    sustainCounters: {},
    crisis: { protestCycles: 0, environmentalCrisis: false, economicCollapse: false },
    lowHappinessCycles: {},
    abandonedCount: 0,
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [missionCompleteId, setMissionCompleteId] = useState<string | null>(null);
  const [levelUpFlag, setLevelUpFlag] = useState(false);
  const [cyclePulse, setCyclePulse] = useState(false);
  const [crisisBanner, setCrisisBanner] = useState<string | null>(null);

  const addFloat = useCallback((text: string, color: string) => {
    const id = Math.random().toString(36);
    setFloatingTexts(prev => [...prev, { id, text, color, x: 50, y: 50 }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1300);
  }, []);

  const showBanner = useCallback((text: string) => {
    setCrisisBanner(text);
    setTimeout(() => setCrisisBanner(null), 4000);
  }, []);

  const selectBuilding = useCallback((type: TileType | null) => {
    setState(s => ({ ...s, selectedBuilding: type, demolishMode: false }));
  }, []);

  const toggleDemolish = useCallback(() => {
    setState(s => ({ ...s, demolishMode: !s.demolishMode, selectedBuilding: null }));
  }, []);

  const placeBuilding = useCallback((x: number, y: number) => {
    setState(s => {
      if (s.demolishMode) {
        const tile = s.grid[y][x];
        if (tile.type === 'empty') return s;
        const def = getBuildingDef(tile.type);
        const refund = def ? Math.floor(def.cost * 0.5) : 0;
        const newGrid = s.grid.map(row => row.map(t => ({ ...t })));
        newGrid[y][x] = { ...newGrid[y][x], type: 'empty', active: false, pollution: 0, happiness: 0, waterSupplied: false, powered: false, roadConnected: false, abandoned: false };
        const finalGrid = recalcDependencies(newGrid);
        const newState = { ...s, grid: finalGrid, money: s.money + refund };
        return checkMissions(newState, setMissionCompleteId, setLevelUpFlag);
      }

      if (!s.selectedBuilding) return s;
      // Economic collapse: can't build
      if (s.crisis.economicCollapse) return s;
      const tile = s.grid[y][x];
      if (tile.type !== 'empty') return s;
      const def = getBuildingDef(s.selectedBuilding);
      if (!def) return s;
      // Environmental crisis: +20% cost
      const cost = s.crisis.environmentalCrisis ? Math.ceil(def.cost * 1.2) : def.cost;
      if (s.money < cost) return s;

      const newGrid = s.grid.map(row => row.map(t => ({ ...t })));
      newGrid[y][x] = { ...newGrid[y][x], type: s.selectedBuilding, justPlaced: true };
      const finalGrid = recalcDependencies(newGrid);

      setTimeout(() => {
        setState(prev => {
          const g = prev.grid.map(row => row.map(t => ({ ...t })));
          if (g[y] && g[y][x]) g[y][x].justPlaced = false;
          return { ...prev, grid: g };
        });
      }, 350);

      const newState = { ...s, grid: finalGrid, money: s.money - cost };
      return checkMissions(newState, setMissionCompleteId, setLevelUpFlag);
    });
  }, []);

  // Auto cycle every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setState(s => {
        if (s.gameComplete) return s;
        const { income, avgHappiness, avgPollution, updatedGrid, newLowHappinessCycles, abandonedCount, newlyAbandoned } =
          runCycleCalc(s.grid, s.crisis, s.lowHappinessCycles);

        // Crisis checks
        const newCrisis: CrisisState = { ...s.crisis };

        // Protest check
        if (avgHappiness < 40) {
          newCrisis.protestCycles = s.crisis.protestCycles + 1;
        } else {
          if (s.crisis.protestCycles > 0) {
            // Recovery
          }
          newCrisis.protestCycles = 0;
        }

        // Environmental crisis
        newCrisis.environmentalCrisis = avgPollution > 80;

        // Economic collapse
        const newMoney = s.money + income;
        newCrisis.economicCollapse = newMoney < 0;

        const newState: GameState = {
          ...s,
          grid: updatedGrid,
          money: newMoney,
          cycles: s.cycles + 1,
          totalIncomeEarned: s.totalIncomeEarned + income,
          avgHappiness,
          avgPollution,
          lastCycleIncome: income,
          crisis: newCrisis,
          lowHappinessCycles: newLowHappinessCycles,
          abandonedCount,
        };

        if (income > 0) addFloat(`+$${income}`, 'hsl(36, 90%, 55%)');
        if (income < 0) addFloat(`-$${Math.abs(income)}`, 'hsl(348, 80%, 59%)');

        // Abandoned notifications
        for (const id of newlyAbandoned) {
          addFloat('🏚️ House abandoned!', 'hsl(348, 80%, 59%)');
        }

        setCyclePulse(true);
        setTimeout(() => setCyclePulse(false), 500);

        return checkMissions(newState, setMissionCompleteId, setLevelUpFlag);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [addFloat]);

  // Crisis banner effects
  useEffect(() => {
    if (state.crisis.protestCycles === 1) {
      showBanner('⚠️ Citizens are protesting! Happiness critical!');
    } else if (state.crisis.protestCycles === 3) {
      showBanner('🚨 CITIZEN REVOLT! Build parks or reduce pollution!');
    }
    if (state.crisis.environmentalCrisis) {
      showBanner('☠️ ENVIRONMENTAL CRISIS! Pollution out of control!');
    }
    if (state.crisis.economicCollapse) {
      showBanner('💸 ECONOMIC COLLAPSE! Cannot build anything!');
    }
    if (state.crisis.protestCycles === 0 && state.avgHappiness >= 40 && state.cycles > 1) {
      // Check if we just recovered - don't show on initial state
    }
  }, [state.crisis.protestCycles, state.crisis.environmentalCrisis, state.crisis.economicCollapse, state.cycles, showBanner, state.avgHappiness]);

  const currentMission = ALL_MISSIONS[state.currentMissionIndex] || null;
  const nextLevelXP = LEVEL_XP_THRESHOLDS[state.level + 1] || LEVEL_XP_THRESHOLDS[10];
  const currentLevelXP = LEVEL_XP_THRESHOLDS[state.level] || 0;
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((state.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

  return {
    state,
    floatingTexts,
    missionCompleteId,
    levelUpFlag,
    cyclePulse,
    crisisBanner,
    currentMission,
    xpProgress,
    selectBuilding,
    toggleDemolish,
    placeBuilding,
  };
}
