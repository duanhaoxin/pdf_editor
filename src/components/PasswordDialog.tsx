import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  fileName: string
  incorrect: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}

export function PasswordDialog({ fileName, incorrect, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [fileName, incorrect])

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (password) onSubmit(password)
          }}
        >
          <DialogHeader>
            <DialogTitle>文件已加密</DialogTitle>
            <DialogDescription>
              「{fileName}」需要密码才能打开。密码只用于在本地解密，不会离开这台电脑。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-2">
            <Label htmlFor="pdf-password">密码</Label>
            <Input
              id="pdf-password"
              ref={inputRef}
              type="password"
              value={password}
              autoComplete="off"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入 PDF 密码"
            />
            {incorrect ? (
              <p className="text-sm text-destructive">密码不正确，请重试。</p>
            ) : null}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" disabled={!password}>
              解锁
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
