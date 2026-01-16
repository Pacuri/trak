'use client'

import Link from 'next/link'
import { CheckCircle, Clock, Home } from 'lucide-react'
import type { InquirySuccessProps } from '@/types/inquiry'

export default function InquirySuccess({ responseTimeText, slug }: InquirySuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {/* Success icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Upit je poslat!
      </h1>

      {/* Confirmation text */}
      <p className="text-gray-600 mb-6 max-w-md">
        Hvala vam na interesovanju. Naš tim će pregledati vaš upit i javiti vam se sa najboljim ponudama.
      </p>

      {/* Response time highlight */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl px-6 py-4 mb-8 inline-flex items-center gap-3">
        <Clock className="w-5 h-5 text-teal-600" />
        <span className="text-teal-800 font-medium">
          {responseTimeText}
        </span>
      </div>

      {/* What happens next */}
      <div className="text-left bg-gray-50 rounded-xl p-5 mb-8 max-w-md w-full">
        <h3 className="font-semibold text-gray-900 mb-3">Šta sledi?</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="bg-teal-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
            <span>Naš agent pregleda vaš upit</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-teal-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
            <span>Pronalazimo najbolje ponude za vas</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-teal-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
            <span>Kontaktiramo vas sa personalizovanim predlozima</span>
          </li>
        </ol>
      </div>

      {/* Back to home button */}
      <Link
        href={`/a/${slug}`}
        className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
      >
        <Home className="w-4 h-4" />
        Nazad na početnu
      </Link>
    </div>
  )
}
