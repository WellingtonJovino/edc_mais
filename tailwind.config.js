/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'float-merge': 'floatMerge 1.5s ease-out forwards',
        'float-merge-delayed': 'floatMergeDelayed 1.8s ease-out forwards',
        'float-spiral': 'floatSpiral 2s ease-out forwards',
        'float-pulse': 'floatPulse 1.6s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        floatMerge: {
          '0%': {
            transform: 'translateY(0px) translateX(0px) scale(1) rotate(0deg)',
            opacity: '0.8'
          },
          '50%': {
            transform: 'translateY(-100px) translateX(50px) scale(1.1) rotate(5deg)',
            opacity: '0.6'
          },
          '100%': {
            transform: 'translateY(-300px) translateX(200px) scale(0.3) rotate(15deg)',
            opacity: '0'
          }
        },
        floatMergeDelayed: {
          '0%': {
            transform: 'translateY(0px) translateX(0px) scale(1) rotate(0deg)',
            opacity: '0.8'
          },
          '30%': {
            transform: 'translateY(0px) translateX(0px) scale(1) rotate(0deg)',
            opacity: '0.8'
          },
          '70%': {
            transform: 'translateY(-80px) translateX(-100px) scale(1.15) rotate(-8deg)',
            opacity: '0.5'
          },
          '100%': {
            transform: 'translateY(-250px) translateX(-300px) scale(0.2) rotate(-20deg)',
            opacity: '0'
          }
        },
        floatSpiral: {
          '0%': {
            transform: 'translateY(0px) translateX(0px) scale(1) rotate(0deg)',
            opacity: '0.7'
          },
          '25%': {
            transform: 'translateY(-50px) translateX(30px) scale(1.2) rotate(90deg)',
            opacity: '0.5'
          },
          '50%': {
            transform: 'translateY(-100px) translateX(0px) scale(1.1) rotate(180deg)',
            opacity: '0.3'
          },
          '75%': {
            transform: 'translateY(-150px) translateX(-30px) scale(0.8) rotate(270deg)',
            opacity: '0.2'
          },
          '100%': {
            transform: 'translateY(-200px) translateX(0px) scale(0.4) rotate(360deg)',
            opacity: '0'
          }
        },
        floatPulse: {
          '0%': {
            transform: 'translateY(0px) scale(1)',
            opacity: '0.8'
          },
          '30%': {
            transform: 'translateY(-30px) scale(1.3)',
            opacity: '0.6'
          },
          '60%': {
            transform: 'translateY(-120px) scale(1.1)',
            opacity: '0.4'
          },
          '100%': {
            transform: 'translateY(-280px) scale(0.3)',
            opacity: '0'
          }
        }
      },
      animationDelay: {
        '75': '75ms',
        '150': '150ms',
        '300': '300ms',
        '500': '500ms',
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}