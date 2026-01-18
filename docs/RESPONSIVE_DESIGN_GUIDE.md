# Guía de Diseño Responsivo - ProfeFlow

## Introducción

Esta guía documenta los patrones y estándares de diseño responsivo implementados en ProfeFlow para garantizar una experiencia óptima en todos los dispositivos.

## Breakpoints

ProfeFlow utiliza un sistema de breakpoints mobile-first optimizado para los dispositivos más comunes:

```typescript
{
  'xs': '375px',   // Teléfonos pequeños (iPhone SE, Android compactos)
  'sm': '390px',   // Teléfonos estándar (iPhone 12/13/14)
  'md': '768px',   // Tablets portrait (iPad Mini, Android tablets)
  'lg': '1024px',  // Tablets landscape, laptops pequeños
  'xl': '1280px',  // Desktop estándar (HD)
  '2xl': '1536px', // Desktop grande (Full HD+)
  '3xl': '1920px', // Desktop wide (Full HD wide)
  '4xl': '2560px', // Ultra-wide (2K/QHD)
}
```

### Dispositivos Target

**Android (Top 5 resoluciones):**
- 360x800 (Samsung Galaxy A series)
- 393x851 (Google Pixel 6/7)
- 412x915 (Samsung Galaxy S series)
- 414x896 (OnePlus, Xiaomi)
- 375x667 (Dispositivos compactos)

**iOS (iPhone 11+):**
- 390x844 (iPhone 12/13/14 Pro)
- 393x852 (iPhone 14 Pro Max, 15 Pro)
- 414x896 (iPhone 11 Pro Max, XS Max)
- 375x812 (iPhone 12 mini, 13 mini)
- 428x926 (iPhone 14 Plus, 15 Plus)

**Tablets:**
- 768x1024 (iPad Mini, tablets Android 8")
- 820x1180 (iPad Air, tablets 10")
- 1024x1366 (iPad Pro 12.9")

**Desktop:**
- 1366x768 (HD común)
- 1920x1080 (Full HD)
- 2560x1440 (2K/QHD)
- 3840x2160 (4K - monitores wide)

## Hooks Disponibles

### useMediaQuery

Hook básico para detectar media queries:

```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery'

function MyComponent() {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')
  
  return isLargeScreen ? <DesktopView /> : <MobileView />
}
```

### useBreakpoint

Hook completo con información del breakpoint actual:

```typescript
import { useBreakpoint } from '@/hooks/useBreakpoint'

function MyComponent() {
  const {
    isMobile,      // < 768px
    isTablet,      // 768px - 1023px
    isDesktop,     // >= 1024px
    isWide,        // >= 1920px
    currentBreakpoint, // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  } = useBreakpoint()
  
  return <div>Breakpoint actual: {currentBreakpoint}</div>
}
```

### Shortcuts

```typescript
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useBreakpoint'

const isMobile = useIsMobile()   // < 768px
const isTablet = useIsTablet()   // 768px - 1023px
const isDesktop = useIsDesktop() // >= 1024px
```

## Componentes Responsivos

### Container

Wrapper para contenido con padding y max-width responsivos:

```typescript
import { Container } from '@/components/ui/Container'

// Contenedor con max-width limitado (recomendado)
<Container variant="constrained" maxWidth="desktop">
  <p>Contenido centrado con padding responsive</p>
</Container>

// Contenedor de ancho completo con padding
<Container variant="fluid">
  <p>Ancho completo con padding</p>
</Container>

// Sin padding ni límites
<Container variant="full">
  <p>Ancho completo sin padding</p>
</Container>
```

### Table (Responsive)

Tablas con scroll horizontal en móvil:

```typescript
import { 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow,
  TableHeader,
  TableCell,
  TableCellPrimary 
} from '@/components/ui/Table'

<TableContainer>
  <Table>
    <TableHead>
      <TableRow>
        <TableHeader>Nombre</TableHeader>
        <TableHeader hideOnMobile>Email</TableHeader>
        <TableHeader hideOnTablet>Fecha</TableHeader>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCellPrimary>Juan</TableCellPrimary>
        <TableCell hideOnMobile>juan@example.com</TableCell>
        <TableCell hideOnTablet>2024-01-01</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</TableContainer>
```

### Button

Botones con touch targets de 44px (WCAG AAA):

```typescript
import Button from '@/components/ui/Button'

<Button size="sm">Pequeño (36px)</Button>
<Button size="md">Mediano (44px)</Button>
<Button size="lg">Grande (52px)</Button>
```

### Card

Cards con padding responsivo:

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle> {/* text-xl sm:text-2xl */}
  </CardHeader>
  <CardContent>
    Contenido
  </CardContent>
</Card>
```

## Navegación Móvil

### Dashboard Layout

El layout del dashboard incluye:

- **Desktop (>= 768px)**: Sidebar fija en el lado izquierdo
- **Mobile (< 768px)**: Header fijo con menú hamburguesa + drawer lateral

```typescript
// Automático en app/(dashboard)/layout.tsx
// No requiere configuración adicional
```

### Admin Layout

Similar al dashboard, con:

- **Desktop (>= 1024px)**: Sidebar fija con tema oscuro
- **Mobile (< 1024px)**: Header fijo con menú hamburguesa

## Patrones de Diseño

### Grid Responsivo

```typescript
// 1 columna en móvil, 2 en tablet, 3 en desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>

// 1 en móvil pequeño, 2 en móvil, 3 en tablet, 4 en desktop
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  ...
</div>
```

### Flex Responsivo

```typescript
// Columna en móvil, fila en desktop
<div className="flex flex-col md:flex-row gap-4">
  <div>Izquierda</div>
  <div>Derecha</div>
</div>

// Centrado en móvil, justificado en desktop
<div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3">
  <h2>Título</h2>
  <Button>Acción</Button>
</div>
```

### Espaciado Responsivo

```typescript
// Padding pequeño en móvil, grande en desktop
<div className="p-4 sm:p-6 lg:p-8">...</div>

// Gap pequeño en móvil, grande en desktop
<div className="space-y-4 sm:space-y-6 lg:space-y-8">...</div>

// Márgenes responsive
<div className="mt-4 sm:mt-6 lg:mt-8">...</div>
```

### Tipografía Responsiva

```typescript
// Títulos escalables
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Título</h1>
<h2 className="text-xl sm:text-2xl font-semibold">Subtítulo</h2>

// Texto normal
<p className="text-sm sm:text-base">Párrafo</p>

// Texto pequeño
<span className="text-xs sm:text-sm">Texto pequeño</span>
```

### Ocultar/Mostrar por Breakpoint

```typescript
// Ocultar en móvil, mostrar en desktop
<div className="hidden md:block">Solo en desktop</div>

// Mostrar en móvil, ocultar en desktop
<div className="md:hidden">Solo en móvil</div>

// Variantes de tabla
<th className="hidden sm:table-cell">Solo en >= sm</th>
<td className="hidden lg:table-cell">Solo en >= lg</td>
```

## Touch Targets

Todos los elementos interactivos deben tener un tamaño mínimo de 44x44px (WCAG 2.1 Level AA):

```typescript
// Usando clases de Tailwind
<button className="min-h-touch min-w-touch p-2">
  <Icon />
</button>

// Ya implementado en:
// - Button component (size="md" y "lg")
// - MobileMenuButton
// - Links en sidebars
```

## Safe Areas (iOS)

Para dispositivos con notch/dynamic island:

```typescript
// Padding seguro automático
<div className="pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right">
  Contenido seguro en iOS
</div>

// Ya implementado en layouts principales
```

## Mejores Prácticas

1. **Mobile First**: Diseña primero para móvil, luego escala a desktop
2. **Touch Targets**: Mínimo 44x44px para elementos tocables
3. **Tipografía**: Usa escalas responsive (text-sm sm:text-base)
4. **Espaciado**: Padding y márgenes responsive (p-4 sm:p-6)
5. **Grids**: Siempre especifica breakpoints (grid-cols-1 md:grid-cols-2)
6. **Tablas**: Usa TableContainer para scroll horizontal
7. **Imágenes**: Usa max-w-full para que no se desborden
8. **Testing**: Prueba en todos los breakpoints principales

## Testing

### Navegadores y Herramientas

- Chrome DevTools (Device Mode)
- Firefox Responsive Design Mode
- Safari Web Inspector
- BrowserStack (para dispositivos reales)

### Checklist de Testing

- [ ] Texto legible en todos los tamaños
- [ ] Touch targets de 44x44px mínimo
- [ ] Sin scroll horizontal no intencional
- [ ] Imágenes no se desbordan
- [ ] Navegación accesible en móvil
- [ ] Formularios funcionales en móvil
- [ ] Tablas con scroll horizontal
- [ ] Modales centrados y accesibles
- [ ] Safe areas respetadas en iOS

## Recursos

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [iOS Safe Area](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Android Screen Sizes](https://developer.android.com/training/multiscreen/screensizes)
