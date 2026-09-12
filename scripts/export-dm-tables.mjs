#!/usr/bin/env node
/**
 * Exporta todas as tabelas dm_* da base de dados Supabase para ficheiros JSON locais.
 * Liga diretamente à Postgres (DIRECT_URL/DATABASE_URL), ignorando RLS, para obter um
 * backup completo — não usa a anon key.
 *
 * Uso: node scripts/export-dm-tables.mjs
 */
import { Client } from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

loadEnvFile(path.join(rootDir, '.env.local'))

// DATABASE_URL (pooler) primeiro: o host de DIRECT_URL é IPv6-only e pode não
// resolver em redes/máquinas sem conectividade IPv6.
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL
if (!connectionString) {
  console.error('Falta DIRECT_URL ou DATABASE_URL em .env.local')
  process.exit(1)
}

const OUTPUT_ROOT = path.join(rootDir, 'backups', 'dm-export')

async function main() {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name LIKE 'dm\\_%' ESCAPE '\\'
      ORDER BY table_name
    `)

    if (tables.length === 0) {
      console.warn('Nenhuma tabela dm_* encontrada.')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outDir = path.join(OUTPUT_ROOT, timestamp)
    fs.mkdirSync(outDir, { recursive: true })

    const manifest = { exportedAt: new Date().toISOString(), tables: {} }

    for (const { table_name } of tables) {
      const { rows } = await client.query(`SELECT * FROM public."${table_name}"`)
      fs.writeFileSync(path.join(outDir, `${table_name}.json`), JSON.stringify(rows, null, 2), 'utf8')
      manifest.tables[table_name] = rows.length
      console.log(`OK ${table_name}: ${rows.length} linhas`)
    }

    fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'latest.txt'), timestamp, 'utf8')

    console.log(`\nExportacao concluida em: ${outDir}`)
  } finally {
    await client.end()
  }
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

main().catch((err) => {
  console.error('Erro na exportacao:', err)
  process.exit(1)
})
