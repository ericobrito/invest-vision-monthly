# Front-End & UI Guidelines (`src/Gemini.md`)

Este arquivo especifica a finalidade, padrão visual e convenções dos componentes da camada de apresentação (Front-End).

---

## 🎯 Finalidade da Pasta `src/`
Contém todo o código-fonte da aplicação web React: páginas (`pages/`), componentes visuais (`components/`), hooks customizados (`hooks/`), contextos, utilitários (`lib/`, `utils/`) e módulos de inteligência (`features/`).

---

## 🎨 Design System & Estilização

1. **Vanilla CSS + TailwindCSS**:
   - As variáveis do tema (cores HSL, bordas, sombras) são gerenciadas em `src/index.css`.
   - Utilize classes utilitárias do TailwindCSS alinhadas às variáveis de tema (`bg-card`, `text-foreground`, `border-border`, `text-primary`, `bg-primary/10`).
   - Mantenha suporte total a **Dark Mode** e **Light Mode**.

2. **Tipografia & Estética Rich**:
   - Fontes limpas e modernas (Inter/Outfit).
   - Uso de `font-mono` para valores numéricos, moedas (`R$`, `US$`) e porcentagens.
   - Badges coloridas com significado semântico (🟢 Verde: Dentro da Estratégia, 🟡 Amarelo: Atenção, 🔴 Vermelho: Regra Acionada).

3. **Responsividade & Acessibilidade**:
   - Layouts devem ser responsivos para telas móbiles, tablets e desktops (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
   - Elementos interativos devem conter atributos acessíveis e estados visuais claros (`hover:`, `focus-visible:`).

---

## 🔄 Gerenciamento de Estado

- **React Query**: Usado para sincronização com Supabase e APIs externas (Cotações, Câmbio).
- **Estado Local**: Utilize `useState` / `useMemo` para filtros, ordenação de tabelas e diálogos modais.
