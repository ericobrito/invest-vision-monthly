# Supabase & Backend Architecture (`supabase/Gemini.md`)

Este arquivo especifica as diretrizes da camada de banco de dados e funções serverless do Supabase.

---

## 🗄️ Estrutura de Banco de Dados

- **`monthly_snapshots`**: Registro consolidado mensal do patrimônio total, variação, alocação em Renda Fixa/Variável e Brasil/Exterior.
- **`investments`**: Investimentos associados a um snapshot mensal (com suporte aos modos `CONSOLIDATED`, `DETAILED`, `CONNECTED`).
- **`investment_positions`**: Posições detalhadas por ativo (ex: `TSLA`, `META`, `USDT`, `BTC`, `ETH`) contendo quantidade, preço médio, preço atual e valores normalizados em BRL (`current_value_brl`).
- **`va_connections` & `va_positions`**: Integração com conectores de API externa e agregadores de custódia.

---

## ⚡ Edge Functions (`supabase/functions/`)

1. **`variable-assets`**: Função de sincronização com corretoras cripto e Open Finance.
2. **`asset-quote`**: Proxy e resolvedor de cotações em tempo real (AwesomeAPI, Yahoo Finance, Binance).

---

## 🔐 Segurança & Row Level Security (RLS)

- Todas as tabelas possuem políticas de RLS ativas para garantir o isolamento de dados por usuário autênticado (`auth.uid()`).
- Chaves de API de conexões são armazenadas na tabela encriptada `va_credentials`.
