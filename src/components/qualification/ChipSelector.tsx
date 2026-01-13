'use client'

interface ChipOption {
  value: string
  label: string
  icon?: string
}

interface ChipSelectorProps {
  options: ChipOption[]
  selected: string | string[] | null
  onChange: (value: string) => void
  multiple?: boolean
  columns?: 2 | 3 | 4
}

export default function ChipSelector({
  options,
  selected,
  onChange,
  multiple = false,
  columns = 3,
}: ChipSelectorProps) {
  const isSelected = (value: string) => {
    if (Array.isArray(selected)) {
      return selected.includes(value)
    }
    return selected === value
  }

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-2`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-3 rounded-xl text-sm font-medium transition-all
            ${
              isSelected(option.value)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }
          `}
        >
          {option.icon && <span className="mr-1">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}
