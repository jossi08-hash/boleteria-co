import { supabase } from './supabase'

// Registrar un nuevo usuario (comprador o vendedor)
export async function registrarUsuario({ nombre, correo, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: password,
    options: {
      data: { nombre } // esto llena el campo "nombre" automáticamente vía el trigger
    }
  })

  if (error) {
    console.error('Error al registrar usuario:', error.message)
    return { exito: false, mensaje: error.message }
  }
  return { exito: true, usuario: data.user }
}

// Iniciar sesión
export async function iniciarSesion({ correo, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: password
  })

  if (error) {
    console.error('Error al iniciar sesión:', error.message)
    return { exito: false, mensaje: error.message }
  }
  return { exito: true, usuario: data.user }
}

// Cerrar sesión
export async function cerrarSesion() {
  await supabase.auth.signOut()
}

// Obtener el usuario actual (si hay sesión activa)
export async function obtenerUsuarioActual() {
  const { data } = await supabase.auth.getUser()
  return data.user
}