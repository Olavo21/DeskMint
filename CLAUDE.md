@AGENTS.md

## Notas do projeto (Obsidian)

A pasta `notes/` é um vault do Obsidian com ideias, specs, decisões, bugs e releases do DeskMint.

- Antes de implementar uma feature, procura a spec em `notes/02-Features/` e segue-a.
- Antes de decisões de arquitetura, consulta `notes/03-Decisoes/` para não contradizer decisões anteriores.
- Quando terminares uma feature: atualiza `estado: feita` na spec e acrescenta-a à nota da release em `notes/05-Releases/`.
- Quando tomarmos uma decisão técnica relevante, cria uma nota em `notes/03-Decisoes/` usando `notes/_templates/decisao.md`.
- Usa links `[[Nome da nota]]` entre notas relacionadas. Nomes de ficheiro em português, sem acentos problemáticos.
- Não edites `notes/.obsidian/`.
