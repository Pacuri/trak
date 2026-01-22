// Avatar utility functions for consistent styling across the app

export const avatarGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
]

// Tailwind gradient classes for avatars
export const avatarGradientClasses = [
  'bg-gradient-to-br from-blue-500 to-purple-600',
  'bg-gradient-to-br from-pink-500 to-rose-500',
  'bg-gradient-to-br from-cyan-400 to-blue-500',
  'bg-gradient-to-br from-green-400 to-emerald-500',
  'bg-gradient-to-br from-orange-400 to-amber-500',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-teal-400 to-cyan-500',
]

export function getAvatarGradient(indexOrName: number | string): string {
  if (typeof indexOrName === 'number') {
    return avatarGradients[indexOrName % avatarGradients.length]
  }
  // Hash the string to get a consistent index
  const hash = indexOrName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return avatarGradientClasses[hash % avatarGradientClasses.length]
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarIndex(userId: string, allUserIds: string[]): number {
  return allUserIds.indexOf(userId)
}
