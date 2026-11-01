import { useEffect, useState } from 'react'

// Banco de logos: public/logos/index.json + arquivos na mesma pasta.
// No XLSX a coluna LOGO guarda "banco:<id>" (ou uma imagem própria em data URL).
const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './'
export const LOGO_PREFIX = 'banco:'

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
let cache = null
const empty = { logos: [], byId: {} }
export function loadLogoBank() {
  cache ||= fetch(`${BASE}logos/index.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sem índice'))))
    .then((j) => {
      const logos = (j.logos || []).filter((l) => l?.id && l?.arquivo).map((l) => ({ ...l, nome: l.nome || l.id, apelidos: l.apelidos || [], src: `${BASE}logos/${l.arquivo}` }))
      return { logos, byId: Object.fromEntries(logos.map((l) => [l.id, l])) }
    })
    .catch(() => empty)
  return cache
}
export function useLogoBank() {
  const [bank, setBank] = useState(empty)
  useEffect(() => { let on = true; loadLogoBank().then((b) => on && setBank(b)); return () => { on = false } }, [])
  return bank
}
// referência salva (banco:id ou data URL) -> endereço da imagem ('' se o logo do banco não existir mais)
export const resolveLogo = (logo, bank) => !logo ? '' : String(logo).startsWith(LOGO_PREFIX) ? (bank.byId[String(logo).slice(LOGO_PREFIX.length)]?.src || '') : logo
// sugere um logo do banco pelo nome da conta (palavra inteira; vence o apelido mais longo)
export function suggestLogo(name, bank) {
  const n = ` ${norm(name)} `
  let best = null, len = 0
  bank.logos.forEach((l) => [l.nome, l.id.replace(/-/g, ' '), ...l.apelidos].forEach((a) => {
    const k = norm(a)
    if (k && k.length > len && n.includes(` ${k} `)) { best = l; len = k.length }
  }))
  return best
}
