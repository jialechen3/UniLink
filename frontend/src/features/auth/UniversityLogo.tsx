import { useEffect, useState } from 'react'
import type { University } from '../../types'

function colorTone(color: string) {
  const value = color.replace('#', '')
  const red = parseInt(value.slice(0, 2), 16) / 255
  const green = parseInt(value.slice(2, 4), 16) / 255
  const blue = parseInt(value.slice(4, 6), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  if (delta < 0.08) return 'neutral'
  let hue = 0
  if (maximum === red) hue = ((green - blue) / delta) % 6
  else if (maximum === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4
  hue = (hue * 60 + 360) % 360
  if (hue < 15 || hue >= 345) return 'red'
  if (hue < 40) return 'orange'
  if (hue < 72) return 'gold'
  if (hue < 165) return 'green'
  if (hue < 195) return 'teal'
  if (hue < 255) return 'blue'
  if (hue < 290) return 'purple'
  return 'magenta'
}

export function UniversityLogo({ university }: { university: University }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [university.logo_url])

  return <span className="university-logo-tile">
    {university.logo_url && !failed
      ? <img src={university.logo_url} alt={`${university.name} logo`} onError={() => setFailed(true)} />
      : <span className={`university-monogram tone-${colorTone(university.brand_color)}`} aria-label={`${university.initials} monogram`}>{university.initials}</span>}
  </span>
}