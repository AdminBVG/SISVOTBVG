module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bvg-blue': 'var(--bvg-blue)',
        'bvg-blue-light': 'var(--bvg-blue-light)',
        'bvg-celeste': 'var(--bvg-celeste)',
      },
    },
  },
  plugins: [],
}
