# Arquivamento privado — 18/11/2026

25 arquivos movidos para .private-backups/execucoes-testes/backend e mobile, ignorados pelo Git. Hashes antes/depois conferidos e manifesto privado preservado. Nenhum registro MySQL alterado. Backups do banco mantidos.

- backend/.atendimento-test.local.json
- backend/.chat-test.local.json
- backend/.chat-test.pre-sdk58-20261115222807.local.json
- backend/.chat-test.previous-1794882743109.local.json
- backend/.chat-test.previous-1794915949085.local.json
- backend/.chat-test.previous-1795000058713.local.json
- backend/.chat-test.previous-1795007685417.local.json
- backend/.final-test.local.json
- backend/.final-test.previous-1794883361497.local.json
- backend/.final-test.previous-1794884166714.local.json
- backend/.final-test.previous-1794915743028.local.json
- backend/.final-test.previous-1794963120685.local.json
- backend/.final-test.previous-1794963267195.local.json
- backend/.final-test.previous-1794963677702.local.json
- backend/.final-test.previous-1794963884255.local.json
- backend/.final-test.previous-1794963906120.local.json
- backend/.final-test.previous-1794964025116.local.json
- backend/.final-test.previous-1795000037452.local.json
- backend/.final-test.previous-1795004162825.local.json
- backend/.notifications-test.local.json
- backend/.permissoes-test.failed-final.local.json
- backend/.permissoes-test.local.json
- backend/.sdk58-before-1794792360572.local.json
- backend/.sdk58-validation.local.json
- mobile/.audit-sdk58.local.json

Seis testes de integração agora usam tests/test-artifacts.js para leitura/gravação no destino privado. São resultados, credenciais e snapshots históricos. .env, configurações, dependências, SQL e código funcional preservados.

Validação:8 testes unitários aprovados, sintaxe dos testes, fixture no novo caminho, rejeição de caminho inválido. npm start iniciou na porta3000 e GET /status retornou ok. Processo encerrado após validação para início manual. Não executadas integrações que gravam dados.
