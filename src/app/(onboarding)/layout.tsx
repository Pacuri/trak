export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[500px]">
        {children}
      </div>
    </div>
  )
}
