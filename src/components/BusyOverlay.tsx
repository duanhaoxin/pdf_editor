import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

type Props = {
  message: string
  progress: number | null
}

export function BusyOverlay({ message, progress }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <div className="w-[min(90vw,22rem)] rounded-2xl border bg-card p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {progress !== null ? (
          <div className="mt-4">
            <Progress value={progress} />
            <p className="mt-2 text-right text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
