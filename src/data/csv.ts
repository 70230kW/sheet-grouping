/** タブ区切り / カンマ区切りのテキストを 2 次元配列に変換（引用符対応） */
export function parseDelimited(text: string): string[][] {
  const trimmed = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  if (!trimmed.trim()) return []
  const firstLine = trimmed.split('\n')[0]
  const delimiter = firstLine.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i]
    if (inQuotes) {
      if (c === '"') {
        if (trimmed[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  row.push(field)
  rows.push(row)
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}
