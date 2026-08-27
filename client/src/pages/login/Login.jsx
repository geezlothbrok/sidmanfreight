import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setSession } from '../../utils/auth';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? '/backend/manager_api.php' : 'https://api.sidmanfreightconsult.com/manager_api.php');

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const sanitizedEmail = email.trim().toLowerCase();

    setLoading(true);

    // One round-trip: the backend verifies email+password against the fixed
    // manager/finance accounts or an active employees row, and on success sets
    // an HttpOnly session cookie and returns the caller's identity (email/role/
    // exp). credentials:'include' is what lets the browser store that cookie.
    // The backend also writes the login audit entry. A wrong password and an
    // unauthorized/removed account both come back as a generic 401 — we surface
    // one message for both rather than leaking which it was.
    try {
      const fd = new FormData();
      fd.append('email', sanitizedEmail);
      fd.append('password', password);

      const res = await fetch(`${API_URL}?action=login`, { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        // Only 400/401 mean the submitted credentials were actually rejected.
        // Anything else (502/504 = portal unreachable, 500 = server error) is
        // our problem, not the user's — never blame their password for it.
        if (res.status === 400 || res.status === 401) {
          setError(data?.error || 'Invalid email or password. Please check your credentials and try again.');
        } else {
          setError(`The portal is not responding right now (error ${res.status}). Please try again in a moment.`);
        }
        return;
      }

      setSession({ email: data.email, role: data.role, exp: data.exp });

      // SMART ROUTING: send each role to its own portal.
      if (data.role === 'Manager') {
        navigate('/manager-dashboard'); // Send the boss to the executive suite
      } else if (data.role === 'Finance') {
        navigate('/finance');           // Send finance directly to corporate finance accounting
      } else {
        navigate('/dashboard');         // Send the secretary/agents to the standard logging terminal
      }
    } catch (err) {
      // Couldn't reach the portal at all — a connection problem, not bad
      // credentials.
      console.error(err);
      setError('Could not reach the portal. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Without Firebase there's no self-service reset email. Portal passwords are
  // managed by the manager (Employees screen → edit → set a new password), so
  // point users there instead of silently doing nothing.
  const handleForgotPassword = () => {
    setError('');
    setMessage('Passwords are managed by your manager. Please contact them to have your portal password reset.');
  };

  return (
    <div className="portal-login-wrapper">
      <div className="portal-login-card">
        
        {/* Back to Main Website Navigation Anchor */}
        <div className="portal-back-home-container">
          <Link to="/" className="portal-back-home-link">
            ← Back to Homepage
          </Link>
        </div>

        <h2>Login</h2>

        {error && <div className="portal-error-message">{error}</div>}
        {message && (
          <div style={{ 
            color: '#B87333', 
            backgroundColor: '#f5e9dc', 
            padding: '0.75rem 1rem', 
            borderRadius: '4px', 
            marginBottom: '1.5rem', 
            fontSize: '0.9rem', 
            textAlign: 'left', 
            borderLeft: '4px solid #B87333' 
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="portal-form">
          <div className="portal-input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              required
              disabled={loading}
            />
          </div>

          <div className="portal-input-group">
            <label>Password</label>
            <div className="portal-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="portal-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
            <button 
              type="button" 
              onClick={handleForgotPassword}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#0A2A52', 
                cursor: 'pointer', 
                fontSize: '0.85rem', 
                fontWeight: '600', 
                padding: 0 
              }}
            >
              Forgot/Change Password?
            </button>
          </div>

          <button type="submit" className="portal-login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;