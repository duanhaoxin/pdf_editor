import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { EditorApp } from '@/components/EditorApp'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <div data-app-ready="true" className="h-dvh min-h-dvh">
        <TooltipProvider delayDuration={250}>
          <EditorApp />
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </div>
    </ErrorBoundary>
  )
}
