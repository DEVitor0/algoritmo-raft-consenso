# Uso

## Ambiente local

```bash
npm install
npm run cluster:dev
npm --workspace @raft/dashboard run dev
```

## Simulação reproduzível

```bash
npm run sim -- --seed 42 --scenario symmetric-partition
```

O mesmo seed produz o mesmo relatório JSON. Use `--help` para listar cenários e opções.

## Benchmark

```bash
npm run benchmark -- --url http://127.0.0.1:1098 --concurrency 4 \
  --warmup 100 --repetitions 1000 --write-ratio 50
```

Todos os valores do relatório vêm de requisições e relógios reais da execução. Nenhum
número fixo da documentação deve ser interpretado como desempenho do projeto.

## Validação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
