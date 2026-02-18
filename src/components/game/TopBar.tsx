import { GameState } from '@/types/game';

interface TopBarProps {
  state: GameState;
  xpProgress: number;
  cyclePulse: boolean;
}

export function TopBar({ state, xpProgress, cyclePulse }: TopBarProps) {
  const happinessColor = state.avgHappiness > 70 ? 'text-game-green' : state.avgHappiness > 50 ? 'text-game-gold' : 'text-game-red';
  const pollutionColor = state.avgPollution < 30 ? 'text-game-green' : state.avgPollution < 60 ? 'text-game-gold' : 'text-game-red';
  const moneyColor = state.crisis.economicCollapse ? 'text-game-red' : 'text-game-gold';

  return (
    <div className="flex items-center gap-2 p-2 bg-card pixel-border flex-wrap" style={{ fontSize: '8px' }}>
      {/* Money */}
      <div className={`flex items-center gap-1 px-2 py-1 pixel-border ${state.crisis.economicCollapse ? 'bg-primary/20' : 'bg-secondary'}`}>
        <span>💰</span>
        <span className={moneyColor}>Money: ${state.money}</span>
        {state.crisis.economicCollapse && <span className="text-game-red" style={{ fontSize: '6px' }}>DEBT</span>}
      </div>

      {/* XP */}
      <div className="flex items-center gap-1 px-2 py-1 pixel-border bg-secondary min-w-[140px]">
        <span>⭐</span>
        <span>XP: {state.xp}</span>
        <div className="w-12 h-2 bg-muted pixel-border ml-1 relative overflow-hidden">
          <div
            className="h-full bg-game-gold transition-all duration-300"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      {/* Level */}
      <div className="flex items-center gap-1 px-2 py-1 pixel-border bg-secondary">
        <span>🏆</span>
        <span className="text-game-teal">Level: {state.level}</span>
      </div>

      {/* Happiness */}
      <div className={`flex items-center gap-1 px-2 py-1 pixel-border ${state.crisis.protestCycles >= 1 ? 'bg-primary/20' : 'bg-secondary'}`}>
        <span>{state.crisis.protestCycles >= 3 ? '🚨' : state.crisis.protestCycles >= 1 ? '📢' : '😊'}</span>
        <span className={happinessColor}>Happiness: {state.avgHappiness}%</span>
      </div>

      {/* Pollution */}
      <div className={`flex items-center gap-1 px-2 py-1 pixel-border ${state.crisis.environmentalCrisis ? 'bg-primary/20' : 'bg-secondary'}`}>
        <span>{state.crisis.environmentalCrisis ? '☠️' : '☁️'}</span>
        <span className={pollutionColor}>Pollution: {state.avgPollution}%</span>
      </div>

      {/* Cycle */}
      <div className={`flex items-center gap-1 px-2 py-1 pixel-border bg-secondary ${cyclePulse ? 'gold-flash' : ''}`}>
        <span>🔄</span>
        <span>Cycle: {state.cycles}</span>
      </div>
    </div>
  );
}
