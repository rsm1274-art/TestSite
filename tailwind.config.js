module.exports = {
  // Limit content scanning to project source (avoid node_modules for performance)
  content: [
    './*.html',
    './**/*.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './assets/**/*.{js,ts}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
