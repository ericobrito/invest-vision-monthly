# Business Features Architecture (`src/features/Gemini.md`)

Este arquivo especifica a finalidade e padrões dos módulos de regras de negócios da aplicação.

---

## 🎯 Estrutura de Módulos (`src/features/`)

Cada subpasta em `features/` representa um domínio funcional independente:

1. **`intelligentPlan/`**: Motor do Plano Inteligente (`intelligentPlanEngine.ts`), simulador de cenários de drawdown e gerenciamento de trilhas de reinvestimento (`CapitalChainTracker`).
2. **`cryptoAccounting/`**: Motor de apuração de impostos cripto (`cryptoTaxEngine.ts`), consolidação mensal de alienações e isenção de R$ 35.000/mês.
3. **`etfRadar/`**: Motor de pontuação de ETFs (`etfScoreEngine.ts`), backtest de carteiras e integração de cotações em tempo real.
4. **`variableAssets/`**: Sincronizador de corretoras (Binance, Bybit, Coinbase, Avenue, Mercado Bitcoin/Pluggy) e posições variáveis.

---

## 📌 Regras de Modarização

- **Isolamento de Lógica**: Lógicas puras de cálculo matemático/financeiro devem ser exportadas como classes ou funções puras determinísticas e testáveis.
- **Não Mutabilidade**: Nunca mutar estruturas globais ou instâncias de estado diretamente.
- **Tipagem Explicita**: Cada feature deve manter um arquivo `types.ts` com suas interfaces e enums.
