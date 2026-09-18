import type { SheetsSettings } from '../types'

/**
 * Google Sheets 読み込み。
 *
 * - oauth : Google Identity Services (GIS) のトークンクライアントでブラウザ内 OAuth。
 *           scope は spreadsheets.readonly のみ。サーバー不要・秘密情報を保持しない。
 * - apikey: API キーのみ。シートが「リンクを知っている全員が閲覧可」の場合に限り利用可能。
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
  callback: (resp: TokenResponse) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: TokenResponse) => void
            error_callback?: (err: { type: string; message?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

let gisLoading: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoading) return gisLoading
  gisLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google Identity Services の読み込みに失敗しました'))
    document.head.appendChild(s)
  })
  return gisLoading
}

let cachedToken: { token: string; expiresAt: number; clientId: string } | null = null

export async function getAccessToken(clientId: string): Promise<string> {
  if (!clientId) throw new Error('OAuth クライアント ID が設定されていません')
  if (cachedToken && cachedToken.clientId === clientId && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }
  await loadGis()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google Identity Services が利用できません')
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error_description ?? resp.error ?? '認証に失敗しました'))
          return
        }
        // GIS のトークンは通常 1 時間有効。安全側で 50 分キャッシュ
        cachedToken = { token: resp.access_token, expiresAt: Date.now() + 50 * 60 * 1000, clientId }
        resolve(resp.access_token)
      },
      error_callback: (err) => reject(new Error(err.message ?? `認証エラー: ${err.type}`)),
    })
    client.requestAccessToken()
  })
}

export function clearToken() {
  cachedToken = null
}

/** URL でも ID でも受け付ける */
export function extractSpreadsheetId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return m ? m[1] : input.trim()
}

interface ValuesResponse {
  values?: string[][]
  error?: { message?: string }
}

export async function fetchSheetValues(settings: SheetsSettings): Promise<string[][]> {
  const id = extractSpreadsheetId(settings.spreadsheetId)
  if (!id) throw new Error('スプレッドシート ID が設定されていません')
  const range = settings.sheetName ? encodeURIComponent(settings.sheetName) : 'A:Z'
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?majorDimension=ROWS`
  const headers: Record<string, string> = {}
  if (settings.authMode === 'apikey') {
    if (!settings.apiKey) throw new Error('API キーが設定されていません')
    url += `&key=${encodeURIComponent(settings.apiKey)}`
  } else {
    headers.Authorization = `Bearer ${await getAccessToken(settings.clientId)}`
  }
  const res = await fetch(url, { headers })
  const json = (await res.json()) as ValuesResponse
  if (!res.ok) {
    if (res.status === 401) clearToken()
    throw new Error(json.error?.message ?? `HTTP ${res.status}`)
  }
  return json.values ?? []
}
