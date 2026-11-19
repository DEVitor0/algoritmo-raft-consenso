# ADR 0003: WAL em arquivo

- Status: aceito
- Data: 2026-11-19

## Decisão

O nó persiste comandos KV em JSON Lines com checksum CRC e `fsync`.

## Motivo

O formato é simples de inspecionar, reproduzir e recuperar. Uma linha final truncada
pode ser descartada sem invalidar os registros anteriores.
