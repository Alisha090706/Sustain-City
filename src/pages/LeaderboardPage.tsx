import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { DbUser } from '@/lib/supabase';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardPage() {
  const [leaders, setLeaders] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await supabase
        .from('users')
        .select('id, username, highest_level, total_xp, email, games_played, created_at')
        .order('highest_level', { ascending: false })
        .order('total_xp', { ascending: false })
        .limit(10);

      if (data) setLeaders(data as DbUser[]);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-background"
      style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
      <div
        className="pixel-border"
        style={{
          background: 'hsl(var(--card))',
          padding: '32px 28px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '6px 6px 0 #000',
        }}
      >
        <h1
          style={{
            fontSize: '14px',
            color: 'hsl(var(--game-gold))',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          🏆 LEADERBOARD
        </h1>

        {loading ? (
          <p style={{ fontSize: '10px', textAlign: 'center', color: 'hsl(var(--game-teal))' }}>
            LOADING...
          </p>
        ) : leaders.length === 0 ? (
          <p style={{ fontSize: '9px', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
            No players yet. Be the first!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaders.map((leader, index) => {
              const isMe = leader.id === user?.id;
              return (
                <div
                  key={leader.id}
                  className="pixel-border"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: isMe ? 'hsl(var(--game-teal) / 0.15)' : 'hsl(var(--secondary))',
                    border: isMe ? '2px solid hsl(var(--game-teal))' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px', minWidth: '24px' }}>
                      {MEDALS[index] ?? `#${index + 1}`}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        color: isMe ? 'hsl(var(--game-teal))' : 'hsl(var(--foreground))',
                      }}
                    >
                      {leader.username}
                      {isMe && ' (You)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '8px',
                        color: 'hsl(var(--game-gold))',
                        background: 'hsl(var(--background))',
                        padding: '3px 6px',
                        border: '1px solid hsl(var(--game-panel-border))',
                      }}
                    >
                      Lv {leader.highest_level}
                    </span>
                    <span style={{ fontSize: '8px', color: 'hsl(var(--muted-foreground))' }}>
                      {leader.total_xp} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <Link
            to="/game"
            className="pixel-hover"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              background: 'hsl(var(--secondary))',
              color: 'hsl(var(--foreground))',
              border: '2px solid hsl(var(--game-panel-border))',
              fontSize: '8px',
              textDecoration: 'none',
              boxShadow: '3px 3px 0 #000',
            }}
          >
            ← BACK TO GAME
          </Link>
        </div>
      </div>
    </div>
  );
}
