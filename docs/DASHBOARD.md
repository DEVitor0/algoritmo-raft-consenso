# Dashboard

O dashboard consulta o controller e não cria métricas, líderes ou estados sintéticos.
Quando a API não responde, mostra `cluster não está rodando`.

## Seções

- **Cluster:** nós, papéis, termo, commit index e estado do controller.
- **KV Console:** área reservada para operações contra a API real.
- **Chaos Lab:** área reservada para controle de falhas do controller.
- **Replay:** área reservada para replay de execuções seedadas.
- **Benchmark:** área reservada para relatórios medidos.
- **Consistency:** área reservada para o verificador de linearizabilidade.
- **Didactic Mode:** explicações conceituais explicitamente separadas dos dados reais.

O shell das seções está disponível; as integrações que ainda não têm endpoint são exibidas
como estado vazio, sem dados inventados.
