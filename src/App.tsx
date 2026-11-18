import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { EditorApp } from '@/components/EditorApp'

export default function App() {
  return (
    <TooltipProvider delayDuration={250}>
      <EditorApp />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  )
}
