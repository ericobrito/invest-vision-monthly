# Documentação Técnica & Governança (`docs/Gemini.md`)

Este arquivo especifica as diretrizes de gerenciamento da documentação técnica e rastreamento do ciclo de vida dos documentos no repositório.

---

## 📄 Ciclo de Vida dos Documentos

Toda documentação técnica mantida na pasta `docs/` deve obrigatoriamente possuir um status de maturidade explicitado no cabeçalho (frontmatter):

- `DRAFT`: Rascunho em elaboração técnica.
- `REVIEW`: Em processo de revisão por pares ou feedback automatizado.
- `APPROVED`: Documento aprovado e vigente como especificação oficial.
- `DEPRECATED`: Documento obsoleto ou substituído.

---

## 🛠️ Automação com Harness CI/CD

O pipeline do Harness CI/CD monitora alterações na documentação e valida automaticamente:
1. Sintaxe Markdown e links quebrados.
2. Atualização dos cabeçalhos de rastreabilidade.
3. Notificações automáticas no Slack/Discord e no PR do GitHub quando um documento muda de status.

Para detalhes de configuração, consulte [`docs/pipeline.md`](file:///docs/pipeline.md).
