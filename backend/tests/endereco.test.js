const test=require('node:test'),assert=require('node:assert/strict');
const {validar}=require('../src/services/enderecoService');
test('endereço exige número ou referência e ponto numérico válido',()=>{
 const v={rua:'Rua',numero:'1',bairro:'Bairro',cidade:'Cidade',estado:'RS',sem_numero:false,latitude:-30,longitude:-51};
 assert.equal(validar(v).rua,'Rua');
 for(const p of [{numero:''},{sem_numero:true,referencia:''},{latitude:'-30'},{longitude:181},{estado:''},{id_usuario:1}])assert.throws(()=>validar({...v,...p}));
 assert.equal(validar({...v,sem_numero:true,referencia:'Portão'}).numero,null);
});
