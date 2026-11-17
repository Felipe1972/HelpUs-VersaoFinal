# Diagnóstico de autorização — 16/11/2026

## Causa comprovada
A API que estava na porta 3000 (PID 13316, `node server.js`) executava uma implementação anterior às permissões. O código atual em Desktop/HelpUsTeste já aplicava corretamente a autorização. Não foi possível determinar retrospectivamente a pasta de trabalho do processo encerrado; não se deve afirmar que era cache do Expo ou uma pasta específica.

Na API antiga, Pedro (id 10, eh_voluntario 0 no help_us2) recebia 10 registros tanto em GET /ocorrencias quanto com escopo=meus; a resposta nem continha `perfil`. IDs e proprietários:
- 20 → 22; 19 → 21; 18 → 20; 17 → 16; 11 → 10;
- 10 → 12; 9 → 10; 8 → 12; 2 → 1; 1 → 1.
O pedido 2, “Risco de queda no corredor”, pertence ao usuário 1. A API antiga retornava HTTP 200 ao Pedro.

O código atual carregado em uma porta temporária devolveu somente 9 e 11 e HTTP 404 para /ocorrencias/2. Reiniciamos exclusivamente a API da porta 3000, com WorkingDirectory explícito C:\Users\Usuario\Desktop\HelpUsTeste\backend. Novo PID observado: 23616. Nenhuma regra de produção precisou ser modificada.

## Sessão, Home e privacidade
- A conta da captura corresponde ao ID 10 pelo e-mail. Os testes usaram JWTs temporários assinados localmente para as identidades reais; não extraímos o token armazenado no celular.
- Home consulta GET /ocorrencias, escopo mapa/disponiveis. Histórico usa escopo meus.
- Backend relê eh_voluntario no banco e converte com Number(valor) === 1; Home recebe booleano em perfil. O servidor antigo não fornecia esse contrato e entregava dados indevidos.
- Não há cache persistente de ocorrências. Home limpa dados/perfil/seleção no foco e na saída, cancela a requisição e ignora resposta atrasada. Logout remove token/usuário e reinicia a navegação.
- DTO público restringe título livre, descrição, endereço, identidade do solicitante e arredonda coordenadas. Atendimento aceito pode liberar dados ao participante; próprio pedido nunca é oportunidade.

## Validação realizada
Teste real na porta 3000, por localhost e pelo IP configurado no mobile, 172.20.90.196:
- Pedro id10, não voluntário: mapa exclusivamente 9 e 11; histórico exclusivamente próprio; detalhe alheio 404; oportunidades 403.
- Voluntário id12: oportunidades coincidem com pedidos ativos válidos de terceiros; próprios excluídos e não elegíveis para aceite.
- Proprietário id1: histórico próprio e detalhes próprios acessíveis.
- Terceiros antes do aceite: descrição/endereço nulos, identidade omitida, coordenadas aproximadas.
- Alternar identidades nas requisições não reaproveita dados de outro usuário.
- Chat real: consulta de histórico e autenticação WebSocket por evento auth aprovadas. Não foi enviada mensagem nova neste diagnóstico.
- Backend: 6 testes aprovados.
- Mobile: smoke de 19 rotas e 6 testes aprovados; sintaxe de 21 arquivos aprovada. Inclui formulário de criação, GPS simulado, sucesso/falha de POST, cliques repetidos, logout, mapa, detalhes e navegação.
- Nova regressão confirma limpeza na saída, descarte de resposta atrasada, estado vazio para sessão comum e nova busca ao retornar ao foco.
- Não houve POST válido real de criação neste diagnóstico: para preservar os registros, a regressão de criação foi automatizada com API simulada e validação do backend. Não houve alteração de banco, schema, SDK ou envio ao GitHub.
- Testes físicos de GPS, logout e apresentação no Expo Go ainda devem ser conferidos no celular; testes simulados não equivalem a essa validação.

## Arquivos desta correção
- backend/tests/api-authorization-running.js: novo teste somente leitura contra o processo realmente em execução (detecta API antiga, não apenas código importado em servidor de teste).
- mobile/tests/frontend-smoke.cjs: regressão de ciclo de foco e resposta atrasada.
- DIAGNOSTICO-AUTORIZACAO.md: este registro.
Demais alterações pré-existentes no projeto foram preservadas.

## Repetir a verificação
No Git Bash:

```bash
cd /c/Users/Usuario/Desktop/HelpUsTeste/backend
node tests/api-authorization-running.js
```

A API já ficou em execução. Quando precisar iniciá-la novamente, use nesta mesma pasta `npm start`. Se houver EADDRINUSE, confira qual API ocupa 3000 antes de iniciar outra instância; não encerre processos Node indiscriminadamente.

## Conferir no Expo Go
1. Saia da conta, recarregue o aplicativo e entre como Pedro.
2. Na Home, toque Atualizar pedidos: neste banco, são 2 pedidos próprios (9 e 11), além do marcador de localização pessoal.
3. Abra Meus pedidos e histórico e confira somente pedidos de Pedro.
4. Entre como voluntário e teste Mostrar somente pedidos da comunidade; próprios não devem constar como oportunidades.
5. Volte a Pedro: pedidos de terceiros devem desaparecer. Retorne à Home e atualize novamente.
6. Teste criação e troca de mensagens no celular para completar a validação física.
