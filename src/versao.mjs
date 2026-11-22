#!/usr/bin/env node
// Lança uma nova versão: atualiza src/version.js e acrescenta a linha no "Histórico de atualizações" do README.md.
//   npm run versao -- "O que mudou"             soma 1 ao último número (26.11.29 → 26.11.30)
//   npm run versao -- 26.12.1 "O que mudou"     usa o número informado
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const versionFile = join(root, 'src', 'version.js')
const readmeFile = join(root, 'README.md')
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(1) }

const args = process.argv.slice(2)
const explicit = /^\d+\.\d+\.\d+$/.test(args[0] || '') ? args.shift() : null
const text = args.join(' ').trim()
if (!text) fail('Informe o que mudou.\n  npm run versao -- "O que mudou"\n  npm run versao -- 26.12.1 "O que mudou"')

const src = readFileSync(versionFile, 'utf8')
const found = src.match(/VERSION = '(\d+\.\d+\.\d+)'/)
if (!found) fail('Não achei VERSION em src/version.js')
const atual = found[1]
const [ano, mes, n] = atual.split('.').map(Number)
const nova = explicit || `${ano}.${mes}.${n + 1}`
if (nova === atual) fail(`A versão ${atual} já é a atual.`)

writeFileSync(versionFile, src.replace(found[0], `VERSION = '${nova}'`))

const readme = readFileSync(readmeFile, 'utf8')
const eol = readme.includes('\r\n') ? '\r\n' : '\n'
const heading = /^## .*Histórico de atualizações.*\r?\n/m
if (heading.test(readme)) {
  writeFileSync(readmeFile, readme.replace(heading, (h) => `${h}- [X] \`v${nova}\` ${text}${eol}`))
  console.log(`✔ ${atual} → ${nova} (src/version.js e histórico do README.md)`)
} else {
  console.log(`✔ ${atual} → ${nova} (src/version.js). Não achei o "Histórico de atualizações" no README.md: acrescente a linha à mão.`)
}
