import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from '@/types/game';

interface TutorialState {
  shownTips: string[];
  currentTip: string | null;
  dismissed: boolean;
}

const TIP_MESSAGES: Record<string, string> = {
  welcome: `Welcome to Sustain City! I'm Mayor Maya, your guide. Let's build a sustainable city together! Start by placing some roads. 🛣️`,
  first_road: `Great! Roads connect everything. Now build 3 houses near your road. Click the 🏠 House button below!`,
  need_road: `⚠️ Oops! Buildings need road access. Place your house next to a road tile.`,
  first_house: `Perfect! But your house needs water and power to be active. Build utilities next!`,
  inactive_building: `⚠️ See the red border? That means this building is missing requirements. Hover to see what it needs!`,
  first_factory: `Nice! Factories boost income but create pollution. Watch how nearby houses get unhappy! 😟`,
  low_happiness: `⚠️ Your citizens are unhappy! Try building parks 🌳 to boost nearby happiness.`,
  high_pollution: `☁️ Pollution is rising! Build solar plants ☀️ or recycling centers ♻️ to clean up your city.`,
  mission_almost: `🎯 Almost there! Complete this last objective to earn rewards and unlock new buildings!`,
  first_mission_complete: `🎉 Mission complete! You earned XP and money! Keep completing missions to level up!`,
  no_money: `💸 You're out of money! Wait for income from your city each cycle, or demolish buildings for 50% refund.`,
  factory_placement_warning: `⚠️ Warning! That factory will make nearby residents very unhappy. Consider placing it further away or add parks nearby!`,
  level_up: `⬆️ Level up! New buildings unlocked! Check the toolbar for new options!`,
  locked_building: `🔒 This building is locked! Complete more missions to unlock it.`,
  crisis_protest: `🚨 CRISIS! Citizens are protesting! Build parks, reduce pollution, or demolish factories to restore happiness!`,
  crisis_pollution: `☠️ ENVIRONMENTAL CRISIS! Your city is drowning in smog! Build recycling centers and solar power NOW!`,
  tooltip_reminder: `💡 Pro tip: Hover over any building to see exactly how it affects your city!`,
};

interface MayaGuideProps {
  gameState: GameState;
  missionCompleteCount: number;
  levelUpFlag: boolean;
}

export function MayaGuide({ gameState, missionCompleteCount, levelUpFlag }: MayaGuideProps) {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    shownTips: [],
    currentTip: null,
    dismissed: false,
  });
  const [displayedText, setDisplayedText] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLevelUpRef = useRef(false);
  const prevMissionCountRef = useRef(0);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTip = useCallback((tipId: string) => {
    setTutorialState(prev => {
      if (prev.dismissed || prev.shownTips.includes(tipId)) return prev;
      return { ...prev, shownTips: [...prev.shownTips, tipId], currentTip: tipId };
    });
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!tutorialState.currentTip || tutorialState.dismissed) return;
    const msg = TIP_MESSAGES[tutorialState.currentTip] || '';
    if (!msg) return;

    setDisplayedText('');
    setShowBubble(true);

    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    let i = 0;
    typewriterRef.current = setInterval(() => {
      i++;
      setDisplayedText(msg.slice(0, i));
      if (i >= msg.length) {
        clearInterval(typewriterRef.current!);
        dismissTimerRef.current = setTimeout(() => {
          setShowBubble(false);
          setTutorialState(prev => ({ ...prev, currentTip: null }));
        }, 8000);
      }
    }, 35);

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [tutorialState.currentTip, tutorialState.dismissed]);

  // Welcome tip on mount
  useEffect(() => {
    const t = setTimeout(() => showTip('welcome'), 1500);
    return () => clearTimeout(t);
  }, [showTip]);

  // 3-minute random tip
  useEffect(() => {
    tooltipTimerRef.current = setTimeout(() => showTip('tooltip_reminder'), 3 * 60 * 1000);
    return () => { if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current); };
  }, [showTip]);

  // Level up tip
  useEffect(() => {
    if (levelUpFlag && !prevLevelUpRef.current) {
      showTip('level_up');
    }
    prevLevelUpRef.current = levelUpFlag;
  }, [levelUpFlag, showTip]);

  // First mission complete tip
  useEffect(() => {
    if (missionCompleteCount > 0 && missionCompleteCount > prevMissionCountRef.current) {
      if (missionCompleteCount === 1) showTip('first_mission_complete');
    }
    prevMissionCountRef.current = missionCompleteCount;
  }, [missionCompleteCount, showTip]);

  // Game-state driven tips
  useEffect(() => {
    const flat = gameState.grid.flat();
    const hasRoad = flat.some(t => t.type === 'road');
    const hasHouse = flat.some(t => t.type === 'residential');
    const hasFactory = flat.some(t => t.type === 'factory');
    const hasInactive = flat.some(t => t.type !== 'empty' && t.type !== 'road' && !t.active);

    if (hasRoad) showTip('first_road');
    if (hasHouse && !hasInactive) showTip('first_house');
    if (hasInactive) showTip('inactive_building');
    if (hasFactory) showTip('first_factory');
    if (gameState.crisis.economicCollapse) showTip('no_money');
    if (gameState.crisis.protestCycles >= 1) showTip('crisis_protest');
    if (gameState.crisis.environmentalCrisis) showTip('crisis_pollution');
    if (gameState.avgHappiness < 60 && gameState.avgHappiness > 0 && gameState.cycles > 0) showTip('low_happiness');
    if (gameState.avgPollution > 50 && gameState.cycles > 0) showTip('high_pollution');
  }, [gameState.grid, gameState.crisis, gameState.avgHappiness, gameState.avgPollution, gameState.cycles, showTip]);

  const handleOk = () => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setShowBubble(false);
    setTutorialState(prev => ({ ...prev, currentTip: null }));
  };

  const handleDismissAll = () => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setShowBubble(false);
    setTutorialState(prev => ({ ...prev, dismissed: true, currentTip: null }));
  };

  const handleReEnable = () => {
    setTutorialState(prev => ({ ...prev, dismissed: false }));
  };

  const isPulsing = tutorialState.currentTip && !tutorialState.dismissed;

  if (tutorialState.dismissed) {
    return (
      <button
        onClick={handleReEnable}
        className="fixed z-[1000] pixel-border pixel-hover cursor-pointer"
        style={{
          top: '90px',
          right: '12px',
          fontFamily: "'Press Start 2P', cursive",
          fontSize: '8px',
          padding: '6px 8px',
          background: 'hsl(var(--card))',
          color: 'hsl(var(--game-teal))',
          border: '2px solid hsl(var(--game-panel-border))',
        }}
        title="Re-enable Mayor Maya tips"
      >
        💡 Tips
      </button>
    );
  }

  return (
    <div
      className="fixed z-[1000]"
      style={{ bottom: '96px', right: '16px' }}
    >
      {/* Speech Bubble */}
      {showBubble && (
        <div
          className="absolute pixel-border"
          style={{
            bottom: '92px',
            right: '0',
            width: '300px',
            background: 'hsl(var(--card))',
            border: '2px solid hsl(var(--foreground))',
            padding: '12px',
            boxShadow: '4px 4px 0px #000',
          }}
        >
          <p
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '8px',
              lineHeight: '1.8',
              color: 'hsl(var(--foreground))',
              margin: 0,
              minHeight: '40px',
            }}
          >
            {displayedText}
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                background: 'hsl(var(--foreground))',
                height: '10px',
                marginLeft: '2px',
                verticalAlign: 'middle',
                animation: 'cursor-blink 0.7s steps(1) infinite',
              }}
            />
          </p>

          <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
            <button
              onClick={handleOk}
              className="pixel-hover"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '7px',
                padding: '5px 8px',
                background: 'hsl(var(--game-teal))',
                color: 'hsl(var(--accent-foreground))',
                border: '2px solid #000',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              OK
            </button>
            <button
              onClick={handleDismissAll}
              className="pixel-hover"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '6px',
                padding: '5px 6px',
                background: 'hsl(var(--game-red))',
                color: '#fff',
                border: '2px solid #000',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              No tips
            </button>
          </div>

          {/* Triangle pointer */}
          <div
            style={{
              position: 'absolute',
              bottom: '-10px',
              right: '32px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '10px solid hsl(var(--foreground))',
            }}
          />
        </div>
      )}

      {/* Maya Portrait */}
      <div
        style={{
          width: '80px',
          height: '80px',
          background: 'hsl(var(--game-teal) / 0.2)',
          border: '2px solid hsl(var(--game-teal))',
          boxShadow: isPulsing
            ? '4px 4px 0 #000, 0 0 12px hsl(var(--game-teal) / 0.7)'
            : '4px 4px 0 #000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          cursor: 'default',
          transition: 'box-shadow 0.3s',
          animation: isPulsing ? 'maya-pulse 1.5s ease-in-out infinite' : 'none',
        }}
        title="Mayor Maya — your city guide"
      >
        👩‍💼
      </div>

      <p
        style={{
          fontFamily: "'Press Start 2P', cursive",
          fontSize: '5px',
          color: 'hsl(var(--game-teal))',
          textAlign: 'center',
          marginTop: '4px',
          letterSpacing: '0.05em',
        }}
      >
        Mayor Maya
      </p>
    </div>
  );
}
