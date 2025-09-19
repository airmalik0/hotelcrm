import { ConfirmModal } from "@/components/ui/ConfirmModal"
import type { ReactNode } from "react"
import { useState, useCallback } from "react"

interface ConfirmOptions {
  title?: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  isLoading: boolean
  resolve?: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    isLoading: false,
    message: "",
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        isLoading: false,
        resolve,
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    state.resolve?.(false)
    setState((prev) => ({ ...prev, isOpen: false, resolve: undefined }))
  }, [state.resolve])

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }))

    // Add small delay to show loading state
    setTimeout(() => {
      state.resolve?.(true)
      setState((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
        resolve: undefined
      }))
    }, 150)
  }, [state.resolve])

  const ConfirmDialog = (
    <ConfirmModal
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      isLoading={state.isLoading}
    />
  )

  return {
    confirm,
    ConfirmDialog,
  }
}