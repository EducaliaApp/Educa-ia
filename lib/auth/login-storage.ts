'use client'

type LoginPayload = {
  email: string
  password: string
}

const STORAGE_KEY = 'profeFlow:loginPayload'

export function storeLoginPayload(payload: LoginPayload) {
  if (globalThis.window === undefined) {
    return false
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch (error) {
    console.error('No se pudo guardar las credenciales para iniciar sesión', error)
    return false
  }
}

export function consumeLoginPayload(): LoginPayload | null {
  if (globalThis.window === undefined) {
    return null
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<LoginPayload>

    if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string') {
      return null
    }

    return {
      email: parsed.email,
      password: parsed.password,
    }
  } catch (error) {
    console.error('No se pudo recuperar las credenciales para iniciar sesión', error)
    return null
  }
}
