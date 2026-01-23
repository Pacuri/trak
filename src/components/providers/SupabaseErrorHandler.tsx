'use client'

import { useEffect } from 'react'

/**
 * Suppresses Supabase GoTrueClient AbortError warnings.
 * These happen during normal React lifecycle when components unmount
 * while auth operations are in progress. They're harmless but noisy.
 */
export function SupabaseErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalError = console.error
    const originalWarn = console.warn

    console.error = (...args: unknown[]) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        (message.includes('AbortError') || message.includes('operation was aborted'))
      ) {
        return // Suppress AbortError logs
      }
      originalError.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        (message.includes('AbortError') || message.includes('operation was aborted'))
      ) {
        return // Suppress AbortError logs
      }
      originalWarn.apply(console, args)
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError' ||
          event.reason?.message?.includes('aborted')) {
        event.preventDefault() // Prevent the error from showing
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      console.error = originalError
      console.warn = originalWarn
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return <>{children}</>
}
