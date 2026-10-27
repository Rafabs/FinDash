export const CDI_CACHE_KEY = 'fynn-cdi-last'
export const SELIC_CACHE_KEY = 'fynn-selic-last'
const CDI_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'
const SELIC_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'

export function readCachedCdi() {
  return readCachedQuote(CDI_CACHE_KEY)
}
export function readCachedSelic() {
  return readCachedQuote(SELIC_CACHE_KEY)
}

function readCachedQuote(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key))
    return cached && Number.isFinite(cached.value) && cached.date ? cached : null
  } catch { return null }
}

export async function fetchLatestCdi(signal) {
  return fetchLatestQuote(CDI_URL, signal)
}

export async function fetchLatestSelic(signal) {
  return fetchLatestQuote(SELIC_URL, signal)
}

async function fetchLatestQuote(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('Falha ao consultar o Banco Central')
  const rows = await response.json()
  const latest = rows?.[0]
  const value = Number(latest?.valor)
  if (!latest?.data || !Number.isFinite(value)) throw new Error('Resposta inválida do Banco Central')
  return { value, date: latest.data }
}
