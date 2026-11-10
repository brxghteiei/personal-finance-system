'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  CATEGORIES,
  CURRENCY,
  isCurrencyCode,
  todayDate,
  type Budget,
  type CurrencyCode,
  type Transaction,
  type TransactionType,
  monthKey,
} from '@/lib/finance'

export type FinanceSettings = {
  displayName: string
  currency: CurrencyCode
}

const SETTINGS_STORAGE_KEY = 'ledgerly:settings'
const DEFAULT_SETTINGS: FinanceSettings = { displayName: 'สมชาย ใจดี', currency: CURRENCY }

function isFinanceSettings(value: unknown): value is FinanceSettings {
  if (typeof value !== 'object' || value === null) return false
  const settings = value as Record<string, unknown>
  return typeof settings.displayName === 'string' && isCurrencyCode(settings.currency)
}

type FinanceContextValue = {
  transactions: Transaction[]
  deletedTransactions: DeletedTransaction[]
  budgets: Budget[]
  categories: Record<TransactionType, string[]>
  settings: FinanceSettings
  currency: CurrencyCode
  months: string[]
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  monthTransactions: Transaction[]
  loading: boolean
  error: string | null
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  updateTransaction: (transaction: Transaction) => Promise<void>
  restoreTransaction: (id: string) => Promise<void>
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>
  addCategory: (name: string, type: TransactionType) => Promise<void>
  updateCategory: (currentName: string, type: TransactionType, name: string) => Promise<void>
  removeCategory: (name: string, type: TransactionType) => Promise<void>
  saveSettings: (settings: FinanceSettings) => void
}

type DeletedTransaction = Transaction & { deletedAt: string }

const FinanceContext = createContext<FinanceContextValue | null>(null)
type Props = {
  children: React.ReactNode
  initialTransactions?: Transaction[]
  budgets?: Budget[]
}

export function FinanceProvider({
  children,
  initialTransactions = [],
  budgets: initialBudgets = [],
}: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [deletedTransactions, setDeletedTransactions] = useState<DeletedTransaction[]>([])
  const [budgets, setBudgets] = useState(initialBudgets)
  const [categories, setCategories] = useState<Record<TransactionType, string[]>>({
    income: [...CATEGORIES.income],
    expense: [...CATEGORIES.expense],
  })
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    try {
      const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (!isFinanceSettings(parsed)) throw new Error('รูปแบบการตั้งค่าที่บันทึกไว้ไม่ถูกต้อง')
        setSettings(parsed)
      }
    } catch (cause) {
      if (active) {
        setError(cause instanceof Error ? cause.message : 'โหลดการตั้งค่าไม่สำเร็จ')
      }
    }

    fetch('/api/transactions')
      .then(async (response) => {
        if (!response.ok) throw new Error('โหลดรายการจากฐานข้อมูลไม่สำเร็จ')
        return (await response.json()) as Transaction[]
      })
      .then((data) => {
        if (active) setTransactions(data)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/transactions/deleted')
      .then(async (response) => {
        if (!response.ok) throw new Error('โหลดรายการที่เพิ่งลบไม่สำเร็จ')
        return (await response.json()) as DeletedTransaction[]
      })
      .then((data) => {
        if (active) setDeletedTransactions(data)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'โหลดรายการที่เพิ่งลบไม่สำเร็จ')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/categories')
      .then(async (response) => {
        if (!response.ok) throw new Error('โหลดหมวดหมู่จากฐานข้อมูลไม่สำเร็จ')
        return (await response.json()) as Record<TransactionType, string[]>
      })
      .then((data) => {
        if (active) setCategories(data)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'โหลดหมวดหมู่ไม่สำเร็จ')
      })
    return () => {
      active = false
    }
  }, [])

  const months = useMemo(() => {
    const keys = [...new Set(transactions.map((t) => monthKey(t.date)))].sort().reverse()
    return keys.length > 0 ? keys : [monthKey(todayDate())]
  }, [transactions])

  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(todayDate()))

  useEffect(() => {
    let active = true
    fetch('/api/budgets')
      .then(async (response) => {
        if (!response.ok) throw new Error('โหลดงบประมาณจากฐานข้อมูลไม่สำเร็จ')
        return (await response.json()) as Budget[]
      })
      .then((data) => {
        if (active) setBudgets(data)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'โหลดงบประมาณไม่สำเร็จ')
      })
    return () => {
      active = false
    }
  }, [])

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === selectedMonth),
    [transactions, selectedMonth],
  )

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    setError(null)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'บันทึกรายการไม่สำเร็จ')
      }
      const saved = (await response.json()) as Transaction
      setTransactions((previous) =>
        [saved, ...previous].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
      )
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'บันทึกรายการไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [])

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    setError(null)
    try {
      const response = await fetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'แก้ไขรายการไม่สำเร็จ')
      }
      const saved = (await response.json()) as Transaction
      setTransactions((previous) =>
        previous.map((item) => item.id === saved.id ? saved : item).sort(
          (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
        ),
      )
      setDeletedTransactions((previous) =>
        previous.map((item) => item.id === saved.id ? { ...item, ...saved } : item),
      )
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'แก้ไขรายการไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    setError(null)
    try {
      const removed = transactions.find((transaction) => transaction.id === id)
      const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'ลบรายการไม่สำเร็จ')
      }
      const result = (await response.json()) as { deletedAt: string }
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      if (removed) {
        setDeletedTransactions((previous) => [
          { ...removed, deletedAt: result.deletedAt },
          ...previous.filter((transaction) => transaction.id !== id),
        ])
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ลบรายการไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [transactions])

  const restoreTransaction = useCallback(async (id: string) => {
    setError(null)
    try {
      const restored = deletedTransactions.find((transaction) => transaction.id === id)
      if (!restored) throw new Error('ไม่พบข้อมูลรายการที่ต้องการกู้คืน')
      const response = await fetch(`/api/transactions/${encodeURIComponent(id)}/restore`, { method: 'POST' })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'กู้คืนรายการไม่สำเร็จ')
      }
      const transaction: Transaction = {
        id: restored.id,
        description: restored.description,
        amount: restored.amount,
        date: restored.date,
        time: restored.time,
        category: restored.category,
        type: restored.type,
      }
      setDeletedTransactions((previous) => previous.filter((item) => item.id !== id))
      setTransactions((previous) =>
        [transaction, ...previous].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
      )
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'กู้คืนรายการไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [deletedTransactions])

  const addBudget = useCallback(async (budget: Omit<Budget, 'id'>) => {
    setError(null)
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'บันทึกงบประมาณไม่สำเร็จ')
      }
      const saved = (await response.json()) as Budget
      setBudgets((previous) => [
        ...previous.filter((item) => item.category !== saved.category || item.month !== saved.month),
        saved,
      ])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'บันทึกงบประมาณไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [])

  const addCategory = useCallback(async (name: string, type: TransactionType) => {
    setError(null)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'บันทึกหมวดหมู่ไม่สำเร็จ')
      }
      const saved = (await response.json()) as { name: string; type: TransactionType }
      setCategories((previous) => ({
        ...previous,
        [saved.type]: previous[saved.type].includes(saved.name)
          ? previous[saved.type]
          : [...previous[saved.type], saved.name],
      }))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'บันทึกหมวดหมู่ไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [])

  const updateCategory = useCallback(async (currentName: string, type: TransactionType, name: string) => {
    setError(null)
    try {
      const response = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentName, currentType: type, name }),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'แก้ไขหมวดหมู่ไม่สำเร็จ')
      }
      const saved = (await response.json()) as { name: string; type: TransactionType }
      setCategories((previous) => ({
        ...previous,
        [type]: previous[type].map((category) => category === currentName ? saved.name : category),
      }))
      setTransactions((previous) =>
        previous.map((transaction) =>
          transaction.type === type && transaction.category === currentName
            ? { ...transaction, category: saved.name }
            : transaction,
        ),
      )
      setDeletedTransactions((previous) =>
        previous.map((transaction) =>
          transaction.type === type && transaction.category === currentName
            ? { ...transaction, category: saved.name }
            : transaction,
        ),
      )
      setBudgets((previous) =>
        previous.map((budget) => budget.category === currentName ? { ...budget, category: saved.name } : budget),
      )
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'แก้ไขหมวดหมู่ไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [])

  const removeCategory = useCallback(async (name: string, type: TransactionType) => {
    setError(null)
    try {
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error ?? 'ลบหมวดหมู่ไม่สำเร็จ')
      }
      setCategories((previous) => ({
        ...previous,
        [type]: previous[type].filter((category) => category !== name),
      }))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ลบหมวดหมู่ไม่สำเร็จ'
      setError(message)
      throw cause
    }
  }, [])

  const saveSettings = useCallback((nextSettings: FinanceSettings) => {
    const normalized = { ...nextSettings, displayName: nextSettings.displayName.trim() }
    if (!normalized.displayName) throw new Error('กรุณาระบุชื่อที่แสดง')

    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
      setSettings(normalized)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'บันทึกการตั้งค่าไม่สำเร็จ'
      throw new Error(message, { cause })
    }
  }, [])

  const value = useMemo(
    () => ({
      transactions,
      deletedTransactions,
      budgets,
      categories,
      settings,
      currency: settings.currency,
      months,
      selectedMonth,
      setSelectedMonth,
      monthTransactions,
      loading,
      error,
      addTransaction,
      removeTransaction,
      updateTransaction,
      restoreTransaction,
      addBudget,
      addCategory,
      updateCategory,
      removeCategory,
      saveSettings,
    }),
    [
      transactions,
      deletedTransactions,
      budgets,
      categories,
      settings,
      months,
      selectedMonth,
      setSelectedMonth,
      monthTransactions,
      loading,
      error,
      addTransaction,
      removeTransaction,
      updateTransaction,
      restoreTransaction,
      addBudget,
      addCategory,
      updateCategory,
      removeCategory,
      saveSettings,
    ],
  )

  return (
    <FinanceContext.Provider value={value}>
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-7xl rounded-lg border border-expense/30 bg-expense/10 px-4 py-3 text-sm text-expense">
          {error}
        </p>
      )}
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside <FinanceProvider>')
  return ctx
}
