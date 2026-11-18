const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),babel=require('@babel/core');
const m={exports:{}};const code=babel.transformSync(fs.readFileSync('src/services/destino.js','utf8'),{babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;vm.runInNewContext('(function(exports){'+code+'})')(m.exports);
test('destino reautoriza, trata fallback e copia somente endereço retornado',async()=>{
 const calls=[],api={get:async()=>({data:{latitude:-29,longitude:-51,endereco:{rua:'Rua',numero:'2',bairro:'Centro',cidade:'Cidade',complemento:'A'}}})},links={canOpenURL:async()=>false,openURL:async u=>calls.push(u)},clip={setStringAsync:async s=>calls.push(s)};
 await m.exports.authorizedDestination(api,1,'route','android',links,clip);assert(calls[0].startsWith('https://www.google.com/maps/dir/'));
 await m.exports.authorizedDestination(api,1,'route','ios',links,clip);assert(calls[1].startsWith('https://maps.apple.com/'));
 await m.exports.authorizedDestination(api,1,'copy','ios',links,clip);assert.equal(calls[2],'Rua, 2, A, Centro, Cidade');
 await assert.rejects(m.exports.authorizedDestination({get:async()=>{throw Error('403')}},1,'copy','ios',links,clip));assert.equal(calls.length,3);
});