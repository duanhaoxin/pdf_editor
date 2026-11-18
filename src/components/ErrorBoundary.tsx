import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { message: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || '未知错误' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.message) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-xl font-semibold">页面出错了</h1>
          <p className="max-w-md text-sm text-muted-foreground">{this.state.message}</p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            刷新
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
