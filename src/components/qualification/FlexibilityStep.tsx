'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { QualificationData } from '@/types'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay, addDays } from 'date-fns'
import { sr } from 'date-fns/locale'

interface FlexibilityStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
  onNext: () => void
}

export default function FlexibilityStep({ value, onChange, onNext }: FlexibilityStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Check if we're in exact date mode (user selected "Imam tačan datum" in MonthStep OR "Treba mi tačan termin" here)
  const isExactDateMode = value.month === 'exact' || showDatePicker

  const handleFlexibilitySelect = (flexible: boolean) => {
    if (!flexible) {
      // User needs exact date - show calendar
      setShowDatePicker(true)
      return
    }
    
    onChange({ flexible })
    
    // Trigger slide animation
    setIsAnimating(true)
    
    // Auto-advance after animation
    setTimeout(() => {
      onNext()
    }, 200)
  }

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    onChange({ 
      exactStart: dateStr, 
      exactEnd: null, // Will be calculated based on duration
      flexible: false 
    })
    
    // Trigger slide animation
    setIsAnimating(true)
    
    // Auto-advance after animation
    setTimeout(() => {
      onNext()
    }, 200)
  }

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    
    // Add padding days from previous month to start on Monday
    const startDay = start.getDay()
    const paddingStart = startDay === 0 ? 6 : startDay - 1 // Convert to Monday-based
    const paddingDays = []
    for (let i = paddingStart; i > 0; i--) {
      paddingDays.push(addDays(start, -i))
    }
    
    return [...paddingDays, ...days]
  }, [currentMonth])

  const today = startOfDay(new Date())

  if (isExactDateMode) {
    // Show date picker
    return (
      <div className={`space-y-6 transition-transform duration-200 ${isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Izaberite datum polaska</h2>
          <p className="text-gray-500">Odaberite tačan datum kada želite da krenete</p>
        </div>

        {/* Calendar header */}
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(m => addMonths(m, -1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={isSameMonth(currentMonth, new Date())}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: sr })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isPast = isBefore(day, today)
              const isSelectedDate = value.exactStart === format(day, 'yyyy-MM-dd')
              const isTodayDate = isToday(day)
              
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isPast || !isCurrentMonth}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-all
                    ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                    ${isPast && isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                    ${isSelectedDate 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : isCurrentMonth && !isPast
                      ? 'hover:bg-blue-50 text-gray-700 active:scale-95'
                      : ''
                    }
                    ${isTodayDate && !isSelectedDate ? 'ring-2 ring-blue-300' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected date display */}
        {value.exactStart && (
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <p className="text-blue-800 font-medium">
              Polazak: {format(new Date(value.exactStart), 'd. MMMM yyyy', { locale: sr })}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Normal flexibility question
  return (
    <div className={`space-y-6 transition-transform duration-200 ${isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Fleksibilni ste sa datumima?</h2>
        <p className="text-gray-500">Odaberite opciju</p>
      </div>

      {/* Flexibility options - 2 full-width buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleFlexibilitySelect(true)}
          className={`
            w-full px-6 py-5 rounded-xl text-left transition-all
            ${
              value.flexible === true
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
            }
          `}
        >
          <div className="font-semibold text-lg">Da, ± par dana</div>
          <div className={`text-sm mt-1 ${value.flexible === true ? 'text-blue-100' : 'text-gray-500'}`}>
            Mogu da prilagodim datum za nekoliko dana
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleFlexibilitySelect(false)}
          className={`
            w-full px-6 py-5 rounded-xl text-left transition-all
            ${
              value.flexible === false
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
            }
          `}
        >
          <div className="font-semibold text-lg">Treba mi tačan termin</div>
          <div className={`text-sm mt-1 ${value.flexible === false ? 'text-blue-100' : 'text-gray-500'}`}>
            Izaberite tačan datum polaska
          </div>
        </button>
      </div>
    </div>
  )
}
