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
      },
      orderBy: { id_usuario: 'asc' }
    });
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
}

// 2. CREAR USUARIO (Con asignación manual de ID por el Administrador)
async function crearUsuario(req, res) {
  try {
    const { id_usuario, nombre_completo, correo, password, rol, telefono } = req.body;

    if (!nombre_completo || !password) {
      return res.status(400).json({ error: "El nombre completo y la contraseña son obligatorios" });
    }

    const idManual = id_usuario !== undefined && id_usuario !== null && String(id_usuario).trim() !== ""
      ? Number(id_usuario)
      : undefined;

    if (idManual !== undefined) {
      if (isNaN(idManual) || idManual <= 0) {
        return res.status(400).json({ error: "El ID de usuario debe ser un número entero mayor a 0" });
      }
      const existeId = await prisma.usuarios.findUnique({
        where: { id_usuario: idManual }
      });
      if (existeId) {
        return res.status(400).json({ error: `El ID ${idManual} ya está ocupado por otro usuario` });
      }
    }

    if (correo && correo.trim() !== "") {
      const existeCorreo = await prisma.usuarios.findUnique({
        where: { correo: correo.trim() }
      });
      if (existeCorreo) {
        return res.status(400).json({ error: "El correo electrónico ya está registrado" });
      }
    }

    const passwordHasheada = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        ...(idManual !== undefined ? { id_usuario: idManual } : {}),
        nombre_completo: nombre_completo.trim(),
        correo: correo && correo.trim() !== "" ? correo.trim() : null,
        password: passwordHasheada,
        rol: rol || "SOPORTE_TECNICO",
        telefono: telefono && telefono.trim() !== "" ? telefono.trim() : null
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

// 3. ACTUALIZAR USUARIO (Permite cambiar también el id_usuario)
async function actualizarUsuario(req, res) {
  try {
    const idActual = Number(req.params.id);
    const { id_usuario, nombre_completo, correo, password, rol, telefono } = req.body;

    const nuevoId = id_usuario !== undefined && id_usuario !== null && String(id_usuario).trim() !== ""
      ? Number(id_usuario)
      : idActual;

    if (isNaN(nuevoId) || nuevoId <= 0) {
      return res.status(400).json({ error: "El ID de usuario debe ser un número entero mayor a 0" });
    }

    if (nuevoId !== idActual) {
      const existeId = await prisma.usuarios.findUnique({
        where: { id_usuario: nuevoId }
      });
      if (existeId) {
        return res.status(400).json({ error: `El ID ${nuevoId} ya está ocupado por otro usuario` });
      }
    }

    const datosAActualizar = {
      id_usuario: nuevoId,
      nombre_completo: nombre_completo ? nombre_completo.trim() : undefined,
      correo: correo && correo.trim() !== "" ? correo.trim() : null,
      rol,
      telefono: telefono && telefono.trim() !== "" ? telefono.trim() : null
    };

    if (password && password.trim() !== "") {
      datosAActualizar.password = await bcrypt.hash(password, 10);
    }

    const usuarioActualizado = await prisma.usuarios.update({
      where: { id_usuario: idActual },
      data: datosAActualizar,
      select: {
        id_usuario: true,
        nombre_completo: true,
        correo: true,
        rol: true,
        telefono: true
      }
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