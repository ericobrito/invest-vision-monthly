# Notificações Automáticas & Processo de Review (`docs/review-process.md`)

---
status: APPROVED
author: Equipe de Engenharia
last_updated: 2026-09-29
---

## 🔔 Integração de Notificações Automáticas

Para manter a transparência e velocidade nas revisões do projeto, foram configuradas integrações automáticas por webhook:

1. **Pull Requests & Code Reviews**: Notificações instantâneas enviadas via Webhook para Slack/Discord quando:
   - Um novo PR é aberto para revisão.
   - Comentários inline são adicionados em arquivos de código ou em diretrizes `Gemini.md`.
   - O pipeline do Harness finaliza os testes e validações.

2. **Alertas de Incidentes e Falhas**: Notificações prioritárias acionadas caso o build de produção ou testes de sincronização de conectores falhem.

---

## 💬 Convenções de Comentários Inline no Code Review

Durante a revisão de PRs (humana ou guiada por assistentes de IA), os comentários inline seguem o padrão **Conventional Comments**:

- `suggestion:` Sugestão de melhoria ou refatoração visual/código.
- `issue:` Problema que precisa ser resolvido antes do merge (ex: cálculo fora do `PortfolioCalculationService`).
- `question:` Dúvida técnica sobre a implementação ou decisão de design.
- `praise:` Elogio a uma solução limpa ou bem documentada.

---

## 🤖 Papel dos Assistentes de IA no Review

Assistentes como Gemini e Antigravity analisam os arquivos `Gemini.md` de cada diretório e verificam se:
- Os contratos e interfaces TypeScript foram respeitados.
- As regras de cálculo financeiro em BRL usam o `PortfolioCalculationService`.
- A inclusão de USDT/Stablecoins foi preservada nos totais de investimentos.
