import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'hsl(var(--background))',
  border: '2px solid hsl(var(--game-panel-border))',
  color: 'hsl(var(--foreground))',
  fontFamily: "'Press Start 2P', cursive",
  fontSize: '10px',
  outline: 'none',
  boxSizing: 'border-box',
};

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      navigate('/game');
    }
    setLoading(false);
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-background"
      style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
      <div
        className="pixel-border"
        style={{
          background: 'hsl(var(--card))',
          padding: '40px 32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '6px 6px 0 #000',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '16px',
            color: 'hsl(var(--game-gold))',
            textAlign: 'center',
            marginBottom: '32px',
            letterSpacing: '0.05em',
          }}
        >
          🌍 SUSTAIN CITY
        </h1>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '8px', color: 'hsl(var(--game-teal))', display: 'block', marginBottom: '8px' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '8px', color: 'hsl(var(--game-teal))', display: 'block', marginBottom: '8px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: '8px', color: 'hsl(var(--game-red))', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pixel-hover"
            style={{
              padding: '14px',
              background: loading ? 'hsl(var(--muted))' : 'hsl(var(--game-teal))',
              color: '#000',
              border: '2px solid #000',
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '3px 3px 0 #000',
            }}
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>

        <p style={{ fontSize: '8px', textAlign: 'center', marginTop: '24px', color: 'hsl(var(--muted-foreground))' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            style={{ color: 'hsl(var(--game-gold))', textDecoration: 'underline' }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
