'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'

export const START_GUIDE_EVENT = 'finance:start-guided-tour'

const GUIDE_COMPLETED_KEY = 'finance-guide-completed-v1'

const STEPS = [
  {
    path: '/',
    selector: '[data-tour="add-transaction"]',
    title: 'เริ่มจากเพิ่มรายการ',
    description: 'กด “เพิ่มรายการ” เพื่อบันทึกรายรับหรือรายจ่าย ระบุจำนวนเงิน วันที่ และหมวดหมู่ แล้วบันทึกได้เลย',
  },
  {
    path: '/categories',
    selector: '[data-tour="create-category"]',
    title: 'จัดหมวดหมู่ให้ตรงกับการใช้งาน',
    description: 'เพิ่มหมวดหมู่รายรับหรือรายจ่ายของคุณเองได้ เพื่อให้ค้นหาและสรุปข้อมูลได้สะดวกขึ้น',
  },
  {
    path: '/budgets',
    selector: '[data-tour="create-budget"]',
    title: 'ตั้งงบประมาณรายเดือน',
    description: 'กำหนดวงเงินให้แต่ละหมวดหมู่ แล้วติดตามยอดใช้จ่ายเทียบกับงบของเดือนนี้',
  },
  {
    path: '/reports',
    selector: '[data-tour="report-summary"]',
    title: 'ดูภาพรวมในรายงาน',
    description: 'ตรวจสอบรายรับ รายจ่าย อัตราการออม และยอดใช้จ่ายแยกตามหมวดหมู่ หรือส่งออกรายงานเป็น CSV',
  },
] as const

type Spotlight = {
  top: number
  left: number
  width: number
  height: number
  viewportWidth: number
  viewportHeight: number
}

export function GuidedTour() {
  const pathname = usePathname()
  const router = useRouter()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const autoStartChecked = useRef(false)
  const step = STEPS[stepIndex]

  function finishTour() {
    localStorage.setItem(GUIDE_COMPLETED_KEY, 'true')
    setActive(false)
    setSpotlight(null)
  }

  useEffect(() => {
    const startTour = () => {
      setStepIndex(0)
      setActive(true)
      if (window.location.pathname !== '/') router.push('/')
    }

    window.addEventListener(START_GUIDE_EVENT, startTour)
    return () => window.removeEventListener(START_GUIDE_EVENT, startTour)
  }, [router])

  useEffect(() => {
    if (autoStartChecked.current) return
    autoStartChecked.current = true
    if (pathname === '/' && localStorage.getItem(GUIDE_COMPLETED_KEY) !== 'true') {
      setActive(true)
    }
  }, [pathname])

  useEffect(() => {
    if (!active) return
    if (pathname !== step.path) {
      setSpotlight(null)
      router.push(step.path)
      return
    }

    let hasScrolledToTarget = false
    const updateSpotlight = () => {
      const target = document.querySelector<HTMLElement>(step.selector)
      if (!target) return

      if (!hasScrolledToTarget) {
        hasScrolledToTarget = true
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }

      const bounds = target.getBoundingClientRect()
      const nextSpotlight = {
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }
      setSpotlight((current) =>
        current &&
        current.top === nextSpotlight.top &&
        current.left === nextSpotlight.left &&
        current.width === nextSpotlight.width &&
        current.height === nextSpotlight.height &&
        current.viewportWidth === nextSpotlight.viewportWidth &&
        current.viewportHeight === nextSpotlight.viewportHeight
          ? current
          : nextSpotlight,
      )
    }

    const observer = new MutationObserver(updateSpotlight)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)
    updateSpotlight()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [active, pathname, router, step])

  useEffect(() => {
    if (!active) return

    dialogRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finishTour()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active])

  if (!active || !spotlight) return null

  const right = spotlight.left + spotlight.width
  const bottom = spotlight.top + spotlight.height
  const cardWidth = Math.min(360, spotlight.viewportWidth - 32)
  const cardLeft = Math.min(
    Math.max(spotlight.left + spotlight.width / 2 - cardWidth / 2, 16),
    spotlight.viewportWidth - cardWidth - 16,
  )
  const belowTop = bottom + 20
  const cardTop =
    belowTop + 200 <= spotlight.viewportHeight
      ? belowTop
      : Math.max(16, spotlight.top - 200)

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed z-[80] bg-black/65"
        style={{ inset: 0, clipPath: `polygon(0 0, 100% 0, 100% ${spotlight.top}px, 0 ${spotlight.top}px)` }}
      />
      <div
        aria-hidden="true"
        className="fixed z-[80] bg-black/65"
        style={{
          top: spotlight.top,
          left: 0,
          width: Math.max(0, spotlight.left),
          height: spotlight.height,
        }}
      />
      <div
        aria-hidden="true"
        className="fixed z-[80] bg-black/65"
        style={{
          top: spotlight.top,
          left: right,
          width: Math.max(0, spotlight.viewportWidth - right),
          height: spotlight.height,
        }}
      />
      <div
        aria-hidden="true"
        className="fixed z-[80] bg-black/65"
        style={{
          top: bottom,
          left: 0,
          width: spotlight.viewportWidth,
          height: Math.max(0, spotlight.viewportHeight - bottom),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[81] rounded-lg ring-4 ring-primary shadow-[0_0_0_2px_var(--background)]"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[82] flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg"
        style={{
          top: Math.max(spotlight.top - 18, 8),
          left: Math.min(Math.max(spotlight.left - 18, 8), spotlight.viewportWidth - 44),
        }}
      >
        {stepIndex + 1}
      </div>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-description"
        tabIndex={-1}
        className="fixed z-[83] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none"
        style={{ top: cardTop, left: cardLeft, width: cardWidth, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">ขั้นตอนที่ {stepIndex + 1} จาก {STEPS.length}</p>
          <button
            type="button"
            onClick={finishTour}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="ปิดคู่มือ"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <h2 id="guided-tour-title" className="font-semibold">{step.title}</h2>
        <p id="guided-tour-description" className="mt-2 text-sm leading-6 text-muted-foreground">
          {step.description}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:invisible"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            ย้อนกลับ
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={finishTour}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              ข้ามคู่มือ
            </button>
            <button
              type="button"
              onClick={() => {
                if (stepIndex === STEPS.length - 1) finishTour()
                else setStepIndex((current) => current + 1)
              }}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {stepIndex === STEPS.length - 1 ? 'เสร็จสิ้น' : 'ถัดไป'}
              {stepIndex < STEPS.length - 1 && <ArrowRight aria-hidden="true" className="size-4" />}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
