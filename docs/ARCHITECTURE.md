# Arquitetura atual

```text
packages/
├── raft-core/   máquina de consenso pura
├── node/        nó KV, WAL, transporte e métricas
├── client/      cliente com retry e redirecionamento
├── chaos/       simulador, controller e benchmark
└── dashboard/   console React
```

## Fluxo de uma escrita

1. O cliente envia `PUT`, `DELETE` ou `CAS`.
2. O nó líder aceita a proposta no núcleo Raft.
3. O comando é replicado pelo transporte configurado.
4. Ao atingir o commit, a callback aplica o comando na KV.
5. O WAL registra comandos mutáveis com CRC e `fsync`.

O controller de desenvolvimento mantém cinco nós lógicos no mesmo processo para tornar
o laboratório fácil de iniciar. A separação em processos independentes é uma limitação
conhecida e está no `PLANO.md`.
