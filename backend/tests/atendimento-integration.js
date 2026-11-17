require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),http=require('http'),jwt=require('jsonwebtoken');
const {WebSocket}=require('ws'),{once}=require('events');
const pool=require('../src/config/database'),app=require('../src/app'),attach=require('../src/websocket/chatServer');
(async()=>{
 assert(process.argv.includes('--allow-test-data'),'Exige --allow-test-data');assert.equal(process.env.DB_NAME,'help_us2');
 const tables=['usuario','ocorrencia','atendimento','mensagem'];const before={};for(const t of tables)before[t]=(await pool.query('SELECT * FROM '+t))[0];
 const server=http.createServer(app),wsServer=attach(server),sockets=[];await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,run=Date.now(),password='Atendimento!'+crypto.randomBytes(10).toString('hex'),accounts=[];const report={run,contas:accounts,pedidos:[]};
 const save=()=>fs.writeFileSync('.atendimento-test.local.json',JSON.stringify({...report,senha:password},null,2));
 async function req(method,path,user,body,status=200){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+jwt.sign({id_usuario:user.id_usuario},process.env.JWT_SECRET,{expiresIn:'10m'})}:{})},body:body?JSON.stringify(body):undefined});const b=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(b));return b}
 try{
 for(let i=0;i<4;i++){const body={nome:'TESTE_ATENDIMENTO_'+run+'_'+i,email:'atendimento.'+run+'.'+i+'@example.invalid',senha:password,confirmarSenha:password,telefone:'51999999999',eh_voluntario:i===1||i===2};const b=await req('POST','/usuarios/cadastro',null,body,201);accounts.push({id_usuario:b.usuario.id_usuario,email:body.email});save()}
 const [owner,v1,v2,stranger]=accounts;
 const body={id_tipo:1,descricao:'PRIVADO_'+run,descricao_publica:'Resumo de teste '+run,endereco_referencia:'ENDERECO_PRIVADO_'+run,nivel_urgencia:'media',latitude:-29.7654321,longitude:-51.1454321,modalidade_horario:'agora',fuso_horario:'America/Sao_Paulo'};
 body.endereco={rua:'Rua teste',numero:'10',bairro:'Teste',cidade:'Teste',estado:'RS',sem_numero:false,latitude:body.latitude,longitude:body.longitude};
 async function create(extra={}){const b=await req('POST','/ocorrencias',owner,{...body,...extra},201);report.pedidos.push(b.ocorrencia.id_ocorrencia);save();return b.ocorrencia}
 const o=await create(),scheduled=await create({modalidade_horario:'agendado',necessaria_em:new Date(Date.now()+86400000).toISOString()});assert.equal(scheduled.modalidade_horario,'agendado');assert(new Date(scheduled.necessaria_em)>new Date());
 await req('POST','/ocorrencias',owner,{...body,modalidade_horario:'agendado',necessaria_em:'2020-01-01T00:00:00.000Z'},400);
 assert((await req('GET','/ocorrencias?escopo=disponiveis',v1)).ocorrencias.some(x=>x.id_ocorrencia===o.id_ocorrencia));
 await req('GET','/ocorrencias/'+o.id_ocorrencia,stranger,null,404);await req('POST','/ocorrencias/'+o.id_ocorrencia+'/aceitar',owner,{},403);
 const path='/ocorrencias/'+o.id_ocorrencia;
 await req('POST',path+'/recusar',v1,{});await req('POST',path+'/recusar',v1,{});
 assert.equal((await pool.query("SELECT COUNT(*) n FROM atendimento WHERE id_ocorrencia=? AND id_voluntario=? AND status='recusado'",[o.id_ocorrencia,v1.id_usuario]))[0][0].n,1);
 assert(!(await req('GET','/ocorrencias?escopo=disponiveis',v1)).ocorrencias.some(x=>x.id_ocorrencia===o.id_ocorrencia));await req('POST',path+'/conversas',v1,{},403);
 await req('POST',path+'/desfazer-recusa',v1,{});
 const c1=await req('POST',path+'/conversas',v1,{}),c2=await req('POST',path+'/conversas',v2,{});
 assert.equal((await req('POST',path+'/conversas',v1,{})).id_conversa,c1.id_conversa);
 const history=await req('GET','/conversas/'+c1.id_conversa+'/mensagens',v1);assert.equal(history.conversa.interlocutor.nome,'Anônimo');assert(!JSON.stringify(history).includes('id_usuario'));
 await req('GET','/conversas/'+c1.id_conversa+'/mensagens',v2,null,403);
 const pub=(await req('GET',path,v1)).ocorrencia;assert.equal(pub.descricao,null);assert.equal(pub.endereco_referencia,null);assert.notEqual(pub.latitude,body.latitude);
 async function connect(user){const w=new WebSocket(base.replace('http','ws')+'/ws/chat');sockets.push(w);await once(w,'open');const next=once(w,'message');w.send(JSON.stringify({type:'auth',token:jwt.sign({id_usuario:user.id_usuario},process.env.JWT_SECRET,{expiresIn:'5m'})}));assert.equal(JSON.parse((await next)[0]).type,'auth_ok');return w}
 const a=await connect(v1),b=await connect(owner);
 const delivery=once(b,'message'),ack=once(a,'message');a.send(JSON.stringify({type:'chat_message',id_conversa:c1.id_conversa,request_id:'one',text:'Olá, posso ajudar?'}));
 const reply=JSON.parse((await ack)[0]);assert.equal(reply.type,'chat_ack');assert.equal(reply.mensagem.minha,true);assert.equal(reply.mensagem.id_remetente,undefined);assert.equal(JSON.parse((await delivery)[0]).mensagem.minha,false);
 const delivery2=once(a,'message'),ack2=once(b,'message');b.send(JSON.stringify({type:'chat_message',id_conversa:c1.id_conversa,request_id:'two',text:'Sim, obrigado.'}));assert.equal(JSON.parse((await ack2)[0]).type,'chat_ack');assert.equal(JSON.parse((await delivery2)[0]).mensagem.id_destinatario,undefined);
 const race=await Promise.all([v1,v2].map(async u=>{const r=await fetch(base+path+'/aceitar',{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({id_usuario:u.id_usuario},process.env.JWT_SECRET,{expiresIn:'5m'})}});return {user:u,status:r.status,body:await r.json()}}));assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);
 const winner=race.find(x=>x.status===200).user,loser=race.find(x=>x.status===409).user;
 assert.equal((await pool.query("SELECT COUNT(*) n FROM atendimento WHERE id_ocorrencia=? AND status='aceito'",[o.id_ocorrencia]))[0][0].n,1);
 assert.notEqual((await req('GET',path,winner)).ocorrencia.latitude,body.latitude);
 const aid=(await req('GET',path,owner)).ocorrencia.acompanhamento.id_atendimento;await req('POST',path+'/compartilhar',owner,{id_atendimento:aid});
 assert.equal((await req('GET',path,winner)).ocorrencia.latitude,body.latitude);
 const lc=loser===v1?c1:c2,wc=winner===v1?c1:c2;
 assert.equal((await req('GET','/conversas/'+lc.id_conversa+'/mensagens',loser)).conversa.somente_leitura,true);
 assert.equal((await req('GET','/conversas/'+lc.id_conversa+'/mensagens',loser)).conversa.interlocutor.nome,'Anônimo');
 assert.equal((await req('POST',path+'/aceitar',winner,{})).id_conversa,wc.id_conversa);
 assert.equal((await req('GET','/conversas/'+c1.id_conversa+'/mensagens',owner)).mensagens.length,2);
 const blocked=await connect(loser),blockedReply=once(blocked,'message');blocked.send(JSON.stringify({type:'chat_message',id_conversa:lc.id_conversa,request_id:'blocked',text:'Não deve salvar'}));assert.equal(JSON.parse((await blockedReply)[0]).codigo,'READ_ONLY');
 await pool.execute("UPDATE usuario SET eh_voluntario=0 WHERE id_usuario=?",[winner.id_usuario]);
 await req('GET',path,winner,null,404);
 assert.equal((await req('GET','/conversas/'+wc.id_conversa+'/mensagens',winner)).conversa.somente_leitura,true);
 await pool.execute("UPDATE usuario SET eh_voluntario=1 WHERE id_usuario=?",[winner.id_usuario]);
 await pool.execute("UPDATE usuario SET status_verificacao='bloqueado' WHERE id_usuario=?",[stranger.id_usuario]);
 await req('GET','/ocorrencias',stranger,null,403);
 await pool.execute("UPDATE usuario SET status_verificacao='pendente' WHERE id_usuario=?",[stranger.id_usuario]);
 await pool.execute("UPDATE ocorrencia SET status='cancelada' WHERE id_ocorrencia=?",[o.id_ocorrencia]);
 assert.equal((await req('GET','/conversas/'+wc.id_conversa+'/mensagens',winner)).conversa.somente_leitura,true);
 await pool.execute("UPDATE ocorrencia SET status='em_atendimento' WHERE id_ocorrencia=?",[o.id_ocorrencia]);
 const pedro={id_usuario:10};assert((await req('GET','/ocorrencias',pedro)).ocorrencias.every(x=>x.id_solicitante===10));await req('GET',path,pedro,null,404);
 report.resultado='PASS: agendamento, recusa/reversão, anonimato REST/WS, mensagens bidirecionais, aceite concorrente, histórico, Pedro';console.log(report.resultado);
 }finally{
 for(const t of tables){const after=(await pool.query('SELECT * FROM '+t))[0];const pk=Object.keys(before[t][0]||{}).find(k=>k.startsWith('id_'));for(const row of before[t])assert.deepEqual(after.find(x=>x[pk]===row[pk]),row,'Registro anterior alterado: '+t)}
 report.registros_anteriores_preservados=true;save();sockets.forEach(s=>s.terminate());wsServer.close();await new Promise(r=>server.close(r));await pool.end();console.log(JSON.stringify({usuarios:accounts.map(x=>x.id_usuario),pedidos:report.pedidos,preservados:true}));
 }
})().catch(e=>{console.error(e);process.exit(1)});
