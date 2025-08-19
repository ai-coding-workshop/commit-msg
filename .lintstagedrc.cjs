module.exports = {
  '*.{js,ts,json,md}': [
    'prettier --write',
    'eslint --fix'
  ],
  'eslint.config.js': ''
};