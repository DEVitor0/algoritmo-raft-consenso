# ADR 0001: núcleo Raft puro

- Status: aceito
- Data: 2026-11-19

## Decisão

O consenso fica em `packages/raft-core` sem rede, disco ou relógio global. Clock, PRNG
e transporte entram por interfaces.

## Motivo

Isso permite reproduzir eleições e falhas com seed, testar invariantes em memória e
separar correção do protocolo de detalhes de infraestrutura.
