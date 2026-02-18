import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGameState } from '@/hooks/useGameState';
import { TopBar } from '@/components/game/TopBar';
import { GameGrid } from '@/components/game/GameGrid';
import { BuildingToolbar } from '@/components/game/BuildingToolbar';
import { MissionPanel } from '@/components/game/MissionPanel';
import { MayaGuide } from '@/components/game/MayaGuide';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const Index = () => {
  const {
    state, floatingTexts, missionCompleteId, levelUpFlag, cyclePulse,
    crisisBanner, currentMission, xpProgress,
    selectBuilding, toggleDemolish, placeBuilding,
  } = useGameState();

  const { user } = useAuth();
  const navigate = useNavigate();
  const stateRef = useRef(state);
  stateRef.current = state;

  // Auto-save every cycle (every 5s) when logged in
  useEffect(() => {
    if (!user) return;
    const saveInterval = setInterval(async () => {
      const s = stateRef.current;
      await supabase.from('game_saves').upsert({
        user_id: user.id,
        grid_state: s.grid,
        money: s.money,
        xp: s.xp,
        level: s.level,
        cycle: s.cycles,
        avg_happiness: s.avgHappiness,
        avg_pollution: s.avgPollution,
        total_income_earned: s.totalIncomeEarned,
        missions_progress: {
          currentMissionIndex: s.currentMissionIndex,
          completedMissions: s.completedMissions,
        },
        unlocked_buildings: s.unlockedBuildings,
        last_saved: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Also update user XP + level stats
      await supabase.from('users').update({
        total_xp: s.xp,
        highest_level: s.level,
      }).eq('id', user.id);
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden select-none">
      {/* Top Bar */}
      <TopBar state={state} xpProgress={xpProgress} cyclePulse={cyclePulse} />

      {/* Nav row: leaderboard + logout */}
      <div
        className="flex items-center justify-end gap-2 px-2 py-1"
        style={{ background: 'hsl(var(--card))', borderBottom: '2px solid hsl(var(--game-panel-border))' }}
      >
        {user && (
          <span style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '7px', color: 'hsl(var(--muted-foreground))' }}>
            {user.email}
          </span>
        )}
        <Link
          to="/leaderboard"
          className="pixel-hover"
          style={{
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '7px',
            padding: '5px 8px',
            background: 'hsl(var(--secondary))',
            color: 'hsl(var(--game-gold))',
            border: '2px solid hsl(var(--game-panel-border))',
            textDecoration: 'none',
            boxShadow: '2px 2px 0 #000',
          }}
        >
          🏆 LEADERBOARD
        </Link>
        <button
          onClick={handleLogout}
          className="pixel-hover"
          style={{
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '7px',
            padding: '5px 8px',
            background: 'hsl(var(--game-red) / 0.2)',
            color: 'hsl(var(--game-red))',
            border: '2px solid hsl(var(--game-red) / 0.5)',
            cursor: 'pointer',
            boxShadow: '2px 2px 0 #000',
          }}
        >
          LOGOUT
        </button>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mission Panel */}
        <div className="flex-shrink-0 p-2 overflow-y-auto">
          <MissionPanel
            state={state}
            currentMission={currentMission}
            missionCompleteId={missionCompleteId}
          />
        </div>

        {/* Grid Center */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-2 relative">
          <GameGrid
            grid={state.grid}
            selectedBuilding={state.selectedBuilding}
            demolishMode={state.demolishMode}
            onPlace={placeBuilding}
            floatingTexts={floatingTexts}
            cyclePulse={cyclePulse}
            environmentalCrisis={state.crisis.environmentalCrisis}
          />

          {/* Crisis Banner */}
          {crisisBanner && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 banner-slide pixel-border bg-card px-6 py-3" style={{ fontSize: '9px' }}>
              <span className="text-game-red">{crisisBanner}</span>
            </div>
          )}

          {/* Mission Complete Banner */}
          {missionCompleteId && !crisisBanner && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 banner-slide pixel-border bg-card px-6 py-3" style={{ fontSize: '10px' }}>
              <span className="text-game-gold">✅ MISSION COMPLETE! 🎉</span>
            </div>
          )}

          {/* Level Up Banner */}
          {levelUpFlag && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 level-up-anim pixel-border bg-card px-8 py-4" style={{ fontSize: '14px' }}>
              <span className="text-game-gold">⬆️ LEVEL UP! ⬆️</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Toolbar */}
      <BuildingToolbar
        selectedBuilding={state.selectedBuilding}
        demolishMode={state.demolishMode}
        unlockedBuildings={state.unlockedBuildings}
        money={state.money}
        level={state.level}
        crisis={state.crisis}
        onSelect={selectBuilding}
        onDemolish={toggleDemolish}
      />

      {/* Mayor Maya Tutorial Guide */}
      <MayaGuide
        gameState={state}
        missionCompleteCount={state.completedMissions.length}
        levelUpFlag={levelUpFlag}
      />
    </div>
  );
};

export default Index;
