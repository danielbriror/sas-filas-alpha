# Filas SAS — Alfa

Protótipo estático para organizar filas multi-especialidade de volantes em ações de saúde. Esta versão usa exclusivamente dados fictícios e não está conectada a nenhuma planilha, conta Google ou sistema SAS.

## O problema resolvido

Um paciente pode precisar de várias especialidades. Ao ser chamado para a porta ou entrar em atendimento em uma delas, o painel o marca como ocupado nas demais, impedindo que dois volantes o chamem ao mesmo tempo. Ao concluir a consulta, ele fica disponível para as especialidades pendentes.

## Rodar localmente

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Testes

```bash
npm test
```

Os testes cobrem:

- formação das filas a partir das abas genéricas;
- bloqueio global enquanto o paciente está em outra especialidade;
- limite de pacientes na porta;
- liberação automática para especialidades pendentes após concluir atendimento;
- troca da cor/pulseira de uma especialidade sem apagar estados da fila.

## Dados genéricos

- `src/mock-planilha.js`: representa abas de especialidade e pacientes fictícios.
- `docs/PLANILHA_GENERICA.md`: contrato da futura planilha real.

## Segurança antes de integrar dados reais

Não coloque planilha publicada, credencial Google, nome de paciente real ou URL de acesso à planilha neste repositório. A integração futura deve usar Google Apps Script autenticado e uma aba operacional separada para registrar estado/auditoria.

## Estado alfa

- Interface e lógica local prontas para simulação.
- Sem integração Google Sheets.
- Sem autenticação de usuários.
- Sem dados reais.
