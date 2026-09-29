# InvestVision Monthly — Diretrizes do Projeto & Contexto de IA (`Gemini.md`)

Este arquivo define as diretrizes globais do projeto **InvestVision Monthly**, servindo de contexto para assistentes de IA (como Gemini e Antigravity) e desenvolvedores da equipe.

---

## 📐 Visão Geral da Arquitetura

O **InvestVision Monthly** é uma plataforma de gestão e inteligência patrimonial, rastreamento de rentabilidade composta, diagnósticos de renda variável/fixa, contabilidade cripto e planos de reinvestimento.

- **Core Tech**: React (v18+), TypeScript, Vite
- **Estilização**: TailwindCSS, CSS Variables, Lucide React (Ícones)
- **Estado & Data Fetching**: `@tanstack/react-query` (React Query v5), Hooks Customizados
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Edge Functions)
- **Testes**: Vitest, React Testing Library

---

## 🛠️ Convenções de Código & Boas Práticas

### 1. Single Source of Truth para Cálculos Financeiros
- **Regra de Ouro**: **NENHUM** componente UI ou hook deve calcular retornos ou rentabilidades separadamente.
- Todos os cálculos de rentabilidade, resultado acumulado, lucro e conversões BRL devem obrigatoriamente utilizar o [`PortfolioCalculationService`](file:///src/services/PortfolioCalculationService.ts).
- Valores derivados (como `% de lucro` e `valor em BRL`) nunca são salvos fixos sem suporte da cotação original; a conversão BRL deve sempre respeitar a taxa cambial (`fxRate` ou cotação em tempo real).

### 2. Padrão TypeScript Strict
- Proibido o uso de `any` em novas implementações. Declare interfaces explícitas no módulo correspondente ou em `types.ts`.
- Valide `null` / `undefined` explicitamente com utilitários de segurança (`Number.isFinite`, verificações condicionais).

### 3. Componentes React
- Mantenha os componentes focados e modulares.
- Separe a lógica de dados (custom hooks em `src/hooks/` ou `src/features/`) da renderização visual.
- Nomes de componentes em `PascalCase`, arquivos em `PascalCase.tsx`.

---

## 🚩 Governança de Feature Flags

Feature Flags garantem a liberação segura de novos módulos (ex: *Trilhas de Reinvestimento*, *Radar ETF*, *Agente de Incidentes*):

1. **Definição**: Devem ser centralizadas em `src/config/featureFlags.ts` ou via variáveis de ambiente `VITE_FF_*`.
2. **Escopo de Execução**: Toda nova funcionalidade em estágio experimental deve ser envelopada em condicional de flag.
3. **Rollout Gradual**: Novas features são ativadas em ambiente local/staging antes do deploy final em produção.

---

## 🧪 Estratégia de Testes

- **Testes Unitários**: Criados na pasta `__tests__` ou junto aos serviços (`.test.ts`).
- **Comando de Teste**: `npm run test` (Vitest).
- **Cobertura Mínima**: 100% dos cálculos matemáticos/financeiros em `PortfolioCalculationService` e motores de regras (`intelligentPlanEngine`, `cryptoTaxEngine`) devem possuir testes unitários automatizados.

---

## 🚀 Pipeline de Deploy & CI/CD

- **Harness CI/CD / GitHub Actions**: Pipeline automatizado que executa:
  1. Lint e checagem de tipos (`tsc --noEmit`)
  2. Testes unitários (`vitest run`)
  3. Validação de integridade dos arquivos de documentação (`Gemini.md`)
  4. Build de produção (`vite build`)
- **Deploy**: Realizado automaticamente para ambiente de hospedagem após aprovação no pipeline.

---

## 💡 Workflows Interativos & Slash Commands

Para refinar requisitos técnicos ou resolver ambiguidades de design:
- Utilize o comando **/grill-me** (ou `//grillme`) para iniciar uma entrevista guiada e alinhar decisões antes da implementação.
