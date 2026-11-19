# Contribuindo

## Desenvolvimento

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

O núcleo não deve importar rede, disco ou APIs de relógio real. Use interfaces injetadas
e testes determinísticos para novos comportamentos.

## Commits

Use mensagens curtas em português no formato `tipo(escopo): descrição`, por exemplo:
`fix(core): corrige retrocesso do nextIndex`.

Não inclua credenciais, arquivos `.env`, `dist/` ou relatórios locais de benchmark.
