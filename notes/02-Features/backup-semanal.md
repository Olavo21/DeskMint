---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-09-12
---
# Backup semanal

## Objetivo
Ter uma cópia local de todas as tabelas `dm_*`.

## Comportamento esperado
- `npm run db:export` exporta todas as tabelas `dm_*` para ficheiro local
- Agendado no Task Scheduler do Windows

## Notas técnicas
- Os ficheiros exportados têm dados pessoais: nunca os commitar

## Ligações
- [[05-Releases/v1.6.0]]
