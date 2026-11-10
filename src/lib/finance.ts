export type TransactionType = 'income' | 'expense'
export const SUPPORTED_CURRENCIES = ['THB', 'USD', 'EUR', 'GBP'] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && SUPPORTED_CURRENCIES.some((currency) => currency === value)
}

export const CATEGORIES = {
  income: ['เงินเดือน', 'งานฟรีแลนซ์', 'ดอกเบี้ย', 'รายได้อื่น ๆ'],
  expense: ['ซื้อของเข้าบ้าน', 'อาหารนอกบ้าน', 'เดินทาง', 'ช้อปปิ้ง', 'บันเทิง', 'ค่าสาธารณูปโภค', 'สุขภาพ', 'ที่อยู่อาศัย'],
} as const

export type Transaction = {
  id: string
  date: string
  time: string
  description: string
  category: string
  type: TransactionType
  amount: number
}

export type Budget = {
  id: string
  category: string
  limit: number
  month: string
}

// Locale / currency / calendar live here so the whole app formats consistently.
// 'gregory' keeps years as 2026. Use 'th-TH' (no -u-ca-gregory) for the Buddhist-era year 2569.
export const LOCALE = 'th-TH-u-ca-gregory'
export const CURRENCY: CurrencyCode = 'THB'

const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>()
const compactFormatters = new Map<CurrencyCode, Intl.NumberFormat>()
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatCurrency(value: number, currencyCode: CurrencyCode = CURRENCY) {
  let formatter = currencyFormatters.get(currencyCode)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: currencyCode })
    currencyFormatters.set(currencyCode, formatter)
  }
  return formatter.format(value)
}

export function formatCompact(value: number, currencyCode: CurrencyCode = CURRENCY) {
  let formatter = compactFormatters.get(currencyCode)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    })
    compactFormatters.set(currencyCode, formatter)
  }
  return formatter.format(value)
}
export const todayDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export const currentTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
/** '2026-11-05' -> '5 พ.ย.' */
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso))
/** '2026-11-05' -> '5 พ.ย. 2026' */
export const formatFullDate = (iso: string) => fullDate.format(new Date(iso))

export const monthKey = (date: string) => date.slice(0, 7)

export function monthLabel(key: string, style: 'short' | 'long' = 'short') {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE, {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

export function totals(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

export function monthlySeries(transactions: Transaction[]) {
  const map = new Map<string, { income: number; expense: number }>()
  for (const t of transactions) {
    const key = monthKey(t.date)
    const entry = map.get(key) ?? { income: 0, expense: 0 }
    entry[t.type] += t.amount
    map.set(key, entry)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, month: monthLabel(key), ...v, net: v.income - v.expense }))
}

export function spendingByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
}
