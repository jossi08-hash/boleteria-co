import { supabase } from './supabase'

// Registrar un nuevo usuario (comprador o vendedor)
export async function registrarUsuario({ nombre, correo, password, datosPago, cedula }) {
  // Verificar si la cédula ya está registrada
  if (cedula && cedula.trim()) {
    const { data: cedulaExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('cedula', cedula.trim())
      .maybeSingle()
    if (cedulaExistente) {
      return { exito: false, mensaje: 'Ese número de documento ya tiene una cuenta registrada.' }
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: password,
    options: {
      data: { nombre } // esto llena el campo "nombre" automáticamente vía el trigger
    }
  })

  if (error) {
    console.error('Error al registrar usuario:', error.message)
    const msg = error.message.includes('already registered') || error.message.includes('User already registered')
      ? 'Ese correo ya tiene una cuenta registrada.'
      : error.message
    return { exito: false, mensaje: msg }
  }

  // Guardar cédula y datos de pago
  if (data.user) {
    const updates = {}
    if (cedula && cedula.trim()) updates.cedula = cedula.trim()
    if (datosPago && datosPago.trim()) updates.datos_pago = datosPago.trim()
    if (Object.keys(updates).length > 0) {
      await supabase.from('usuarios').update(updates).eq('id', data.user.id)
    }
  }

  return { exito: true, usuario: data.user, session: data.session }
}

// Iniciar sesión
export async function iniciarSesion({ correo, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: password
  })

  if (error) {
    console.error('Error al iniciar sesión:', error.message)
    const msg = error.message.includes('not confirmed') || error.message.includes('Email not confirmed')
      ? 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.'
      : error.message
    return { exito: false, mensaje: msg }
  }
  const { data: perfil } = await supabase.from('usuarios').select('es_admin').eq('id', data.user.id).single()
  return { exito: true, usuario: { ...data.user, es_admin: perfil?.es_admin || false } }
}

// Cerrar sesión
export async function cerrarSesion() {
  await supabase.auth.signOut()
}

// Obtener el usuario actual (si hay sesión activa)
export async function obtenerUsuarioActual() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: perfil } = await supabase.from('usuarios').select('es_admin').eq('id', data.user.id).single()
  return { ...data.user, es_admin: perfil?.es_admin || false }
}

// Enviar email de recuperación de contraseña
export async function enviarRecuperacion(correo) {
  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: window.location.origin + '?recuperar=1'
  })
  if (error) return { exito: false, mensaje: error.message }
  return { exito: true }
}

// Actualizar contraseña (cuando el usuario viene del link de recuperación)
export async function actualizarPassword(nuevaPassword) {
  const { error } = await supabase.auth.updateUser({ password: nuevaPassword })
  if (error) return { exito: false, mensaje: error.message }
  return { exito: true }
}
