import React, { useState, useRef, useEffect } from 'react';
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
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [cargando, setCargando] = useState(false);
  const [verificandoEnlace, setVerificandoEnlace] = useState(true);
  const [enlaceExpirado, setEnlaceExpirado] = useState(false);

  const timerRef = useRef(null);
  const expiracionTimerRef = useRef(null);

  const tieneMayuscula = /[A-Z]/.test(nuevaPassword);
  const tieneMinuscula = /[a-z]/.test(nuevaPassword);
  const tieneEspecial = /[@$!%*?&#._#-]/.test(nuevaPassword);
  const tieneLargoMinimo = nuevaPassword.length >= 8;

  const mostrarEstadoSuperior = (type, msg, autoHideMs = 5000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ type, msg });

    if (type === 'error' && autoHideMs > 0) {
      timerRef.current = setTimeout(() => {
        setStatus({ type: '', msg: '' });
      }, autoHideMs);
    }
  };

  const limpiarEstadoAlEscribir = () => {
    if (status.msg) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus({ type: '', msg: '' });
    }
  };

  useEffect(() => {
    let activo = true;

    const validarEnlaceEnServidor = async () => {
      if (!token) {
        if (activo) {
          setEnlaceExpirado(true);
          setVerificandoEnlace(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `https://sigra-zero.onrender.com/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`
        );
        const data = await res.json().catch(() => ({}));

        if (!activo) return;

        if (!res.ok || !data.valido) {
          setEnlaceExpirado(true);
        } else {
          setEnlaceExpirado(false);
          if (typeof data.restanteMs === 'number' && data.restanteMs > 0) {
            expiracionTimerRef.current = setTimeout(() => {
              setEnlaceExpirado(true);
              setStatus({ type: '', msg: '' });
            }, data.restanteMs);
          }
        }
      } catch (err) {
        if (activo) {
          mostrarEstadoSuperior('error', 'No se pudo verificar el enlace. Intenta recargar la página.', 6000);
        }
      } finally {
        if (activo) setVerificandoEnlace(false);
      }
    };

    validarEnlaceEnServidor();

    return () => {
      activo = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (expiracionTimerRef.current) clearTimeout(expiracionTimerRef.current);
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });

    if (!nuevaPassword || !confirmarPassword) {
      mostrarEstadoSuperior('error', 'Por favor completa todos los campos.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      mostrarEstadoSuperior('error', 'Las contraseñas no coinciden.');
      return;
    }

    if (!tieneLargoMinimo) {
      mostrarEstadoSuperior('error', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!tieneMayuscula || !tieneMinuscula) {
      mostrarEstadoSuperior('error', 'La contraseña debe incluir al menos una letra mayúscula y una minúscula.');
      return;
    }

    if (!tieneEspecial) {
      mostrarEstadoSuperior('error', 'La contraseña debe contener al menos un carácter especial (@, $, !, %, *, ?, &, #, ., _).');
      return;
    }

    if (!token) {
      setEnlaceExpirado(true);
      return;
    }

    try {
      setCargando(true);
      mostrarEstadoSuperior('info', 'Actualizando credenciales...', 0);

      const response = await fetch('https://sigra-zero.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msgError = String(data.error || data.message || '');
        const esErrorDeExpiracion =
          response.status === 401 ||
          response.status === 410 ||
          /expir|caduc|vencid|inv[aá]lid|usado|token/i.test(msgError);

        if (esErrorDeExpiracion) {
          setEnlaceExpirado(true);
          setStatus({ type: '', msg: '' });
          return;
        }

        throw new Error(msgError || 'Ocurrió un error al restablecer la contraseña.');
      }

      if (data.token && data.usuario) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
      }

      mostrarEstadoSuperior('success', '¡Contraseña actualizada con éxito! Ingresando a tu panel...', 0);

      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1800);

    } catch (err) {
      mostrarEstadoSuperior('error', err.message, 5000);
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

        {verificandoEnlace ? (
          <div style={{ textAlign: 'center', padding: '18px 0', color: '#64748b', fontSize: '0.85rem' }}>
            Verificando vigencia del enlace...
          </div>
        ) : enlaceExpirado ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '18px 16px',
                marginBottom: '16px',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: '#991b1b',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                }}
              >
                El tiempo del enlace ha expirado
              </p>
              <p
                style={{
                  margin: 0,
                  color: '#7f1d1d',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                }}
              >
                El límite de 15 minutos ha concluido o este enlace ya fue utilizado. Por favor, solicita un nuevo reenvío de recuperación de contraseña.
              </p>
            </div>

            <button
              type="button"
              className="submit-btn"
              onClick={() => navigate('/login', { replace: true, state: { vista: 'recuperar' } })}
            >
             SOLICITAR NUEVO ENLACE
          </button>
          </div>
        ) : (
          <>
            {status.msg && (
              <div className={`status-badge ${status.type}`}>
                {status.type === 'success' ? '✓ ' : status.type === 'error' ? '✕ ' : ''}
                {status.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="nuevaPassword">Nueva Contraseña</label>
                <div className="input-field">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="nuevaPassword"
                    placeholder="••••••••"
                    value={nuevaPassword}
                    onChange={(e) => {
                      setNuevaPassword(e.target.value);
                      limpiarEstadoAlEscribir();
                    }}
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

              <div className="form-group">
                <label htmlFor="confirmarPassword">Confirmar Nueva Contraseña</label>
                <div className="input-field">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmarPassword"
                    placeholder="••••••••"
                    value={confirmarPassword}
                    onChange={(e) => {
                      setConfirmarPassword(e.target.value);
                      limpiarEstadoAlEscribir();
                    }}
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

              <button type="submit" disabled={cargando} className="submit-btn">
                {cargando ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
              </button>
            </form>
          </>
        )}
      </div>

      <footer className="login-footer">
        © 2026 <strong>SIGRA - WinfoRed</strong>. Todos los derechos reservados. · Desarrollado por{" "}
        <strong>Carolina Garcia</strong>.
      </footer>
    </div>
  );
}