// Integração real; somente dados novos identificados. Nunca exclui registros.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),http=require('http'),jwt=require('jsonwebtoken');
const pool=require('../src/config/database'),app=require('../src/app'),chat=require('../src/services/chatService');
(async()=>{
 assert(process.argv.includes('--allow-test-data'));assert.equal(process.env.DB_NAME,'help_us2');
 const before={};for(const entry of (await pool.query('SHOW TABLES'))[0]){const t=Object.values(entry)[0];before[t]=(await pool.query('SELECT * FROM `'+t+'`'))[0]}
 const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const run=Date.now(),senha='Final!'+crypto.randomBytes(12).toString('hex'),accounts=[],report={run,contas:accounts,pedidos:[],testes:[]};
 if(fs.existsSync('.final-test.local.json'))fs.copyFileSync('.final-test.local.json','.final-test.previous-'+run+'.local.json');
 const save=()=>fs.writeFileSync('.final-test.local.json',JSON.stringify({...report,senha},null,2));
 const token=u=>jwt.sign({id_usuario:u.id_usuario},process.env.JWT_SECRET,{expiresIn:'15m'});
 async function req(method,path,u,body,expected=200){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+token(u)}:{})},body:body?JSON.stringify(body):undefined});const b=await r.json();assert.equal(r.status,expected,path+': '+JSON.stringify(b));return b}
 const addr={rua:'Rua de teste',numero:'10',bairro:'Centro de teste',cidade:'Cidade teste',estado:'RS',cep:'93000-000',sem_numero:false,referencia:'REFERENCIA_PRIVADA',latitude:-29.7654321,longitude:-51.1454321};
 try{
 for(const [label,v]of [['Solicitante',false],['Voluntario_A',true],['Voluntario_B',true],['Terceiro',false]]){const email='final.'+label.toLowerCase()+'.'+run+'@example.invalid';const b=await req('POST','/usuarios/cadastro',null,{nome:'TESTE_FINAL_'+label+'_'+run,email,senha,confirmarSenha:senha,eh_voluntario:v},201);accounts.push({id_usuario:b.usuario.id_usuario,nome:label,email});save()}
 const[owner,v1,v2,stranger]=accounts;
 const body={id_tipo:1,descricao:'DESCRICAO_PRIVADA_'+run,descricao_publica:'TESTE FINAL '+run,nivel_urgencia:'media',latitude:addr.latitude,longitude:addr.longitude,endereco:addr,modalidade_horario:'agora',fuso_horario:'America/Sao_Paulo'};
 async function create(extra={}){const b=await req('POST','/ocorrencias',owner,{...body,...extra},201);report.pedidos.push(b.ocorrencia.id_ocorrencia);save();return b.ocorrencia.id_ocorrencia}
 const detail=async(id,u)=>(await req('GET','/ocorrencias/'+id,u)).ocorrencia;
 const act=(id,u,kind,data={},status=200)=>req('POST','/ocorrencias/'+id+'/'+kind,u,data,status);
 await req('POST','/ocorrencias',owner,{...body,endereco:null},400);
 await req('POST','/ocorrencias',owner,{...body,endereco:{...addr,sem_numero:true,referencia:''}},400);
 await req('POST','/ocorrencias',owner,{...body,endereco:{...addr,latitude:0}},400);
 await req('PUT','/meu-endereco',owner,addr);assert.equal((await req('GET','/meu-endereco',stranger)).endereco,null);
 const id=await create();await req('PUT','/meu-endereco',owner,{...addr,rua:'Outro endereço'});assert.equal((await detail(id,owner)).endereco.rua,addr.rua);
 await req('DELETE','/meu-endereco',owner);assert.equal((await req('GET','/meu-endereco',owner)).endereco,null);assert.equal((await detail(id,owner)).endereco.rua,addr.rua);
 await req('PUT','/meu-endereco',owner,addr);
 report.testes.push('Endereço privado, validações, versionamento e snapshot imutável do pedido');
 await req('GET','/ocorrencias/'+id,stranger,null,404);await req('GET','/ocorrencias/'+id,{id_usuario:10},null,404);
 assert((await req('GET','/ocorrencias',{id_usuario:10})).ocorrencias.every(x=>x.id_solicitante===10));
 const pre=await act(id,v1,'conversas');await act(id,v2,'conversas');await act(id,v1,'recusar');await act(id,v1,'desfazer-recusa');
 const race=await Promise.all([v1,v2].map(async u=>{const r=await fetch(base+'/ocorrencias/'+id+'/aceitar',{method:'POST',headers:{Authorization:'Bearer '+token(u)}});return{u,status:r.status}}));assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);
 const winner=race.find(x=>x.status===200).u,loser=race.find(x=>x.status===409).u;
 const own=await detail(id,owner),aid=own.acompanhamento.id_atendimento;
 const publicAccepted=await detail(id,winner);assert.equal(publicAccepted.endereco,null);assert.equal(publicAccepted.descricao,null);assert.notEqual(publicAccepted.latitude,addr.latitude);
 const notices=(await req('GET','/notificacoes',owner)).notificacoes;assert(notices.some(n=>n.tipo==='aceite'));await act(id,winner,'aceitar');assert.equal((await req('GET','/notificacoes',owner)).notificacoes.filter(x=>x.tipo==='aceite').length,1);
 await req('POST','/notificacoes/'+notices[0].id_notificacao+'/lida',stranger,{},404);await req('POST','/notificacoes/'+notices[0].id_notificacao+'/lida',owner,{});
 await act(id,loser,'compartilhar',{id_atendimento:aid},403);await act(id,owner,'compartilhar',{id_atendimento:aid+999},409);
 await act(id,owner,'compartilhar',{id_atendimento:aid});await act(id,owner,'compartilhar',{id_atendimento:aid});
 assert.equal((await detail(id,winner)).latitude,addr.latitude);assert.equal((await detail(id,winner)).endereco.rua,addr.rua);assert.equal((await detail(id,loser)).endereco,null);
 const history=await req('GET','/mensagens/ocorrencia/'+id+'?id_interlocutor='+owner.id_usuario,winner);assert.equal(history.conversa.somente_leitura,false);
 const claims={id_usuario:winner.id_usuario,exp:Math.floor(Date.now()/1000)+600},event={type:'chat_message',request_id:'final-'+run,text:'Mensagem persistida de teste',id_ocorrencia:id,id_destinatario:owner.id_usuario};
 const m=await chat.saveMessage(claims,event);const repeated=await chat.saveMessage(claims,event);assert.equal(m.id_mensagem,repeated.id_mensagem);
 await act(id,owner,'revogar',{id_atendimento:aid});const hidden=await detail(id,winner);assert.equal(hidden.endereco,null);assert.equal(hidden.descricao,null);assert.notEqual(hidden.latitude,addr.latitude);
 await act(id,owner,'compartilhar',{id_atendimento:aid});await act(id,winner,'solicitar-conclusao');assert((await detail(id,owner)).acompanhamento.conclusao_solicitada);
 await act(id,owner,'rejeitar-conclusao');assert(!(await detail(id,owner)).acompanhamento.conclusao_solicitada);await act(id,winner,'solicitar-conclusao');
 await act(id,winner,'finalizar',{},403);await act(id,owner,'finalizar');await act(id,owner,'finalizar');assert.equal((await detail(id,owner)).status,'finalizada');assert.equal((await detail(id,winner)).endereco,null);
 await assert.rejects(chat.saveMessage(claims,{...event,request_id:'closed-'+run}),e=>e.code==='READ_ONLY');
 await act(id,winner,'avaliar',{nota:5},403);await act(id,owner,'avaliar',{nota:6},400);await Promise.all([act(id,owner,'avaliar',{nota:5,comentario:'Teste privado'}),act(id,owner,'avaliar',{nota:5})]);
 assert.equal((await pool.query('SELECT COUNT(*) n FROM avaliacao WHERE id_atendimento=?',[aid]))[0][0].n,1);
 report.testes.push('Pedro/terceiro bloqueados, aceite concorrente, consentimento/revogação explícitos, privacidade REST, notificações privadas sem duplicação, conclusão e avaliação única, chat persistente e encerrado');
 const withdrawal=await create({modalidade_horario:'agendado',necessaria_em:new Date(Date.now()+86400000).toISOString()});await act(withdrawal,v1,'aceitar');let d=await detail(withdrawal,owner);await act(withdrawal,owner,'compartilhar',{id_atendimento:d.acompanhamento.id_atendimento});await act(withdrawal,v1,'desistir');await act(withdrawal,v1,'desistir');
 assert.equal((await detail(withdrawal,owner)).acompanhamento.aguarda_reabertura,false);assert.equal((await req('GET','/mensagens/ocorrencia/'+withdrawal+'?id_interlocutor='+owner.id_usuario,v1)).conversa.somente_leitura,true);
 await act(withdrawal,v2,'aceitar');assert.equal((await detail(withdrawal,v2)).endereco,null);
 await act(withdrawal,owner,'compartilhar',{id_atendimento:d.acompanhamento.id_atendimento},409);
 const past=await create();await act(past,v1,'aceitar');await act(past,v1,'desistir');assert((await detail(past,owner)).acompanhamento.aguarda_reabertura);await act(past,v2,'aceitar',{},409);await act(past,owner,'reabrir');await act(past,v2,'aceitar');
 report.testes.push('Desistência distinta de recusa; chat anterior fechado; outro responsável sem herdar consentimento; horário passado exige reabertura');
 const cancelled=await create();await act(cancelled,v1,'aceitar');const ca=(await detail(cancelled,owner)).acompanhamento.id_atendimento;
 const cancelRace=await Promise.allSettled([act(cancelled,owner,'compartilhar',{id_atendimento:ca}),act(cancelled,owner,'cancelar')]);assert(cancelRace[1].status==='fulfilled');assert.equal((await detail(cancelled,owner)).status,'cancelada');assert.equal((await detail(cancelled,v1)).endereco,null);
 assert.equal((await pool.query('SELECT status FROM atendimento WHERE id_atendimento=?',[ca]))[0][0].status,'cancelado');await act(cancelled,owner,'cancelar');
 const acceptCancel=await create();await Promise.allSettled([act(acceptCancel,v1,'aceitar'),act(acceptCancel,owner,'cancelar')]);assert.equal((await detail(acceptCancel,owner)).status,'cancelada');assert.equal((await pool.query("SELECT COUNT(*) n FROM atendimento WHERE id_ocorrencia=? AND status='aceito'",[acceptCancel]))[0][0].n,0);
 for(const oid of [3,12]){const [[o]]=await pool.query('SELECT id_solicitante FROM ocorrencia WHERE id_ocorrencia=?',[oid]);if(o){const meta=await detail(oid,{id_usuario:o.id_solicitante});assert(meta.acompanhamento.ambiguo);assert.equal(meta.acompanhamento.pode_compartilhar,false)}}
 const demo=await create({descricao_publica:'Demonstração final — pedido disponível',modalidade_horario:'agendado',necessaria_em:new Date(Date.now()+86400000).toISOString()});report.pedido_demonstracao=demo;
 report.testes.push('Cancelamento x compartilhamento/aceite serializados, terminal sem acesso privado, vínculos legados ambíguos protegidos');
 console.log('PASS:',report.testes.join('; '));
 } finally {
  for(const [table,rows]of Object.entries(before)){const after=(await pool.query('SELECT * FROM `'+table+'`'))[0];const pk=Object.keys(rows[0]||{}).find(k=>k.startsWith('id_'));for(const row of rows)assert.deepEqual(after.find(x=>x[pk]===row[pk]),row,'Registro anterior alterado em '+table)}
  report.anteriores_preservados=true;save();console.log(JSON.stringify({usuarios:accounts.map(x=>x.id_usuario),pedidos:report.pedidos,pedido_demonstracao:report.pedido_demonstracao,preservados:true}));await new Promise(r=>server.close(r));await pool.end();
 }
})().catch(e=>{console.error(e);process.exit(1)});
