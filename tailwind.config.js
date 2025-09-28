const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, './views/**/*.ejs'),
    path.join(__dirname, './public/**/*.js'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
