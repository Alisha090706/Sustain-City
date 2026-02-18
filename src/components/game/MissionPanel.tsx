import { useState } from 'react';
import { Mission, GameState } from '@/types/game';
import { ALL_MISSIONS } from '@/data/missions';
import { getObjectiveProgress } from '@/hooks/useGameState';

interface MissionPanelProps {
  state: GameState;
  currentMission: Mission | null;
  missionCompleteId: string | null;
}

export function MissionPanel({ state, currentMission, missionCompleteId }: MissionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(true);

  if (state.gameComplete) {
    return (
      <div className="pixel-border bg-card p-3 w-[240px] flex flex-col items-center gap-2" style={{ fontSize: '8px' }}>
        <span style={{ fontSize: '24px' }}>🏆</span>
        <p className="text-game-gold text-center">SUSTAIN CITY LEGEND!</p>
        <p className="text-muted-foreground text-center">You completed all missions!</p>
        <p className="text-game-teal">Score: {state.money + state.xp * 10}</p>
      </div>
    );
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="pixel-border bg-card p-2 cursor-pointer pixel-hover"
        style={{ fontSize: '10px' }}
      >
        ▶
      </button>
    );
  }

  const levelMissions = currentMission
    ? ALL_MISSIONS.filter(m => m.levelRequired === currentMission.levelRequired)
    : [];

  // Active crises
  const crises: string[] = [];
  if (state.crisis.protestCycles >= 1) crises.push('📢 Protest');
  if (state.crisis.environmentalCrisis) crises.push('☠️ Pollution');
  if (state.crisis.economicCollapse) crises.push('💸 Bankrupt');

  return (
    <div className="pixel-border bg-card p-2 w-[240px] flex flex-col gap-2 overflow-y-auto" style={{ fontSize: '7px', maxHeight: 'calc(100vh - 200px)' }}>
      <div className="flex items-center justify-between">
        <span className="text-game-gold">📋 Missions - Lvl {currentMission?.levelRequired || state.level}</span>
        <button onClick={() => setCollapsed(true)} className="pixel-hover text-muted-foreground">◀</button>
      </div>

      {/* Crisis indicator */}
      {crises.length > 0 && (
        <div className="pixel-border bg-primary/20 p-1">
          <p className="text-game-red" style={{ fontSize: '6px' }}>🔥 CRISIS: {crises.join(' | ')}</p>
        </div>
      )}

      {levelMissions.map(mission => {
        const isCompleted = state.completedMissions.includes(mission.id);
        const isCurrent = currentMission?.id === mission.id;
        const isFlashing = missionCompleteId === mission.id;

        return (
          <div
            key={mission.id}
            className={`
              pixel-border p-2
              ${isFlashing ? 'panel-gold-flash' : ''}
              ${isCurrent ? 'border-primary bg-primary/10' : 'bg-secondary'}
              ${isCompleted ? 'opacity-60' : ''}
            `}
          >
            <p className={`${isCompleted ? 'line-through' : ''} ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
              {isCompleted ? '✅ ' : isCurrent ? '▶ ' : '○ '}
              {mission.title}
            </p>
            <p className="text-muted-foreground mt-1">{mission.description}</p>

            {isCurrent && !isCompleted && (
              <div className="mt-1 space-y-1">
                {mission.objectives.map((obj, i) => {
                  let current = 0;
                  let target = obj.value;
                  let label = '';
                  let isMet = false;

                  // Use centralized progress calc
                  const progress = getObjectiveProgress(obj, state);

                  if (obj.type === 'sustain_cycles') {
                    const key = `${mission.id}_${i}`;
                    const sustained = state.sustainCounters[key] || 0;
                    target = obj.cycles || target;
                    current = sustained;
                    label = `${obj.target}: ${sustained}/${target} cycles`;
                    isMet = sustained >= target;
                  } else if (obj.type === 'maintain_max') {
                    let v = 0;
                    if (obj.target === 'pollution') v = state.avgPollution;
                    label = `${obj.target} ≤ ${target}: ${v}`;
                    current = v <= target ? target : 0;
                    isMet = v <= target;
                  } else if (obj.type === 'maintain_min') {
                    let v = 0;
                    if (obj.target === 'happiness') v = state.avgHappiness;
                    else if (obj.target === 'cycle_income') v = state.lastCycleIncome;
                    label = `${obj.target} ≥ ${target}: ${v}`;
                    current = v >= target ? target : 0;
                    isMet = v >= target;
                  } else {
                    current = progress.current;
                    target = progress.target;
                    label = progress.label;
                    isMet = current >= target;
                  }

                  const pct = obj.type === 'sustain_cycles'
                    ? (current / (obj.cycles || 1)) * 100
                    : Math.min(100, (current / Math.max(target, 1)) * 100);

                  return (
                    <div key={i}>
                      <p className="text-muted-foreground" style={{ fontSize: '6px' }}>
                        {label} {isMet ? '✅' : ''}
                      </p>
                      <div className="w-full h-1.5 bg-muted pixel-border overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isMet ? 'hsl(var(--game-green))' : 'hsl(36, 90%, 55%)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isCurrent && (
              <p className="text-game-gold mt-1" style={{ fontSize: '6px' }}>
                Reward: +${mission.reward.money} | +{mission.reward.xp} XP
                {mission.reward.unlocks ? ` | 🔓 ${mission.reward.unlocks.join(', ')}` : ''}
              </p>
            )}
          </div>
        );
      })}

      {/* City Health Panel */}
      <button
        onClick={() => setHealthOpen(!healthOpen)}
        className="pixel-border bg-secondary p-1 cursor-pointer text-foreground pixel-hover"
        style={{ fontSize: '6px' }}
      >
        {healthOpen ? '▼' : '▶'} CITY HEALTH
      </button>
      {healthOpen && (
        <div className="pixel-border bg-secondary/50 p-1.5 space-y-0.5" style={{ fontSize: '6px' }}>
          <p className="text-game-gold">💰 Income/cycle: ${state.lastCycleIncome}</p>
          <p className="text-foreground">🏠 Active homes: {state.grid.flat().filter(t => (t.type === 'residential' || t.type === 'green_tower') && t.active && !t.abandoned).length}</p>
          <p className={state.abandonedCount > 0 ? 'text-game-red' : 'text-foreground'}>
            🏚️ Abandoned: {state.abandonedCount}
          </p>
          <p className={state.avgHappiness < 50 ? 'text-game-red' : state.avgHappiness < 70 ? 'text-game-gold' : 'text-game-green'}>
            😊 Avg happiness: {state.avgHappiness}%
          </p>
          <p className={state.avgPollution > 60 ? 'text-game-red' : state.avgPollution > 30 ? 'text-game-gold' : 'text-game-green'}>
            ☁️ Avg pollution: {state.avgPollution}%
          </p>
          <p className={crises.length > 0 ? 'text-game-red' : 'text-game-green'}>
            🔥 Crises: {crises.length > 0 ? crises.join(', ') : 'None'}
          </p>
        </div>
      )}

      {/* Debug Panel */}
      <button
        onClick={() => setDebugOpen(!debugOpen)}
        className="pixel-border bg-muted p-1 cursor-pointer text-muted-foreground"
        style={{ fontSize: '6px' }}
      >
        {debugOpen ? '▼ DEBUG' : '▶ DEBUG'}
      </button>
      {debugOpen && currentMission && (
        <div className="pixel-border bg-muted/50 p-1 space-y-0.5" style={{ fontSize: '5px' }}>
          <p className="text-game-teal">Cycle: {state.cycles}</p>
          <p>Mission: {currentMission.id} — {currentMission.title}</p>
          <p>Happiness: {state.avgHappiness}% | Pollution: {state.avgPollution}%</p>
          <p>Income/cycle: ${state.lastCycleIncome} | Total: ${state.totalIncomeEarned}</p>
          <p>Crisis: protest={state.crisis.protestCycles} env={state.crisis.environmentalCrisis ? 'Y' : 'N'} econ={state.crisis.economicCollapse ? 'Y' : 'N'}</p>
          {currentMission.objectives.map((obj, i) => {
            const key = `${currentMission.id}_${i}`;
            const progress = getObjectiveProgress(obj, state);
            let status = '❌';
            let info = progress.label;

            if (obj.type === 'sustain_cycles') {
              const sc = state.sustainCounters[key] || 0;
              status = sc >= (obj.cycles || 0) ? '✅' : '❌';
              info = `${obj.target}: ${sc}/${obj.cycles} cycles`;
            } else {
              status = progress.current >= progress.target ? '✅' : '❌';
            }

            return (
              <p key={i} className={status === '✅' ? 'text-game-green' : 'text-game-red'}>
                {status} {obj.type}({info})
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
