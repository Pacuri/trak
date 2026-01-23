import '@/app/globals.css'

export default function PonudaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="public-page-container">
      {children}
    </div>
  )
}
