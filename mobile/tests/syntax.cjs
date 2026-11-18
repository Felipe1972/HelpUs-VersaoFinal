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
// Também verifica referências livres; sintaxe/bundle não detectam ReferenceError.
const allowed=new Set([...Object.getOwnPropertyNames(globalThis),'__DEV__','requestAnimationFrame','cancelAnimationFrame']);
const errors=[];
for (const file of files) {
 const result=babel.transformFileSync(path.join(root,file),{
  babelrc:false,configFile:false,ast:true,code:false,
  plugins:[['@babel/plugin-transform-react-jsx',{runtime:'automatic'}],'@babel/plugin-transform-modules-commonjs'],
 });
 babel.traverse(result.ast,{ReferencedIdentifier(p){
  const name=p.node.name;
  if(!p.scope.getBinding(name)&&!allowed.has(name)&&!['require','module','exports'].includes(name)) errors.push(file+':'+(p.node.loc?.start.line||'?')+' '+name);
 }});
}
if(errors.length)throw new Error('Variáveis sem declaração:\n'+[...new Set(errors)].join('\n'));
console.log(`PASS: sintaxe e escopo de ${files.length} arquivos JS/JSX.`);
