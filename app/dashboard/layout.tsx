import { ThemeProvider } from '@/context/ThemeContext'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Subtle ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #6c3fa0, transparent)' }} />
        <div className="absolute bottom-0 left-64 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #00c2ff, transparent)' }} />
      </div>

      <Sidebar />

      <main className="flex-1 overflow-y-auto relative z-10 bg-dark-900 dash-main">
        {children}
      </main>
    </ThemeProvider>
  )
}
