import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados de recuperación de contraseña
  const [vistaActiva, setVistaActiva] = useState('login'); // 'login' | 'recuperar' | 'setup_admin'
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);

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

  // Toast estandarizado en esquina inferior derecha
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  const { login } = useAuth();
  const navigate = useNavigate();

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Verificar al cargar si el sistema no tiene ningún usuario registrado
  useEffect(() => {
    const verificarEstadoInicial = async () => {
      try {
        const res = await fetch('https://sigra-zero.onrender.com/api/auth/setup-status');
        if (res.ok) {
          const data = await res.json();
          setRequiereSetupInicial(Boolean(data.requiereSetup));
        }
      } catch (err) {
        // Silencioso si el endpoint aún no se ha desplegado
      }
    };
    verificarEstadoInicial();
  }, []);

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setLoading(true);

    try {
      const res = await login(id.trim(), password);

      if (res && res.success) {
        mostrarToast('Acceso correcto. Entrando al sistema...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        mostrarToast(res?.message || 'ID de usuario, correo o contraseña incorrectos.', 'error');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error atrapado:', err);
      mostrarToast(
        err?.response?.data?.message || err?.message || 'Error al conectar con el servidor.',
        'error'
      );
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryResult(null);

    try {
      const response = await fetch('https://sigra-zero.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: recoveryIdentifier.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'No se encontró una cuenta asociada a ese correo o ID.');
      }

      setRecoveryResult({
        correoEnviado: Boolean(data.correoEnviado),
        resetUrl: data.resetUrl || null,
        token: data.token || null,
        mensaje: data.message || 'Solicitud de recuperación procesada correctamente.'
      });
      mostrarToast('Solicitud de recuperación generada con éxito.');
    } catch (err) {
      console.error('Error en recuperación:', err);
      mostrarToast(err.message || 'Error al procesar la recuperación.', 'error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSetupAdminSubmit = async (e) => {
    e.preventDefault();
    setCreandoAdmin(true);

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

      mostrarToast('Administrador principal registrado con éxito.');
      setRequiereSetupInicial(false);
      setId(String(adminForm.id_usuario || '1'));
      setVistaActiva('login');
    } catch (err) {
      mostrarToast(err.message, 'error');
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

        {/* VISTA 1: LOGIN NORMAL */}
        {vistaActiva === 'login' && (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="userId">ID de Usuario o Correo Electrónico:</label>
                <div className="input-field">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    id="userId"
                    placeholder="Ej. 1 o correo@gmail.com"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña:</label>
                <div className="input-field">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
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

              <div className="forgot-password-container">
                <button 
                  type="button" 
                  className="forgot-password-link"
                  onClick={() => {
                    setVistaActiva('recuperar');
                    setRecoveryResult(null);
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'VERIFICANDO...' : 'ACCEDER AL SISTEMA'}
              </button>
            </form>

            {/* BANNER AUTOMÁTICO SOLO CUANDO LA BASE DE DATOS TIENE 0 USUARIOS */}
            {requiereSetupInicial && (
              <div className="bootstrap-banner">
                <p>El sistema aún no cuenta con ningún usuario registrado.</p>
                <button
                  type="button"
                  className="submit-btn submit-btn-green"
                  onClick={() => setVistaActiva('setup_admin')}
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
            {!recoveryResult ? (
              <form onSubmit={handleRecoverySubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="recoveryEmail">Correo Electrónico o ID de Usuario:</label>
                  <div className="input-field input-no-icon">
                    <input
                      type="text"
                      id="recoveryEmail"
                      placeholder="Ej. correo@gmail.com o ID 1"
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      required
                      disabled={recoveryLoading}
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn submit-btn-green" disabled={recoveryLoading}>
                  {recoveryLoading ? 'PROCESANDO...' : 'RECUPERAR CONTRASEÑA'}
                </button>

                <button 
                  type="button" 
                  className="forgot-password-link" 
                  style={{ textAlign: 'center', width: '100%', marginTop: '8px' }}
                  onClick={() => setVistaActiva('login')}
                >
                  ← Volver al inicio de sesión
                </button>
              </form>
            ) : (
              <div className="recovery-box">
                <p style={{ fontWeight: '700', color: '#16a34a', margin: '0 0 6px 0' }}>
                  ✓ {recoveryResult.mensaje}
                </p>

                {recoveryResult.correoEnviado ? (
                  <p style={{ margin: '0 0 12px 0', color: '#475569' }}>
                    Revisa tu bandeja de entrada o carpeta de spam para abrir el enlace de restablecimiento.
                  </p>
                ) : null}

                {recoveryResult.token && (
                  <button
                    type="button"
                    className="submit-btn submit-btn-green"
                    style={{ marginBottom: '10px' }}
                    onClick={() => navigate(`/reset-password?token=${recoveryResult.token}`)}
                  >
                    Continuar al Restablecimiento de Contraseña
                  </button>
                )}

                <button 
                  type="button" 
                  className="forgot-password-link" 
                  style={{ width: '100%', textAlign: 'center', marginTop: '6px' }}
                  onClick={() => {
                    setVistaActiva('login');
                    setRecoveryResult(null);
                  }}
                >
                  ← Regresar al Login
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
                <label>ID Admin:</label>
                <div className="input-field input-no-icon">
                  <input
                    type="text"
                    value={adminForm.id_usuario}
                    onChange={(e) => setAdminForm({ ...adminForm, id_usuario: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Nombre Completo:</label>
                <div className="input-field input-no-icon">
                  <input
                    type="text"
                    placeholder="Nombre del Administrador"
                    value={adminForm.nombre_completo}
                    onChange={(e) => setAdminForm({ ...adminForm, nombre_completo: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Correo Electrónico:</label>
              <div className="input-field input-no-icon">
                <input
                  type="email"
                  placeholder="admin@winfored.com"
                  value={adminForm.correo}
                  onChange={(e) => setAdminForm({ ...adminForm, correo: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Teléfono:</label>
              <div className="input-field input-no-icon">
                <input
                  type="text"
                  placeholder="7120000000"
                  value={adminForm.telefono}
                  onChange={(e) => setAdminForm({ ...adminForm, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña:</label>
              <div className="input-field input-no-icon">
                <input
                  type="password"
                  placeholder="Contraseña de acceso"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
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
              onClick={() => setVistaActiva('login')}
            >
              ← Cancelar
            </button>
          </form>
        )}

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
};

export default Login;