import '@/app/globals.css'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="public-page-container bg-gradient-to-br from-slate-50 to-blue-50">
      {children}
    </div>
  )
}
