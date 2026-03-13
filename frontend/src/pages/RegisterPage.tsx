import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      login(token, user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: '1.5rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)', padding: '2.5rem 2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Create account</h1>
          <p style={{ margin: '0.375rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Start tracking your life with AllTrack
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input
              className="form-input"
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Jane Doe"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input
              className="form-input"
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#DC2626', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
