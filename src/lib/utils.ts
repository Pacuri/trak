export function getStageBadgeColor(stageName: string): string {
  const name = stageName.toLowerCase()
  if (name.includes('novi') || name.includes('new')) return 'bg-[#3B82F6]/10 text-[#3B82F6]'
  if (name.includes('kontaktiran') || name.includes('contacted')) return 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
  if (name.includes('ponuda') || name.includes('proposal')) return 'bg-[#F97316]/10 text-[#F97316]'
  if (name.includes('zatvoreno') || name.includes('closed') || name.includes('won')) return 'bg-[#10B981]/10 text-[#10B981]'
  if (name.includes('izgubljeno') || name.includes('lost')) return 'bg-[#64748B]/10 text-[#64748B]'
  return 'bg-[#EFF6FF] text-[#3B82F6]'
}
