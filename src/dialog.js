// Janelas de confirmação e aviso do próprio app (no lugar de confirm() e alert() do navegador).
// Uso:  if (!(await confirmDialog({ title, message, detail, confirmLabel, danger: true }))) return
//       alertDialog({ title, message })
// O <DialogHost /> (montado uma vez no App) desenha as janelas; sem ele, cai no confirm()/alert() nativos.
let host = null
export const registerDialogHost = (fn) => { host = fn; return () => { if (host === fn) host = null } }

const open = (kind, options) => new Promise((resolve) => {
  const o = typeof options === 'string' ? { message: options } : (options || {})
  if (host) return host({ ...o, kind, resolve })
  if (kind === 'confirm') resolve(window.confirm([o.message, o.detail].filter(Boolean).join('\n')))
  else { window.alert([o.message, o.detail].filter(Boolean).join('\n')); resolve(true) }
})
export const confirmDialog = (options) => open('confirm', options)
export const alertDialog = (options) => open('alert', options)
