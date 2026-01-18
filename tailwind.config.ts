import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Define custom breakpoints optimized for target devices
    screens: {
      // Mobile first approach
      'xs': '375px',   // Small phones (iPhone SE, compact Android)
      'sm': '390px',   // Standard phones (iPhone 12/13/14)
      'md': '768px',   // Tablets portrait (iPad Mini, Android tablets)
      'lg': '1024px',  // Tablets landscape, small laptops
      'xl': '1280px',  // Desktop (standard HD)
      '2xl': '1536px', // Large desktop (Full HD+)
      '3xl': '1920px', // Wide desktop (Full HD wide)
      '4xl': '2560px', // Ultra-wide (2K/QHD)
    },
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Responsive spacing scale
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Minimum touch target sizes (WCAG 2.1 Level AAA)
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      // Container max-widths for different breakpoints
      maxWidth: {
        'mobile': '480px',
        'tablet': '768px',
        'desktop': '1280px',
        'wide': '1920px',
      },
    },
  },
  plugins: [],
}
export default config
