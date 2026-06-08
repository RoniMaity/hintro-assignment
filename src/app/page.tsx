'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.push('/dashboard');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, name, password);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: 400, height: 500 }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 20,
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 48,
            marginBottom: 16,
          }}>
            📝
          </div>
          <h1 className="notion-title" style={{ fontSize: 24, marginBottom: 8 }}>
            Meeting Intelligence
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            AI-powered meeting analysis & action tracking
          </p>
        </div>

        {/* Auth Container */}
        <div style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px' }}>
          {/* Tab Switcher */}
          <div style={{
            display: 'flex', gap: 4, padding: 4, background: 'var(--bg-secondary)',
            borderRadius: 6, marginBottom: 24,
          }}>
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 4, border: 'none',
                cursor: 'pointer', fontWeight: 500, fontSize: 13, transition: 'all 0.1s',
                background: isLogin ? 'var(--bg-primary)' : 'transparent',
                color: isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isLogin ? 'rgba(15, 15, 15, 0.1) 0px 1px 2px' : 'none',
              }}
            >Sign In</button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 4, border: 'none',
                cursor: 'pointer', fontWeight: 500, fontSize: 13, transition: 'all 0.1s',
                background: !isLogin ? 'var(--bg-primary)' : 'transparent',
                color: !isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: !isLogin ? 'rgba(15, 15, 15, 0.1) 0px 1px 2px' : 'none',
              }}
            >Create Account</button>
          </div>

          {error && (
            <div style={{
              background: 'var(--color-red)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 4, padding: '8px 12px', marginBottom: 16,
              color: '#c42b1c', fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <div className="animate-fade-in">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  className="input-field"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 8, width: '100%' }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="40 60" />
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                isLogin ? 'Continue with Email' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Hintro Engineering Assignment · Meeting Intelligence Service
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
