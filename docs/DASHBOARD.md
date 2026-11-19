# Dashboard - Guia de Uso

> Todos os estados, métricas e controles deste dashboard são simulações. Eles não representam medições reais nem um motor Raft distribuído.

## Visão Geral

O dashboard oferece uma interface web para visualização e controle de um simulador didático do Raft. Desenvolvido em React com Material-UI, ele apresenta estados simulados e ferramentas visuais de falha.

**Acesso**: `http://localhost:3000`

---

## Páginas

### 1. Visão Geral do Cluster

Página principal com resumo do estado do cluster.

**Informações Exibidas**:

- **Status do Cluster**
  - Status geral (Saudável/Com Problemas)
  - Líder atual
  - Número de nós ativos
  - Termo atual

- **Gráficos simulados atualizados periodicamente**
  - Latência de operações (ms)
  - Throughput (ops/segundo)
  - Uso de CPU (%)
  - Uso de Memória (%)

- **Timeline de Eventos**
  - Eleições
  - Falhas de nós
  - Commits importantes

**Atualização**: Automática a cada 2 segundos

---

### 2. Gerenciamento de Nós

Visualização detalhada de cada nó do cluster.

**Tabela de Nós**:

| Campo | Descrição |
|-------|-----------|
| ID | Identificador do nó |
| Status | Leader/Follower/Candidate/Dead |
| Termo | Termo atual |
| Log Index | Índice da última entrada |
| Commit Index | Índice committed |
| Last Heartbeat | Último heartbeat recebido |
| Ações | Botões de controle |

**Ações Disponíveis**:
- Visualizar detalhes
- Matar nó (simulação)
- Reiniciar nó
- Ver logs específicos

**Indicadores de Status**:
- 🟢 Verde: Nó operacional
- 🟡 Amarelo: Nó com atraso
- 🔴 Vermelho: Nó falho/morto
- 🔵 Azul: Líder

---

### 3. Visualizador de Logs

Inspeção visual de entradas simuladas de log.

**Funcionalidades**:

- **Tabela de Entradas**
  - Índice
  - Termo
  - Comando
  - Timestamp
  - Status (Pending/Committed/Applied)
  - Tamanho

- **Filtros**
  - Por termo
  - Por status
  - Por intervalo de índices
  - Busca textual

- **Paginação**
  - 50/100/200 entradas por página
  - Navegação rápida

- **Exportação**
  - JSON
  - CSV
  - Texto

**Estatísticas**:
- Total de entradas
- Taxa de commit
- Tamanho do log

---

### 4. Métricas e Análises

Dashboard analítico com gráficos avançados.

**Seções**:

#### Performance
- **Latência**: Histograma e timeline
- **Throughput**: Operações por segundo
- **Percentis**: P50, P90, P95, P99

#### Recursos
- **CPU**: Uso por nó e agregado
- **Memória**: Consumo e tendências
- **Rede**: I/O, pacotes perdidos
- **Disco**: Leituras/escritas

#### Cluster
- **Eleições**: Frequência e duração
- **Heartbeats**: Latência e falhas
- **Replicação**: Taxa de sucesso

**Período Selecionável**:
- Última hora
- Últimas 6 horas
- Últimas 24 horas
- Última semana
- Personalizado

**Exportação**: PNG, PDF, dados brutos

---

### 5. Controle de Simulação

Ferramentas para testar comportamento do cluster.

#### Falhas de Nós

**Matar Nó**:
1. Selecione o nó
2. Clique em "Matar Nó"
3. Observe a mudança visual simulada de líder
4. A interface continua exibindo o estado do cluster

**Reiniciar Nó**:
1. Selecione nó morto
2. Clique em "Reiniciar"
3. Nó sincroniza logs
4. Retorna como Follower

#### Partições de Rede

**Criar Partição**:
1. Selecione nós do Grupo 1
2. Selecione nós do Grupo 2
3. Clique em "Aplicar Partição"
4. Partição majoritária continua operando

**Curar Partição**:
- Clique em "Curar Todas as Partições"
- Comunicação restaurada
- Logs sincronizados

#### Latência Artificial

**Adicionar Delay**:
1. Selecione nó
2. Defina atraso (ms)
3. Aplique
4. Observe impacto

**Cenários Pré-configurados**:
- Falha de líder
- Perda de maioria
- Split-brain
- Cascading failure

---

### 6. Testes de Performance

Visualização de testes de carga simulados.

#### Teste de Throughput

**Configuração**:
- Duração (segundos)
- Concorrência (clientes)
- Tamanho do comando (bytes)

**Resultados**:
- Requisições totais
- Taxa de sucesso
- Ops/segundo
- Latência média/min/max
- Percentis

#### Teste de Latência

**Configuração**:
- Número de requisições
- Intervalo entre requisições

**Resultados**:
- Distribuição de latência
- Histograma
- Outliers
- Desvio padrão

#### Teste de Recuperação

**Configuração**:
- Nós a matar
- Tempo de observação

**Resultados**:
- Tempo de eleição
- Tempo total de recuperação
- Perda de dados
- Downtime

#### Teste de Carga

**Configuração**:
- Taxa de requisições
- Duração
- Tipo de carga (constante/crescente/burst)

**Resultados**:
- Throughput vs tempo
- Latência vs carga
- Ponto de saturação

---

## Componentes Compartilhados

### Barra Lateral

Navegação principal:
- Logo e título
- Links para páginas
- Indicador de página ativa
- Status de conexão

### Header

- Título da página
- Breadcrumbs
- Status do cluster
- Botões de ação rápida

### Cards de Métricas

Componentes reutilizáveis exibindo:
- Valor principal (grande)
- Tendência (seta ↑↓)
- Comparação com período anterior
- Mini gráfico sparkline

### Status Indicators

- **Online**: Ponto verde pulsante
- **Offline**: Ponto cinza
- **Warning**: Ponto amarelo
- **Error**: Ponto vermelho

---

## Configurações

### Acessar Configurações

Clique no ícone ⚙️ no canto superior direito.

### Opções Disponíveis

#### Atualização
- Intervalo de polling (1s - 10s)
- Auto-refresh (on/off)

#### Visualização
- Tema (claro/escuro)
- Densidade de dados (compacto/normal/confortável)
- Idioma (PT-BR/EN)

#### Notificações
- Alertas de falha
- Som
- Desktop notifications

#### Avançado
- URL da API
- Timeout de requisições
- Debug mode

---

## Atalhos de Teclado

- `Ctrl+K`: Busca rápida
- `Ctrl+R`: Refresh manual
- `Ctrl+1-6`: Navegar páginas
- `Ctrl+D`: Toggle dark mode
- `Esc`: Fechar modals

---

## Responsividade

O dashboard é totalmente responsivo:

- **Desktop** (>1280px): Layout completo
- **Tablet** (768px - 1280px): Sidebar colapsável
- **Mobile** (<768px): Menu hamburger, gráficos simplificados

---

## Solução de Problemas

### Dashboard não carrega

**Verificar**:
```bash
# Backend está rodando?
curl http://localhost:1098/api/poll

# Frontend está rodando?
curl http://localhost:3000
```

### Dados não atualizam

**Soluções**:
1. Verificar console do browser (F12)
2. Confirmar `VITE_API_URL` correto
3. Verificar CORS no backend
4. Refresh forçado (Ctrl+Shift+R)

### Gráficos quebrados

**Soluções**:
1. Limpar cache do browser
2. Verificar versão do Chart.js
3. Reinstalar dependências: `npm install`

### Performance lenta

**Otimizações**:
1. Aumentar intervalo de polling
2. Reduzir janela de métricas
3. Desativar gráficos não utilizados
4. Usar navegador moderno (Chrome, Firefox, Edge)

---

## Desenvolvimento

### Rodar Localmente

```bash
cd dashboard
npm run dev
```

### Build para Produção

```bash
npm run build
npm run preview
```

### Estrutura de Componentes

```
src/
├── components/
│   ├── Sidebar/
│   ├── MetricCard/
│   ├── ServerStatus/
│   ├── ResponseTimeChart/
│   ├── SuccessRateChart/
│   └── RequestLogsTable/
├── pages/
│   ├── ClusterOverview.tsx
│   ├── NodeManagement.tsx
│   ├── LogViewer.tsx
│   ├── MetricsAnalytics.tsx
│   ├── SimulationControls.tsx
│   └── PerformanceTesting.tsx
├── services/
│   ├── api.service.ts
│   └── raft.service.ts
├── hooks/
│   ├── useServerHealth.ts
│   └── useRequestLogs.ts
└── theme/
    └── theme.ts
```

### Adicionar Nova Página

```typescript
// src/pages/NewPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

export const NewPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4">Nova Página</Typography>
      {/* Conteúdo */}
    </Box>
  );
};

// Adicionar rota em App.tsx
<Route path="/new-page" element={<NewPage />} />

// Adicionar link no Sidebar
```

### Adicionar Novo Gráfico

```typescript
import { Line } from 'react-chartjs-2';

const data = {
  labels: timestamps,
  datasets: [{
    label: 'Nova Métrica',
    data: values,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  }]
};

<Line data={data} options={options} />
```

---

## Recursos Futuros

Planejados para próximas versões:

- WebSocket para atualizações push
- Histórico de comandos executados
- Replay de eventos
- Comparação entre nós
- Alertas customizáveis
- Integração com Grafana
- Mobile app nativo