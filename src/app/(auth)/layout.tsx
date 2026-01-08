export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-sm p-5">
          {children}
        </div>
      </div>
    </div>
  )
}