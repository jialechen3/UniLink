import { AlertCircle, LoaderCircle, PackageOpen } from 'lucide-react'

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="state-block" role="status"><LoaderCircle className="spin" size={20} /><span>{label}</span></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block state-error" role="alert">
      <AlertCircle size={20} />
      <span>{message}</span>
      {onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><PackageOpen size={24} /><strong>{title}</strong><p>{detail}</p></div>
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return <p className="form-error" role="alert">{message}</p>
}