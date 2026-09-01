# Planilha genérica — Filas SAS Alfa

Esta estrutura é fictícia. Não inserir dados clínicos reais neste repositório.

## Uma aba por especialidade

Crie uma aba para cada especialidade. A primeira linha deve conter:

| patientId | name | triageAt |
|---|---|---|
| SAS-001 | Ana Lima | 08:05 |

- `patientId`: identificador estável do cadastro no sistema SAS. Não usar apenas o nome.
- `name`: nome exibido ao volante.
- `triageAt`: horário de entrada na triagem, usado para ordenar a fila.

## Regra multi-especialidade

Se Ana precisa de Oftalmologia e Dermatologia, inclua a mesma linha, com o mesmo `patientId`, nas duas abas. O aplicativo agrupa esse identificador e passa a controlar a disponibilidade global: enquanto ela estiver na porta ou em consulta de uma especialidade, fica bloqueada nas demais.

## Cores de pulseira

No painel alfa, cada especialidade possui um seletor de cor e uma paleta de pulseiras (azul, verde, amarela, laranja, vermelha, rosa, roxa, preta e branca), além do seletor livre. A mudança fica salva apenas no navegador nesta fase e não altera pacientes ou a ordem/estado das filas.

Na futura integração, o mapeamento deverá morar em uma aba de configuração ou no backend, para que todos os dispositivos vejam a mesma cor vigente.

## Aba operacional futura

Quando houver acesso à planilha real, adicionar uma aba separada — `Estado_Filas` — criada pelo backend, nunca preenchida manualmente pela triagem:

| patientId | specialty | status | volunteerId | changedAt |
|---|---|---|---|---|
| SAS-001 | Oftalmologia | atDoor | volante-1 | 2026-08-31T08:20:00 |

Estados: `waiting`, `atDoor`, `inConsultation`, `completed`, `absent`.

## Segurança

A planilha real deve ser lida por Google Apps Script autenticado. Não publicar uma planilha, credenciais, dados de saúde ou URLs que deem acesso a pacientes no GitHub Pages.
