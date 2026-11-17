const pool = require('../config/database');
const { OcorrenciaError } = require('./ocorrenciaService');
const fields = { rua: 150, numero: 20, bairro: 100, cidade: 100, estado: 2, cep: 10, complemento: 100, referencia: 255 };
function validar(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => ![...Object.keys(fields), 'sem_numero', 'latitude', 'longitude'].includes(k))) throw new OcorrenciaError('Informe o endereço do pedido.');
  const out = {};
  for (const [k, max] of Object.entries(fields)) {
    if (value[k] != null && (typeof value[k] !== 'string' || value[k].trim().length > max)) throw new OcorrenciaError('Campo de endereço inválido: ' + k);
    out[k] = value[k]?.trim() || null;
  }
  if (typeof value.sem_numero !== 'boolean') throw new OcorrenciaError('Confirme se o endereço possui número.');
  out.sem_numero = value.sem_numero;
  if (!out.rua || !out.bairro || !out.cidade || !/^[A-Z]{2}$/.test(out.estado || '') || (!out.sem_numero && !out.numero) || (out.sem_numero && !out.referencia)) throw new OcorrenciaError('Preencha rua, bairro, cidade, UF e número; sem número, informe uma referência.');
  if (out.cep && !/^\d{5}-?\d{3}$/.test(out.cep)) throw new OcorrenciaError('CEP inválido.');
  for (const [k, max] of [['latitude',90],['longitude',180]]) {
    if (typeof value[k] !== 'number' || !Number.isFinite(value[k]) || Math.abs(value[k]) > max) throw new OcorrenciaError('Confirme o ponto do endereço no mapa.');
    out[k] = value[k];
  }
  if (out.sem_numero) out.numero = null;
  return out;
}
function dto(row) {
  if (!row) return null;
  return { ...Object.fromEntries(Object.keys(fields).map(k=>[k,row[k]])),sem_numero:!!row.sem_numero,latitude:row.latitude==null?null:Number(row.latitude),longitude:row.longitude==null?null:Number(row.longitude) };
}
async function get(uid) {
  const [[r]]=await pool.execute('SELECT * FROM endereco WHERE id_usuario=? AND ativo=1 ORDER BY id_endereco DESC LIMIT 1',[uid]);return dto(r);
}
async function save(uid,body) {
  const d=validar(body),keys=[...Object.keys(fields),'sem_numero','latitude','longitude'];
  const db=await pool.getConnection();try{await db.beginTransaction();await db.execute('SELECT id_usuario FROM usuario WHERE id_usuario=? FOR UPDATE',[uid]);
    // Preserve old addresses, recording the new explicit choice as the active version.
    await db.execute('UPDATE endereco SET ativo=0 WHERE id_usuario=? AND ativo=1',[uid]);
    await db.execute(`INSERT INTO endereco(id_usuario,${keys.join(',')}) VALUES(${keys.map(()=>'?').concat('?').join(',')})`,[uid,...keys.map(k=>d[k])]);await db.commit();return d;
  }catch(e){await db.rollback();throw e}finally{db.release()}
}
async function remove(uid){await pool.execute('UPDATE endereco SET ativo=0 WHERE id_usuario=? AND ativo=1',[uid]);}
module.exports={validar,get,save,remove};
