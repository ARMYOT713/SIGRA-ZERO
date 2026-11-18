import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Login.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const tieneMayuscula = /[A-Z]/.test(nuevaPassword);
  const tieneMinuscula = /[a-z]/.test(nuevaPassword);
  const tieneEspecial = /[@$!%*?&#._#-]/.test(nuevaPassword);
  const tieneLargoMinimo = nuevaPassword.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nuevaPassword || !confirmarPassword) {
      mostrarToast('Por favor completa todos los campos.', 'error');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      mostrarToast('Las contraseñas no coinciden.', 'error');
      return;
    }

    if (!tieneLargoMinimo || !tieneMayuscula || !tieneMinuscula || !tieneEspecial) {
      mostrarToast('Cumple con todos los requisitos de seguridad de la contraseña.', 'error');
      return;
    }

    if (!token) {
      mostrarToast('Token de recuperación no válido o ausente en el enlace.', 'error');
      return;
    }

    try {
      setCargando(true);
      const response = await fetch('https://sigra-zero.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ocurrió un error al restablecer la contraseña.');
      }

      if (data.token && data.usuario) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
      }

      mostrarToast('Contraseña actualizada con éxito.');
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="classic-login-wrapper">
      <div className="login-card">
        <div className="brand-header">
          <div className="logo-title-container">
            <img src="/logo.png" alt="Winfored Logo" className="brand-logo" />
            <div className="brand-divider"></div>
            <h1 className="brand-title">SIGRA</h1>
          </div>
          <p>Restablecimiento de Credenciales de Acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="nuevaPassword">Nueva Contraseña:</label>
            <div className="input-field">
              <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="nuevaPassword"
                placeholder="••••••••"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                required
                disabled={cargando}
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="18" height="18" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmarPassword">Confirmar Nueva Contraseña:</label>
            <div className="input-field">
              <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmarPassword"
                placeholder="••••••••"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                required
                disabled={cargando}
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="password-requirements">
            <p className={tieneLargoMinimo ? 'valid' : 'invalid'}>
              {tieneLargoMinimo ? '✓' : '○'} Mínimo 8 caracteres
            </p>
            <p className={tieneMayuscula && tieneMinuscula ? 'valid' : 'invalid'}>
              {tieneMayuscula && tieneMinuscula ? '✓' : '○'} Mayúscula y minúscula
            </p>
            <p className={tieneEspecial ? 'valid' : 'invalid'}>
              {tieneEspecial ? '✓' : '○'} Carácter especial (@, $, !, %, *, #, etc.)
            </p>
          </div>

          <button type="submit" disabled={cargando} className="submit-btn submit-btn-green">
            {cargando ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
          </button>

          <button
            type="button"
            className="forgot-password-link"
            style={{ textAlign: 'center', width: '100%', marginTop: '6px' }}
            onClick={() => navigate('/login')}
          >
            ← Volver al inicio de sesión
          </button>
        </form>
      </div>

      {/* TOAST FLOTANTE ESTANDARIZADO */}
      {notificacion.visible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: notificacion.tipo === 'error' ? '#dc2626' : '#16a34a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{notificacion.mensaje}</span>
        </div>
      )}
    </div>
  );
}