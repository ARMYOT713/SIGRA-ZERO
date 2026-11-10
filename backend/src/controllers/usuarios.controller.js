const prisma = require("../config/db");
const bcrypt = require("bcrypt");

// 1. OBTENER TODOS LOS USUARIOS
async function obtenerUsuarios(req, res) {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id_usuario: true,
        nombre_completo: true,
        correo: true,
        rol: true,
        telefono: true,
        // Omitimos el password por seguridad al listar
      },
      orderBy: { id_usuario: 'asc' }
    });
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
}

// 2. CREAR USUARIO (Desde el panel de administración)
async function crearUsuario(req, res) {
  try {
    const { nombre_completo, correo, password, rol, telefono } = req.body;

    if (!nombre_completo || !password) {
      return res.status(400).json({ error: "El nombre completo y la contraseña son obligatorios" });
    }

    const passwordHasheada = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre_completo,
        correo: correo || null,
        password: passwordHasheada,
        rol: rol || "SOPORTE_TECNICO",
        telefono: telefono || null
      },
    });

    res.status(201).json({
      mensaje: "Usuario creado exitosamente",
      usuario: {
        id_usuario: nuevoUsuario.id_usuario,
        nombre_completo: nuevoUsuario.nombre_completo,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
        telefono: nuevoUsuario.telefono
      }
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al registrar el usuario" });
  }
}

// 3. ACTUALIZAR USUARIO
async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const { nombre_completo, correo, password, rol, telefono } = req.body;

    const datosAActualizar = {
      nombre_completo,
      correo: correo || null,
      rol,
      telefono: telefono || null
    };

    // Si mandó una nueva contraseña, la hasheamos; si viene vacía, no la tocamos
    if (password && password.trim() !== "") {
      datosAActualizar.password = await bcrypt.hash(password, 10);
    }

    const usuarioActualizado = await prisma.usuarios.update({
      where: { id_usuario: Number(id) },
      data: datosAActualizar
    });

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
}

// 4. ELIMINAR USUARIO
async function eliminarUsuario(req, res) {
  try {
    const { id } = req.params;

    await prisma.usuarios.delete({
      where: { id_usuario: Number(id) }
    });

    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
}

module.exports = {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
};