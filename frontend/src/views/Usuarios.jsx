import React, { useState, useEffect } from 'react';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Estado para la notificación flotante (toast)
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '' });

  const [form, setForm] = useState({
    nombre_completo: '',
    correo: '',
    rol: 'SOPORTE_TECNICO',
    password: '',
    telefono: ''
  });

  // Función para mostrar la notificación flotante por 3 segundos
  const mostrarAlertaFlotante = (mensaje) => {
    setNotificacion({ visible: true, mensaje });
    setTimeout(() => {
      setNotificacion({ visible: false, mensaje: '' });
    }, 3000);
  };

  const obtenerHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const obtenerUsuarios = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/usuarios', {
        headers: obtenerHeaders()
      });
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar los usuarios:', error);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setMostrarPassword(false);
    setForm({ nombre_completo: '', correo: '', rol: 'SOPORTE_TECNICO', password: '', telefono: '' });
    setModalAbierto(true);
  };

  const abrirModalEditar = (item, e) => {
    e.stopPropagation();
    setModoEdicion(true);
    setMostrarPassword(false);
    setElementoSeleccionado(item);
    setForm({ 
      nombre_completo: item.nombre_completo, 
      correo: item.correo || '', 
      rol: item.rol, 
      password: '', 
      telefono: item.telefono || '' 
    });
    setModalAbierto(true);
  };

  const abrirModalEliminar = (item, e) => {
    e.stopPropagation();
    setElementoSeleccionado(item);
    setModalEliminar(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (modoEdicion) {
        const response = await fetch(`http://localhost:3000/api/usuarios/${elementoSeleccionado.id_usuario}`, {
          method: 'PUT',
          headers: obtenerHeaders(),
          body: JSON.stringify(form)
        });
        if (response.ok) {
          mostrarAlertaFlotante("Usuario editado con éxito");
          obtenerUsuarios();
        } else {
          alert("Error al editar el usuario");
        }
      } else {
        const response = await fetch('http://localhost:3000/api/usuarios', {
          method: 'POST',
          headers: obtenerHeaders(),
          body: JSON.stringify(form)
        });
        if (response.ok) {
          mostrarAlertaFlotante("Usuario creado con éxito");
          obtenerUsuarios();
        } else {
          alert("Error al crear el usuario");
        }
      }
      setModalAbierto(false);
    } catch (error) {
      console.error('Error al guardar el usuario:', error);
    }
  };

  const confirmarEliminar = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/usuarios/${elementoSeleccionado.id_usuario}`, {
        method: 'DELETE',
        headers: obtenerHeaders()
      });
      if (response.ok) {
        mostrarAlertaFlotante("Usuario eliminado con éxito");
        obtenerUsuarios();
      } else {
        alert("Error al eliminar el usuario");
      }
      setModalEliminar(false);
      setElementoSeleccionado(null);
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', height: '100%', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' }}>
      
      {/* NOTIFICACIÓN FLOTANTE CON PALOMITA */}
      {notificacion.visible && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '30px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 4000,
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #16a34a',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}>
            ✓
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{notificacion.mensaje}</span>
        </div>
      )}

      {/* CABECERA CON TÍTULO Y BOTÓN NUEVO USUARIO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', letterSpacing: '0.5px' }}>
            Lista de Usuarios
          </h2>
          <div style={{ width: '40px', height: '3px', backgroundColor: '#16a34a', marginTop: '4px', borderRadius: '2px' }}></div>
        </div>

        <button
          onClick={abrirModalCrear}
          style={{
            backgroundColor: '#16a34a',
            color: '#ffffff',
            border: 'none',
            padding: '9px 18px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* TABLA DE USUARIOS */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1e293b', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>ID</th>
              <th style={{ padding: '12px 16px' }}>Nombre</th>
              <th style={{ padding: '12px 16px' }}>Correo</th>
              <th style={{ padding: '12px 16px' }}>Rol asignado</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((item, index) => (
                <React.Fragment key={item.id_usuario}>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      backgroundColor: filaExpandida === item.id_usuario ? '#f8fafc' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>{item.id_usuario}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{item.nombre_completo}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{item.correo || 'No registrado'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        backgroundColor: item.rol === 'ADMINISTRADOR' ? '#e0f2fe' : '#f1f5f9', 
                        color: item.rol === 'ADMINISTRADOR' ? '#0369a1' : '#475569', 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontSize: '0.72rem', 
                        fontWeight: '700',
                        border: '1px solid',
                        borderColor: item.rol === 'ADMINISTRADOR' ? '#bae6fd' : '#e2e8f0'
                      }}>
                        {item.rol}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => setFilaExpandida(filaExpandida === item.id_usuario ? null : item.id_usuario)}
                        style={{ backgroundColor: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.75rem', fontWeight: '600' }}
                      >
                        {filaExpandida === item.id_usuario ? 'Ocultar' : 'Ver detalles'}
                      </button>
                      <button 
                        onClick={(e) => abrirModalEditar(item, e)}
                        style={{ backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #fde047', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.75rem', fontWeight: '600' }}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={(e) => abrirModalEliminar(item, e)}
                        style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>

                  {filaExpandida === item.id_usuario && (
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td colSpan="5" style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>
                          Detalles del Usuario
                        </div>
                        <div style={{ display: 'flex', gap: '24px', color: '#334155', fontSize: '0.82rem' }}>
                          <div><strong>Teléfono de contacto:</strong> {item.telefono || 'No registrado'}</div>
                          <div><strong>Estado de cuenta:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>Activo</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR / EDITAR USUARIO */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px 28px', borderRadius: '10px', width: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', color: '#1e293b', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              {modoEdicion ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
            </h3>

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nombre Completo:</label>
                <input 
                  type="text" 
                  required
                  value={form.nombre_completo}
                  onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Correo Electrónico:</label>
                <input 
                  type="email" 
                  value={form.correo}
                  onChange={(e) => setForm({...form, correo: e.target.value})}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* CAMPO CONTRASEÑA CON EL BOTÓN DEL OJITO */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Contraseña:</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={mostrarPassword ? "text" : "password"} 
                    required={!modoEdicion}
                    placeholder={modoEdicion ? "Dejar en blanco para mantener la actual" : ""}
                    value={form.password}
                    onChange={(e) => setForm({...form, password: e.target.value})}
                    style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    title={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {mostrarPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Rol Asignado:</label>
                <select 
                  value={form.rol}
                  onChange={(e) => setForm({...form, rol: e.target.value})}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                >
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  <option value="SOPORTE_TECNICO">SOPORTE_TECNICO</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Teléfono:</label>
                <input 
                  type="text" 
                  value={form.telefono}
                  onChange={(e) => setForm({...form, telefono: e.target.value})}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  {modoEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', width: '360px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', color: '#1e293b', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#dc2626' }}>¿Estás seguro de eliminar este usuario?</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px' }}>
              Se eliminará al usuario <strong style={{ color: '#0f172a' }}>{elementoSeleccionado?.nombre_completo}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => setModalEliminar(false)}
                style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminar}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Usuarios;