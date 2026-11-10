import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setStatus({ type: '', msg: '' });
    setLoading(true);

    try {
      const res = await login(id, password);

      if (res && res.success) {
        setStatus({ type: 'success', msg: 'Acceso correcto. Entrando al sistema...' });
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } else {
        setStatus({ 
          type: 'error', 
          msg: res?.message || 'ID de usuario o contraseña incorrectos.' 
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error atrapado:', err);
      setStatus({ 
        type: 'error', 
        msg: err?.response?.data?.message || err?.message || 'Error al conectar con el servidor.' 
      });
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    
    try {
      await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: recoveryEmail }),
      });
      setRecoverySent(true);
    } catch (err) {
      console.error(err);
      setRecoverySent(true);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="classic-login-wrapper">
      <div className="login-card">
        
        {/* ENCABEZADO CON LOGOTIPO WINFORED Y SIGRA */}
        <div className="brand-header">
          <div className="logo-title-container">
            <img src="/logo.png" alt="Winfored Logo" className="brand-logo" />
            <div className="brand-divider"></div>
            <h1 className="brand-title">SIGRA</h1>
          </div>
          <p>Sistema Integral de Geolocalización de Red de Acceso</p>
        </div>

        {status.msg && (
          <div className={`status-badge ${status.type}`}>
            {status.type === 'success' ? '✓ ' : '✕ '}
            {status.msg}
          </div>
        )}

        {!isRecovering ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="userId">ID de Usuario</label>
              <div className="input-field">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  id="userId"
                  placeholder="Ej. 1"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-field">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="forgot-password-container">
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => setIsRecovering(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'VERIFICANDO...' : 'ACCEDER AL SISTEMA'}
            </button>
          </form>
        ) : (
          <div>
            {!recoverySent ? (
              <form onSubmit={handleRecoverySubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="recoveryEmail">Correo Electrónico</label>
                  <div className="input-field input-no-icon">
                    <input
                        type="email"
                        id="recoveryEmail"
                        placeholder="correo@sigra.com"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        required
                        disabled={recoveryLoading}
                     />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={recoveryLoading}>
                  {recoveryLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                </button>

                <button 
                  type="button" 
                  className="forgot-password-link" 
                  style={{ textAlign: 'center', width: '100%', marginTop: '12px' }}
                  onClick={() => setIsRecovering(false)}
                >
                  ← Volver al login
                </button>
              </form>
            ) : (
              <div className="recovery-box">
                <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>¡Correo enviado con éxito!</p>
                <p>Revisa tu bandeja para continuar con la recuperación.</p>
                <button 
                  type="button" 
                  className="submit-btn" 
                  style={{ marginTop: '14px' }}
                  onClick={() => { setIsRecovering(false); setRecoverySent(false); }}
                >
                  Regresar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;