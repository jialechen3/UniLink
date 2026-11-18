function parseDate(value: string | Date) {
  if (value instanceof Date) return value
  const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(value)
  return new Date(hasTimezone ? value : `${value}Z`)
}

export function formatPrice(value: string | number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function formatRelativeTime(value: string | Date) {
  const elapsed = Math.max(0, Date.now() - parseDate(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(parseDate(value))
}

export function formatEventMonth(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'America/New_York' }).format(parseDate(value))
}

export function formatEventDay(value: string) {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'America/New_York' }).format(parseDate(value))
}

export function formatJoinDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parseDate(value))
}