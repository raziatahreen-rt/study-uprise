// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRUCIAL: Tell Tailwind to scan all HTML files in src/ 
  // and all JavaScript files in js/
  content: [
    "./src/**/*.{html,js}", 
    "./js/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}