import { TileType, CrisisState } from '@/types/game';
import { BUILDING_LIST } from '@/data/buildings';

interface BuildingToolbarProps {
  selectedBuilding: TileType | null;
  demolishMode: boolean;
  unlockedBuildings: TileType[];
  money: number;
  level: number;
  crisis: CrisisState;
  onSelect: (type: TileType | null) => void;
  onDemolish: () => void;
}

export function BuildingToolbar({
  selectedBuilding, demolishMode, unlockedBuildings, money, level, crisis, onSelect, onDemolish
}: BuildingToolbarProps) {
  const disabled = crisis.economicCollapse;

  return (
    <div className="flex items-center gap-2 p-2 bg-card pixel-border overflow-x-auto" style={{ maxHeight: '80px' }}>
      {disabled && (
        <div className="flex items-center px-2" style={{ fontSize: '7px' }}>
          <span className="text-game-red">💸 DEBT — Cannot build!</span>
        </div>
      )}
      {BUILDING_LIST.map(b => {
        const unlocked = unlockedBuildings.includes(b.type);
        const costMultiplier = crisis.environmentalCrisis ? 1.2 : 1;
        const actualCost = Math.ceil(b.cost * costMultiplier);
        const affordable = money >= actualCost;
        const isSelected = selectedBuilding === b.type;
        const isDisabled = !unlocked || disabled;

        return (
          <button
            key={b.type}
            onClick={() => !isDisabled ? onSelect(isSelected ? null : b.type) : undefined}
            className={`
              flex flex-col items-center justify-center min-w-[72px] h-[64px] p-1 pixel-border pixel-hover
              ${isSelected ? 'border-primary bg-primary/20 shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : 'bg-secondary'}
              ${isDisabled ? 'grayscale opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${!isDisabled && !affordable ? 'opacity-70' : ''}
              transition-all
            `}
            title={
              disabled
                ? '💸 Economic collapse — cannot build'
                : !unlocked
                ? `🔒 Unlocks at Level ${b.unlockLevel}`
                : `${b.name}\nCost: $${actualCost} | Income: $${b.income}/cycle\nPollution: ${b.pollution > 0 ? '🔴 High' : b.pollution < 0 ? '🟢 Reduces' : '⚪ None'}${b.needs.length ? `\nNeeds: ${b.needs.join(' + ')}` : ''}`
            }
          >
            <span style={{ fontSize: '20px' }}>{isDisabled && !unlocked ? '🔒' : b.emoji}</span>
            <span className="text-foreground truncate w-full text-center" style={{ fontSize: '6px' }}>{b.name}</span>
            <span className={`${crisis.environmentalCrisis ? 'text-game-red' : 'text-game-gold'}`} style={{ fontSize: '6px' }}>
              ${actualCost}
            </span>
          </button>
        );
      })}

      {/* Demolish */}
      <button
        onClick={onDemolish}
        className={`
          flex flex-col items-center justify-center min-w-[72px] h-[64px] p-1 pixel-border pixel-hover cursor-pointer
          ${demolishMode ? 'border-primary bg-primary/20' : 'bg-secondary'}
        `}
        title="Demolish Mode — Click to remove buildings (50% refund)"
      >
        <span style={{ fontSize: '20px' }}>🔨</span>
        <span className="text-foreground" style={{ fontSize: '6px' }}>Demolish</span>
      </button>
    </div>
  );
}
