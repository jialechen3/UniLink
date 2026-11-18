import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { University } from '../../types'
import { EmptyState } from '../shared/Feedback'
import { UniversityLogo } from './UniversityLogo'

export function UniversityPicker({
  universities,
  value,
  onChange,
}: {
  universities: University[]
  value: number | ''
  onChange: (universityId: number) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return universities
    return universities.filter((university) =>
      university.name.toLocaleLowerCase().includes(needle)
      || university.short_name.toLocaleLowerCase().includes(needle),
    )
  }, [universities, query])

  return <div className="university-picker">
    <label className="university-search-label" htmlFor="university-search">Search universities</label>
    <div className="university-search"><Search size={17} /><input id="university-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search universities by name" /></div>
    <div className="university-results" role="listbox" aria-label="Universities">
      {filtered.length ? filtered.map((university) => {
        const selected = value === university.id
        return <button
          className={`university-option${selected ? ' selected' : ''}`}
          type="button"
          role="option"
          aria-selected={selected}
          key={university.id}
          onClick={() => onChange(university.id)}
        >
          <UniversityLogo university={university} />
          <span className="university-option-copy"><strong>{university.name}</strong><span>{university.short_name} · {university.city}, {university.state}</span></span>
          {selected && <Check size={17} className="university-option-check" />}
        </button>
      }) : <EmptyState title="No universities found" detail="Check the spelling or try another name." />}
    </div>
  </div>
}