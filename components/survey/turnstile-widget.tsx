"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
        },
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
}

/**
 * Widget de Cloudflare Turnstile.
 * Degradación elegante: si no hay NEXT_PUBLIC_TURNSTILE_SITE_KEY configurada,
 * no renderiza nada (la encuesta sigue funcionando y el servidor no exige token).
 */
export function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onExpire?.(),
        theme: "auto",
      })
    }

    if (window.turnstile) {
      renderWidget()
      return
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement("script")
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener("load", renderWidget)

    return () => {
      cancelled = true
      script?.removeEventListener("load", renderWidget)
    }
  }, [siteKey, onVerify, onExpire])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}
