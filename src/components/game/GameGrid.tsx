import { useState } from 'react';
import { Tile, TileType, FloatingTextItem } from '@/types/game';
import { getBuildingDef, BUILDINGS } from '@/data/buildings';
import { checkDependencies, getPollutionPreview, getHappinessBreakdown, getFactoryImpact, getParkBenefit } from '@/hooks/useGameState';

interface GameGridProps {
  grid: Tile[][];
  selectedBuilding: TileType | null;
  demolishMode: boolean;
  onPlace: (x: number, y: number) => void;
  floatingTexts: FloatingTextItem[];
  cyclePulse: boolean;
  environmentalCrisis?: boolean;
}

function TileTooltip({ tile, grid }: { tile: Tile; grid: Tile[][] }) {
  const def = getBuildingDef(tile.type);
  if (!def) return null;

  if (tile.type === 'residential' || tile.type === 'green_tower') {
    const breakdown = getHappinessBreakdown(tile, grid);
    const base = tile.type === 'residential' ? 8 : 20;
    const income = tile.abandoned ? 0 : Math.round(base * (tile.happiness / 100) * 10) / 10;
    const status = tile.abandoned ? 'ABANDONED' : tile.happiness < 25 ? 'CRITICAL' : tile.happiness < 50 ? 'STRUGGLING' : tile.happiness < 75 ? 'OK' : 'THRIVING';
    return (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pixel-border bg-card p-2 w-[200px] pointer-events-none" style={{ fontSize: '5px' }}>
        <p className="text-game-gold mb-1">{def.emoji} {def.name} [{tile.y},{tile.x}]</p>
        <p className="text-foreground">Happiness: {Math.round(tile.happiness)}% {tile.happiness < 50 ? '⚠️' : ''}</p>
        {breakdown.map((b, i) => (
          <p key={i} className={b.value >= 0 ? 'text-game-green' : 'text-game-red'}>
            {b.label}: {b.value > 0 ? '+' : ''}{b.value}
          </p>
        ))}
        <p className="text-game-gold mt-1">Income: ${income}/cycle</p>
        <p className={`mt-0.5 ${tile.happiness < 50 ? 'text-game-red' : 'text-game-green'}`}>Status: {status}</p>
      </div>
    );
  }

  if (tile.type === 'factory') {
    const impact = getFactoryImpact(tile, grid);
    return (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pixel-border bg-card p-2 w-[200px] pointer-events-none" style={{ fontSize: '5px' }}>
        <p className="text-game-gold mb-1">{def.emoji} Factory [{tile.y},{tile.x}]</p>
        <p className="text-game-green">Income: +$30/cycle</p>
        <p className="text-game-red">Pollution: HIGH (radius 2)</p>
        <p className="text-foreground">Affecting {impact.affectedHomes} residential tiles</p>
        <p className="text-game-red">Est. income loss: -${impact.estimatedLoss}/cycle</p>
        <p className="text-game-gold">Net value: +${30 - impact.estimatedLoss}/cycle</p>
      </div>
    );
  }

  if (tile.type === 'park') {
    const benefit = getParkBenefit(tile, grid);
    return (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pixel-border bg-card p-2 w-[200px] pointer-events-none" style={{ fontSize: '5px' }}>
        <p className="text-game-gold mb-1">{def.emoji} Park [{tile.y},{tile.x}]</p>
        <p className="text-game-green">Happiness boost radius: 2</p>
        <p className="text-foreground">Affecting {benefit.affectedHomes} residential tiles</p>
        <p className="text-game-green">Est. income gain: +${benefit.estimatedGain}/cycle</p>
      </div>
    );
  }

  // Generic building tooltip
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pixel-border bg-card p-2 w-[180px] pointer-events-none" style={{ fontSize: '5px' }}>
      <p className="text-game-gold mb-1">{def.emoji} {def.name}</p>
      {def.income > 0 && <p className="text-game-green">Income: +${def.income}/cycle</p>}
      {def.pollution !== 0 && <p className={def.pollution > 0 ? 'text-game-red' : 'text-game-green'}>Pollution: {def.pollution > 0 ? '+' : ''}{def.pollution}</p>}
      <p className="text-foreground">Active: {tile.active ? '✅' : '❌'}</p>
    </div>
  );
}

export function GameGrid({ grid, selectedBuilding, demolishMode, onPlace, floatingTexts, cyclePulse, environmentalCrisis }: GameGridProps) {
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const pollutionPreview = hoverTile && selectedBuilding
    ? getPollutionPreview(hoverTile, selectedBuilding) : [];

  const isValidPlacement = hoverTile && selectedBuilding
    ? grid[hoverTile.y][hoverTile.x].type === 'empty'
    : false;

  // Tooltip delay
  const handleMouseEnter = (x: number, y: number) => {
    setHoverTile({ x, y });
    setShowTooltip(false);
    setTimeout(() => setShowTooltip(true), 200);
  };

  return (
    <div className={`relative inline-block pixel-border bg-game-grass p-1 ${cyclePulse ? 'cycle-pulse' : ''}`}>
      {/* Environmental crisis smog overlay */}
      {environmentalCrisis && (
        <div className="absolute inset-0 pointer-events-none z-20" style={{ backgroundColor: 'rgba(30, 20, 10, 0.35)' }} />
      )}

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(10, 1fr)`,
          gap: '1px',
        }}
      >
        {grid.map((row, y) =>
          row.map((tile, x) => {
            const def = tile.type !== 'empty' ? getBuildingDef(tile.type) : null;
            const isHovered = hoverTile?.x === x && hoverTile?.y === y;
            const isPollPreview = pollutionPreview.some(p => p.x === x && p.y === y);
            const deps = tile.type !== 'empty' ? checkDependencies(tile.type, tile, grid) : null;
            const isResidential = tile.type === 'residential' || tile.type === 'green_tower';
            const lowHappinessCycles = tile.type !== 'empty' && isResidential;

            // Happiness-based tint for residential
            let happinessTint = '';
            let happinessIcon = '';
            if (isResidential && tile.active) {
              if (tile.abandoned || tile.happiness < 25) {
                happinessTint = 'rgba(200, 50, 50, 0.3)';
                happinessIcon = '😡';
              } else if (tile.happiness < 50) {
                happinessTint = 'rgba(255, 160, 0, 0.25)';
                happinessIcon = '⚠️';
              } else if (tile.happiness < 75) {
                happinessTint = 'rgba(255, 220, 50, 0.15)';
                happinessIcon = '😐';
              }
            }

            return (
              <div
                key={tile.id}
                className={`
                  relative flex items-center justify-center cursor-pointer select-none
                  w-[56px] h-[56px] max-[768px]:w-[40px] max-[768px]:h-[40px]
                  ${tile.type === 'empty' ? 'grass-tile' : 'bg-card'}
                  ${tile.justPlaced ? 'bounce-in' : ''}
                  ${tile.type !== 'empty' && !tile.active ? 'inactive-pulse' : ''}
                  ${isResidential && tile.happiness > 80 && tile.active && !tile.abandoned ? 'happy-shimmer' : ''}
                  ${tile.abandoned ? 'abandon-blink' : ''}
                  ${isHovered && selectedBuilding && isValidPlacement ? 'ring-2 ring-game-green ring-inset' : ''}
                  ${isHovered && selectedBuilding && !isValidPlacement && tile.type !== 'empty' ? 'ring-2 ring-game-red ring-inset' : ''}
                  ${isHovered && demolishMode && tile.type !== 'empty' ? 'ring-2 ring-game-red ring-inset' : ''}
                  transition-all duration-100
                `}
                style={{ fontSize: '24px' }}
                onClick={() => onPlace(x, y)}
                onMouseEnter={() => handleMouseEnter(x, y)}
                onMouseLeave={() => { setHoverTile(null); setShowTooltip(false); }}
                title={deps && !deps.valid ? `⚠️ ${deps.missing.join(', ')}` : ''}
              >
                {/* Pollution overlay */}
                {tile.pollution > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: `rgba(80, 60, 20, ${tile.pollution / 200})`,
                    }}
                  />
                )}

                {/* Happiness tint overlay for residential */}
                {happinessTint && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: happinessTint }} />
                )}

                {/* Pollution preview (factory placement) */}
                {isPollPreview && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255, 100, 0, 0.3)' }} />
                )}

                {/* Building placement preview */}
                {isHovered && selectedBuilding && tile.type === 'empty' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="opacity-50">{BUILDINGS[selectedBuilding]?.emoji}</span>
                  </div>
                )}

                {/* Building emoji */}
                {tile.type !== 'empty' && def && (
                  <span className={`${!tile.active || tile.abandoned ? 'grayscale opacity-60' : ''} relative z-10`}>
                    {tile.abandoned ? '🏚️' : def.emoji}
                  </span>
                )}

                {/* Happiness indicator icon */}
                {happinessIcon && tile.active && (
                  <span className="absolute top-0 right-0 z-20 pointer-events-none" style={{ fontSize: '10px' }}>
                    {happinessIcon}
                  </span>
                )}

                {/* Protest overlay */}
                {isResidential && tile.active && environmentalCrisis && (
                  <span className="absolute bottom-0 left-0 z-20 pointer-events-none" style={{ fontSize: '8px' }}>
                    📢
                  </span>
                )}

                {/* Active glow */}
                {tile.type !== 'empty' && tile.active && !tile.abandoned && (
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_8px_rgba(255,255,255,0.15)]" />
                )}

                {/* Demolish preview */}
                {isHovered && demolishMode && tile.type !== 'empty' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-game-red/30 pointer-events-none z-20">
                    <span>💥</span>
                  </div>
                )}

                {/* Tooltip */}
                {isHovered && showTooltip && tile.type !== 'empty' && !selectedBuilding && !demolishMode && (
                  <TileTooltip tile={tile} grid={grid} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating texts */}
      {floatingTexts.map(ft => (
        <div
          key={ft.id}
          className="absolute float-up pointer-events-none font-pixel z-30"
          style={{
            left: '50%',
            top: '40%',
            transform: 'translateX(-50%)',
            color: ft.color,
            fontSize: '12px',
            textShadow: '2px 2px 0px #000',
          }}
        >
          {ft.text}
        </div>
      ))}
    </div>
  );
}
