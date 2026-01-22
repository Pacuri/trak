'use client'

import { ArrowRight, FileText, Printer, Send, Calendar, Archive } from 'lucide-react'
import type { PipelineStage } from '@/types'

interface QuickActionsCardProps {
  currentStage?: PipelineStage | null
  nextStage?: PipelineStage | null
  onMoveToNextStage?: () => void
  onGenerateContract?: () => void
  onPrintOffer?: () => void
  onSendMessage?: () => void
  onScheduleReminder?: () => void
  onArchive?: () => void
  isArchived?: boolean
  isLoading?: boolean
}

export default function QuickActionsCard({
  currentStage,
  nextStage,
  onMoveToNextStage,
  onGenerateContract,
  onPrintOffer,
  onSendMessage,
  onScheduleReminder,
  onArchive,
  isArchived,
  isLoading
}: QuickActionsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Brze akcije</h3>

      <div className="space-y-2">
        {/* Move to Next Stage */}
        {nextStage && onMoveToNextStage && (
          <button
            onClick={onMoveToNextStage}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowRight className="w-5 h-5" />
            Pomeri u {nextStage.name}
          </button>
        )}

        {/* Send Message */}
        {onSendMessage && (
          <button
            onClick={onSendMessage}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Pošalji poruku
          </button>
        )}

        {/* Generate Contract */}
        {onGenerateContract && (
          <button
            onClick={onGenerateContract}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Generiši ugovor
          </button>
        )}

        {/* Print Offer */}
        {onPrintOffer && (
          <button
            onClick={onPrintOffer}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Štampaj ponudu
          </button>
        )}

        {/* Schedule Reminder */}
        {onScheduleReminder && (
          <button
            onClick={onScheduleReminder}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Zakaži podsetnik
          </button>
        )}

        {/* Archive */}
        {onArchive && (
          <button
            onClick={onArchive}
            disabled={isLoading}
            className={`w-full px-4 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 ${
              isArchived
                ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            <Archive className="w-5 h-5" />
            {isArchived ? 'Vrati iz arhive' : 'Arhiviraj'}
          </button>
        )}
      </div>
    </div>
  )
}
