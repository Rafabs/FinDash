import { useLayoutEffect, useRef } from 'react'

const FONTS = ['Arial', 'Calibri', 'Georgia', 'Tahoma', 'Times New Roman', 'Verdana']
const SIZES = ['10px', '12px', '14px', '16px', '18px', '24px', '32px']
const FONT_SIZE_COMMAND = { '10px': '1', '12px': '2', '14px': '3', '16px': '4', '18px': '5', '24px': '6', '32px': '7' }
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'SPAN', 'FONT', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'CODE'])
const FONT_SIZES = { '1': '10px', '2': '12px', '3': '14px', '4': '16px', '5': '18px', '6': '24px', '7': '32px' }
const escapeHtml = (text) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char])

function safeColor(value) {
  const color = String(value || '').trim()
  if (/^#[\da-f]{3,8}$/i.test(color)) return color
  const rgb = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  return rgb && rgb.slice(1).every((part) => Number(part) <= 255) ? `rgb(${rgb.slice(1).join(',')})` : ''
}

export function sanitizeNotesHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html')
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(child.tagName)) {
        child.remove()
        continue
      }
      clean(child)
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...child.childNodes)
        continue
      }
      const style = child.getAttribute('style') || ''
      const family = style.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1]?.replace(/["']/g, '').trim()
      const size = style.match(/(?:^|;)\s*font-size\s*:\s*(\d{1,2}px)/i)?.[1]
      const color = safeColor(style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1])
      const background = safeColor(style.match(/(?:^|;)\s*background-color\s*:\s*([^;]+)/i)?.[1])
      const styles = []
      if (FONTS.includes(family)) styles.push(`font-family:${family}`)
      if (SIZES.includes(size)) styles.push(`font-size:${size}`)
      if (color) styles.push(`color:${color}`)
      if (background) styles.push(`background-color:${background}`)
      if (child.tagName === 'FONT') {
        const face = child.getAttribute('face')
        const fontSize = FONT_SIZES[child.getAttribute('size')]
        const fontColor = safeColor(child.getAttribute('color'))
        if (FONTS.includes(face)) styles.push(`font-family:${face}`)
        if (fontSize) styles.push(`font-size:${fontSize}`)
        if (fontColor) styles.push(`color:${fontColor}`)
        const replacement = doc.createElement('span')
        replacement.innerHTML = child.innerHTML
        if (styles.length) replacement.setAttribute('style', styles.join(';'))
        child.replaceWith(replacement)
        continue
      }
      for (const attr of [...child.attributes]) child.removeAttribute(attr.name)
      if (styles.length) child.setAttribute('style', styles.join(';'))
    }
  }
  clean(doc.body)
  return doc.body.innerHTML
}

function plainTextHtml(text) {
  return escapeHtml(String(text || '')).replace(/\r\n?|\n/g, '<br>')
}

export default function NotesEditor({ text = '', html = '', onChange }) {
  const editor = useRef(null)
  const selection = useRef(null)
  const value = html ? sanitizeNotesHtml(html) : plainTextHtml(text)

  useLayoutEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value
  }, [value])

  const saveSelection = () => {
    const current = window.getSelection()
    if (current?.rangeCount && editor.current?.contains(current.anchorNode)) selection.current = current.getRangeAt(0).cloneRange()
  }

  const restoreSelection = () => {
    const current = window.getSelection()
    if (!selection.current || !editor.current) return
    editor.current.focus()
    current.removeAllRanges()
    current.addRange(selection.current)
  }

  const publish = () => {
    if (!editor.current) return
    const cleaned = sanitizeNotesHtml(editor.current.innerHTML)
    if (cleaned !== editor.current.innerHTML) editor.current.innerHTML = cleaned
    onChange({ html: cleaned, text: editor.current.innerText })
    saveSelection()
  }

  const command = (name, argument = null) => {
    restoreSelection()
    document.execCommand(name, false, argument)
    if (name === 'fontSize') {
      editor.current.querySelectorAll('font[size="7"]').forEach((font) => {
        const span = document.createElement('span')
        span.style.fontSize = argument
        span.innerHTML = font.innerHTML
        font.replaceWith(span)
      })
    }
    publish()
  }

  const button = (label, title, action) => (
    <button type="button" className="sec notes-tool" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={action}>{label}</button>
  )

  return (
    <div className="notes-editor">
      <div className="notes-toolbar" role="toolbar" aria-label="Formatação das notas">
        <label className="notes-control">Fonte
          <select defaultValue="Arial" aria-label="Fonte" onMouseDown={saveSelection} onChange={(event) => command('fontName', event.target.value)}>
            {FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </label>
        <label className="notes-control">Tamanho
          <select defaultValue="16px" aria-label="Tamanho da fonte" onMouseDown={saveSelection} onChange={(event) => command('fontSize', FONT_SIZE_COMMAND[event.target.value])}>
            {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        {button(<b>B</b>, 'Negrito', () => command('bold'))}
        {button(<i>I</i>, 'Itálico', () => command('italic'))}
        {button(<u>U</u>, 'Sublinhado', () => command('underline'))}
        <label className="notes-color" title="Cor do texto">A<input type="color" aria-label="Cor do texto" defaultValue="#1b2033" onMouseDown={saveSelection} onChange={(event) => command('foreColor', event.target.value)} /></label>
        <label className="notes-color notes-highlight" title="Cor de destaque">▰<input type="color" aria-label="Cor de destaque" defaultValue="#fff176" onMouseDown={saveSelection} onChange={(event) => command('hiliteColor', event.target.value)} /></label>
      </div>
      <div
        ref={editor}
        className="notes-content"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Notas pessoais"
        aria-multiline="true"
        data-placeholder="Escreva suas notas aqui..."
        onInput={publish}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={saveSelection}
      />
    </div>
  )
}
