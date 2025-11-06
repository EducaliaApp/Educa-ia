#!/usr/bin/env node

/**
 * Script para crear usuario administrador inicial
 * Ejecutar con: node scripts/create-admin.js
 */

const { createClient } = require('@supabase/supabase-js')

// Cargar variables de entorno manualmente
try {
  const fs = require('fs')
  const path = require('path')
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/"/g, '')
      }
    })
  }
} catch (error) {
  // Ignorar errores de carga de .env.local
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Verificar si las variables son de ejemplo
const isExampleConfig = supabaseUrl?.includes('tu-proyecto') || supabaseServiceKey?.includes('tu_')

if (!supabaseUrl || !supabaseServiceKey || isExampleConfig) {
  console.error('❌ Error: Variables de entorno faltantes')
  console.error('')
  console.error('📋 Variables requeridas en .env.local:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"')
  console.error('   SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"')
  console.error('')
  console.error('🔧 Pasos para configurar:')
  console.error('   1. Ve a https://supabase.com/dashboard')
  console.error('   2. Selecciona tu proyecto')
  console.error('   3. Ve a Settings > API')
  console.error('   4. Copia URL y service_role key')
  console.error('   5. Pégalos en .env.local')
  console.error('')
  if (isExampleConfig) {
    console.error('⚠️  Detectamos configuración de ejemplo en .env.local')
    console.error('   Necesitas reemplazar los valores de ejemplo con los reales')
  } else {
    console.error('📄 Un archivo .env.local de ejemplo ha sido creado para ti')
  }
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  console.log('🚀 Creando usuario administrador...')
  
  const adminEmail = 'admin@educalia.cl'
  const adminPassword = 'Admin2024!ProfeFlow'
  
  try {
    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        nombre: 'Administrador ProfeFlow',
        asignatura: 'Administración'
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Usuario ya existe, actualizando perfil...')
        
        // Obtener usuario existente
        const { data: existingUser } = await supabase.auth.admin.listUsers()
        const user = existingUser.users.find(u => u.email === adminEmail)
        
        if (user) {
          // Actualizar perfil existente
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: 'admin',
              plan: 'pro',
              creditos_planificaciones: 999999,
              creditos_evaluaciones: 999999,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) {
            console.error('❌ Error actualizando perfil:', updateError.message)
            return
          }

          console.log('✅ Perfil de administrador actualizado exitosamente')
          console.log(`📧 Email: ${adminEmail}`)
          console.log(`🔑 Contraseña: ${adminPassword}`)
          console.log(`🆔 ID: ${user.id}`)
          return
        }
      } else {
        console.error('❌ Error creando usuario:', authError.message)
        return
      }
    }

    if (authData.user) {
      console.log('✅ Usuario creado en auth.users')
      
      // 2. Crear/actualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          nombre: 'Administrador ProfeFlow',
          email: adminEmail,
          asignatura: 'Administración',
          nivel: 'Todos los niveles',
          establecimiento: 'ProfeFlow - Administración',
          plan: 'pro',
          role: 'admin',
          creditos_planificaciones: 999999,
          creditos_evaluaciones: 999999,
          creditos_usados_planificaciones: 0,
          creditos_usados_evaluaciones: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('❌ Error creando perfil:', profileError.message)
        return
      }

      console.log('✅ Usuario administrador creado exitosamente')
      console.log(`📧 Email: ${adminEmail}`)
      console.log(`🔑 Contraseña: ${adminPassword}`)
      console.log(`🆔 ID: ${authData.user.id}`)
      console.log('')
      console.log('🎯 Ahora puedes acceder al panel admin en: /admin')
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
  }
}

// Ejecutar script
createAdminUser()
  .then(() => {
    console.log('🏁 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error.message)
    process.exit(1)
  })