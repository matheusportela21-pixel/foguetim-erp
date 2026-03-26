import type { Metadata } from 'next'
import { ThemeProvider } from '@/context/ThemeContext'
import { ChatWidget } from '@/components/ai/ChatWidget'
import { WelcomeModal } from '@/components/WelcomeModal'
import { PlanProvider } from '@/context/PlanContext'
import Topbar from '@/components/layout/Topbar'
import DashboardPlanGate from '@/components/DashboardPlanGate'
import DashboardMobileWarning from '@/components/DashboardMobileWarning'

export const metadata: Metadata = {
  title: {
    default:  'Dashboard — Foguetim ERP',
    template: '%s — Foguetim ERP',
  },
  description: 'Gerencie seu e-commerce com inteligência',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PlanProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-space-900 dark:stars-bg">
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }} />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.03]"
              style={{ background: 'radial-gradient(circle, #F97316, transparent)' }} />
          </div>

          <Topbar />

          <main className="relative z-10 pt-20 min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
              <DashboardMobileWarning />
              <DashboardPlanGate>
                {children}
              </DashboardPlanGate>
            </div>
          </main>
        </div>
        <ChatWidget />
        <WelcomeModal />
      </PlanProvider>
    </ThemeProvider>
  )
}
