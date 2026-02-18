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

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (username.trim().length < 2) return setError('Username must be at least 2 characters');

    setError('');
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        username: username.trim(),
        total_xp: 0,
        highest_level: 1,
        games_played: 0,
      });

      if (profileError) {
        setError(profileError.message);
      } else {
        navigate('/game');
      }
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
        <h1
          style={{
            fontSize: '14px',
            color: 'hsl(var(--game-gold))',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          CREATE ACCOUNT
        </h1>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {[
            { label: 'USERNAME', value: username, set: setUsername, type: 'text' },
            { label: 'EMAIL', value: email, set: setEmail, type: 'email' },
            { label: 'PASSWORD', value: password, set: setPassword, type: 'password' },
            { label: 'CONFIRM PASSWORD', value: confirmPassword, set: setConfirmPassword, type: 'password' },
          ].map(({ label, value, set, type }) => (
            <div key={label}>
              <label style={{ fontSize: '8px', color: 'hsl(var(--game-teal))', display: 'block', marginBottom: '8px' }}>
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          ))}

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
            {loading ? 'CREATING...' : 'SIGN UP'}
          </button>
        </form>

        <p style={{ fontSize: '8px', textAlign: 'center', marginTop: '24px', color: 'hsl(var(--muted-foreground))' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'hsl(var(--game-gold))', textDecoration: 'underline' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
