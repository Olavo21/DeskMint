---
tipo: feature
estado: feita
versao: 1.4.1
criado: 2026-08-06
---
# Importação XTB (XLSX)

## Objetivo
Importar as posições abertas de um export XTB para o portfólio.

## Comportamento esperado
- Deteta a folha certa pelo conteúdo (col[3] = STOCK|ETF, col[4] vazia), não pelo nome — funciona em PT e EN
- Passo de pré-visualização antes de escrever na BD

## Notas técnicas
- Ficheiros: `lib/xtbParser.ts`, `components/investments/XtbImportModal.tsx`, `components/investments/BrokerModal.tsx`
- `import * as XLSX from 'xlsx'` (o default import é `undefined` no bundle web)
- Leitura com `new ExpoFile(uri).arrayBuffer()` (nativo) / `asset.file.arrayBuffer()` (web)

## Ligações
- [[04-Bugs/xlsx-cves]]
- [[05-Releases/v1.4.0]]
