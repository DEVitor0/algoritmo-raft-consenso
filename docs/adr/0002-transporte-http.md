# ADR 0002: transporte HTTP/JSON

- Status: aceito
- Data: 2026-11-19

## Decisão

Mensagens de RequestVote e AppendEntries usam HTTP/JSON, com um transporte em memória
para testes.

## Motivo

HTTP facilita inspeção durante entrevistas e integração com o dashboard. A interface
de transporte mantém o núcleo desacoplado e permite trocar o protocolo no futuro.
