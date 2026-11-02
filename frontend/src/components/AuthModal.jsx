import React, { useState } from 'react';
import { X, Eye, EyeOff, Sparkles, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { login, register, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      if (mode === 'register') {
        if (!name.trim()) { setLocalError('Please enter your name'); return; }
        if (password.length < 8) { setLocalError('Password must be at least 8 characters'); return; }
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Something went wrong');
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setLocalError(null);
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className="auth-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-wrap">
            <Sparkles size={24} />
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to access your virtual wardrobe'
              : 'Join WardrobeWise to start styling'}
          </p>
        </div>

        {/* Error */}
        {displayError && (
          <div className="auth-error">
            <AlertCircle size={14} />
            <span>{displayError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-pass-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min 8 characters' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span>Please wait...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn size={16} />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="auth-switch">
          <span>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button onClick={switchMode} className="auth-switch-btn">
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Quick Demo Login */}
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="auth-demo-btn"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.25))',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontWeight: 600
            }}
            onClick={async () => {
              try {
                await login('user@wardrobewise.com', 'Password123!');
                onSuccess?.();
                onClose();
              } catch (err) {
                setLocalError(err.message || 'Demo login failed');
              }
            }}
          >
            <Sparkles size={14} />
            <span>Instant Demo Login (MongoDB Seeded Account)</span>
          </button>

          <button
            type="button"
            className="auth-demo-btn"
            onClick={() => {
              onClose();
            }}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
