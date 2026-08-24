import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
          <p className="font-heading text-3xl font-bold">Something went wrong</p>
          <p className="max-w-md font-mono text-xs text-muted-foreground">
            {this.state.error.message || 'Unexpected error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
