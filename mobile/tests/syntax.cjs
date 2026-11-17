const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const files = ['App.js', 'index.js'];
function collect(directory) {
  for (const item of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, item.name);
    if (item.isDirectory()) collect(relative);
    else if (item.name.endsWith('.js')) files.push(relative);
  }
}
collect('src');
for (const file of files) babel.transformFileSync(path.join(root, file), {
  babelrc: false, configFile: false, ast: false, code: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});
console.log(`PASS: sintaxe de ${files.length} arquivos JS/JSX.`);
