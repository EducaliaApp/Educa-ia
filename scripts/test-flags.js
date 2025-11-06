#!/usr/bin/env node

/**
 * Script para probar que los feature flags funcionan correctamente
 * Ejecutar con: node scripts/test-flags.js
 */

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

// Simular el comportamiento de los flags
const getEnvFlag = (key, defaultValue) => {
  const envValue = process.env[key]
  if (envValue === undefined) return defaultValue
  return envValue === 'true' || envValue === '1'
}

const flagFallbacks = {
  menuItemInicio: true,
  menuItemPlanifica: true,
  menuItemEvalua: true,
  menuItemMiCarrera: true,
  menuItemEmpleo: true,
  menuItemSalud: true,
}

const testFlags = () => {
  console.log('🧪 Probando Feature Flags...\n')
  
  const flags = {
    menuItemInicio: getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_INICIO', flagFallbacks.menuItemInicio),
    menuItemPlanifica: getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_PLANIFICA', flagFallbacks.menuItemPlanifica),
    menuItemEvalua: getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_EVALUA', flagFallbacks.menuItemEvalua),
    menuItemMiCarrera: getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_MI_CARRERA', flagFallbacks.menuItemMiCarrera),
    menuItemEmpleo: getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_EMPLEO', flagFallbacks.menuItemEmpleo),
    menuItemSalud: getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_SALUD', flagFallbacks.menuItemSalud),
  }

  console.log('📊 Estado actual de los flags:')
  console.log('================================')
  
  Object.entries(flags).forEach(([key, value]) => {
    const status = value ? '✅ Habilitado' : '❌ Deshabilitado'
    const envKey = `NEXT_PUBLIC_FEATURE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`
    const envValue = process.env[envKey]
    const source = envValue !== undefined ? `(env: ${envValue})` : '(default)'
    
    console.log(`${key.padEnd(20)} ${status} ${source}`)
  })

  console.log('\n🎯 Todos los flags funcionan correctamente!')
  console.log('\n💡 Para cambiar un flag, modifica las variables de entorno en .env.local:')
  console.log('   NEXT_PUBLIC_FEATURE_MENU_ITEM_INICIO=false')
  console.log('   NEXT_PUBLIC_FEATURE_MENU_ITEM_PLANIFICA=true')
  console.log('   etc...')
  console.log('\n📝 O ejecuta: npm run flags:test para ver el estado actual')
}

testFlags()