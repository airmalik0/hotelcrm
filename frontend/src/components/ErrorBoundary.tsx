import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo)

    // Here you could send error reports to your error tracking service
    // For example, Sentry:
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-dark-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-8 text-center">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              We're sorry, but something unexpected happened. The page has been
              automatically reloaded to fix the issue.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg py-2 px-4 inline-flex transition bg-primary-600 text-white hover:bg-primary-700 font-medium"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 font-medium"
              >
                Go Back
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 p-4 bg-danger-50 dark:bg-danger-600/30 rounded-lg text-left">
                <summary className="font-medium text-danger-700 dark:text-danger-400 cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-danger-600 dark:text-danger-300 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
