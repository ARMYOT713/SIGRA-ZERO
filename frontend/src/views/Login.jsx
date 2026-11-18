import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  const [vistaActiva, setVistaActiva] = useState('login'); // 'login' | 'recuperar' | 'setup_admin'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Estado para inicializar el primer Administrador cuando la BD está limpia (0 usuarios)
  const [requiereSetupInicial, setRequiereSetupInicial] = useState(false);
  const [adminForm, setAdminForm] = useState({
    id_usuario: '1',
    nombre_completo: '',
    correo: '',
    telefono: '',
    password: ''
  });
  const [creandoAdmin, setCreandoAdmin] = useState(false);

  const timerRef = useRef(null);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  // Función que muestra el estado arriba del formulario y borra los errores a los 5 segundos
  const mostrarEstadoSuperior = (type, msg, autoHideMs = 5000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ type, msg });

    if (type === 'error' && autoHideMs > 0) {
      timerRef.current = setTimeout(() => {
        setStatus({ type: '', msg: '' });
      }, autoHideMs);
    }
  };

  // Limpia el aviso en cuanto el usuario vuelve a escribir en cualquier input
  const limpiarEstadoAlEscribir = () => {
    if (status.msg) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus({ type: '', msg: '' });
    }
  };

  useEffect(() => {
    // Candado de seguridad: si el usuario regresa a /login con las flechas del navegador,
    // se destruye cualquier sesión activa para impedir que regrese con la flecha "Adelante"
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (typeof logout === 'function') {
      try { logout(); } catch (e) {}
    }

    const verificarEstadoInicial = async () => {
      try {
        const res = await fetch('https://sigra-zero.onrender.com/api/auth/setup-status');
        if (res.ok) {
          const data = await res.json();
          setRequiereSetupInicial(Boolean(data.requiereSetup));
        }
      } catch (err) {
        // Silencioso si el servidor está despertando
      }
    };
    verificarEstadoInicial();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setLoading(true);
    mostrarEstadoSuperior('info', 'Verificando credenciales...', 0);

    try {
      const res = await login(id.trim(), password);

      if (res && res.success) {
        mostrarEstadoSuperior('success', 'Acceso correcto. Entrando al sistema...', 0);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1200);
      } else {
        mostrarEstadoSuperior(
          'error',
          res?.message || 'ID de usuario, correo o contraseña incorrectos.',
          5000
        );
        setLoading(false);
      }
    } catch (err) {
      console.error('Error atrapado:', err);
      mostrarEstadoSuperior(
        'error',
        err?.response?.data?.message || err?.message || 'ID de usuario, correo o contraseña incorrectos.',
        5000
      );
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const response = await fetch('https://sigra-zero.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: recoveryEmail.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo enviar el correo de recuperación.');
      }

      setRecoverySent(true);
    } catch (err) {
      console.error('Error en recuperación:', err);
      mostrarEstadoSuperior(
        'error',
        err.message || 'Error al intentar enviar el correo.',
        5000
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSetupAdminSubmit = async (e) => {
    e.preventDefault();
    setCreandoAdmin(true);
    setStatus({ type: '', msg: '' });

    try {
      const response = await fetch('https://sigra-zero.onrender.com/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: Number(adminForm.id_usuario) || 1,
          nombre_completo: adminForm.nombre_completo.trim(),
          correo: adminForm.correo.trim(),
          telefono: adminForm.telefono.trim(),
          password: adminForm.password
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo registrar el Administrador inicial.');
      }

      setRequiereSetupInicial(false);
      setId(String(adminForm.id_usuario || '1'));
      setVistaActiva('login');
      mostrarEstadoSuperior('success', 'Administrador principal registrado con éxito.', 4000);
    } catch (err) {
      mostrarEstadoSuperior('error', err.message, 5000);
    } finally {
      setCreandoAdmin(false);
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

        {/* AVISO INTEGRADO EN LA PARTE SUPERIOR DE LA TARJETA */}
        {status.msg && (
          <div className={`status-badge ${status.type}`}>
            {status.type === 'success' ? '✓ ' : status.type === 'error' ? '✕ ' : ''}
            {status.msg}
          </div>
        )}

        {/* VISTA 1: LOGIN NORMAL */}
        {vistaActiva === 'login' && (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="userId">ID de Usuario o Correo Electrónico</label>
                <div className="input-field">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    id="userId"
                    placeholder="Ej. 1 o correo@gmail.com"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      limpiarEstadoAlEscribir();
                    }}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      limpiarEstadoAlEscribir();
                    }}
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
                  onClick={() => {
                    setVistaActiva('recuperar');
                    setRecoverySent(false);
                    limpiarEstadoAlEscribir();
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                className={`submit-btn ${loading || status.type === 'success' ? 'submit-btn-green' : ''}`}
                disabled={loading}
              >
                {status.type === 'success'
                  ? '✓ CREDENCIALES CORRECTAS'
                  : loading
                  ? 'VERIFICANDO...'
                  : 'ACCEDER AL SISTEMA'}
              </button>
            </form>

            {requiereSetupInicial && (
              <div className="bootstrap-banner">
                <p>El sistema aún no cuenta con ningún usuario registrado.</p>
                <button
                  type="button"
                  className="submit-btn submit-btn-green"
                  onClick={() => {
                    setVistaActiva('setup_admin');
                    limpiarEstadoAlEscribir();
                  }}
                >
                  + Registrar Administrador Principal
                </button>
              </div>
            )}
          </>
        )}

        {/* VISTA 2: RECUPERACIÓN DE CONTRASEÑA */}
        {vistaActiva === 'recuperar' && (
          <div>
            {!recoverySent ? (
              <form onSubmit={handleRecoverySubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="recoveryEmail">Correo Electrónico</label>
                  <div className="input-field input-no-icon">
                    <input
                      type="email"
                      id="recoveryEmail"
                      placeholder="correo@gmail.com"
                      value={recoveryEmail}
                      onChange={(e) => {
                        setRecoveryEmail(e.target.value);
                        limpiarEstadoAlEscribir();
                      }}
                      required
                      disabled={recoveryLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`submit-btn ${recoveryLoading ? 'submit-btn-green' : ''}`}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                </button>

                <button 
                  type="button" 
                  className="forgot-password-link" 
                  style={{ textAlign: 'center', width: '100%', marginTop: '8px' }}
                  onClick={() => {
                    setVistaActiva('login');
                    limpiarEstadoAlEscribir();
                  }}
                >
                  ← Volver al login
                </button>
              </form>
            ) : (
              <div className="recovery-box">
                <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>¡Correo enviado con éxito!</p>
                <p style={{ margin: 0 }}>Revisa tu bandeja para continuar con la recuperación.</p>
                <button 
                  type="button" 
                  className="submit-btn submit-btn-green" 
                  style={{ marginTop: '14px' }}
                  onClick={() => {
                    setVistaActiva('login');
                    setRecoverySent(false);
                    limpiarEstadoAlEscribir();
                  }}
                >
                  Regresar
                </button>
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: INICIALIZACIÓN DEL PRIMER ADMINISTRADOR (SOLO SI HAY 0 USUARIOS EN BD) */}
        {vistaActiva === 'setup_admin' && (
          <form onSubmit={handleSetupAdminSubmit} className="login-form">
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>ID Admin</label>
                <div className="input-field input-no-icon">
                  <input
                    type="text"
                    value={adminForm.id_usuario}
                    onChange={(e) => {
                      setAdminForm({ ...adminForm, id_usuario: e.target.value.replace(/\D/g, '') });
                      limpiarEstadoAlEscribir();
                    }}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Nombre Completo</label>
                <div className="input-field input-no-icon">
                  <input
                    type="text"
                    placeholder="Nombre del Administrador"
                    value={adminForm.nombre_completo}
                    onChange={(e) => {
                      setAdminForm({ ...adminForm, nombre_completo: e.target.value });
                      limpiarEstadoAlEscribir();
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <div className="input-field input-no-icon">
                <input
                  type="email"
                  placeholder="admin@winfored.com"
                  value={adminForm.correo}
                  onChange={(e) => {
                    setAdminForm({ ...adminForm, correo: e.target.value });
                    limpiarEstadoAlEscribir();
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <div className="input-field input-no-icon">
                <input
                  type="text"
                  placeholder="7120000000"
                  value={adminForm.telefono}
                  onChange={(e) => {
                    setAdminForm({ ...adminForm, telefono: e.target.value });
                    limpiarEstadoAlEscribir();
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <div className="input-field input-no-icon">
                <input
                  type="password"
                  placeholder="Contraseña de acceso"
                  value={adminForm.password}
                  onChange={(e) => {
                    setAdminForm({ ...adminForm, password: e.target.value });
                    limpiarEstadoAlEscribir();
                  }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn submit-btn-green" disabled={creandoAdmin}>
              {creandoAdmin ? 'REGISTRANDO...' : 'CREAR ADMINISTRADOR PRINCIPAL'}
            </button>

            <button
              type="button"
              className="forgot-password-link"
              style={{ textAlign: 'center', width: '100%' }}
              onClick={() => {
                setVistaActiva('login');
                limpiarEstadoAlEscribir();
              }}
            >
              ← Cancelar
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;