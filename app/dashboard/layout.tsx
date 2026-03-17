import type { Metadata } from 'next'
import { ThemeProvider } from '@/context/ThemeContext'
import { ChatWidget } from '@/components/ai/ChatWidget'

export const metadata: Metadata = {
  title: {
    default:  'Dashboard — Foguetim ERP',
    template: '%s — Foguetim ERP',
  },
  description: 'Gerencie seu e-commerce com inteligência',
}
import { PlanProvider } from '@/context/PlanContext'
import { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/Sidebar'
import DashboardPlanGate from '@/components/DashboardPlanGate'
import DashboardMobileWarning from '@/components/DashboardMobileWarning'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PlanProvider>
        <SidebarProvider>
          <div className="flex flex-1 min-w-0 h-screen overflow-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.04]"
                style={{ background: 'radial-gradient(circle, #6c3fa0, transparent)' }} />
              <div className="absolute bottom-0 left-64 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.03]"
                style={{ background: 'radial-gradient(circle, #00c2ff, transparent)' }} />
            </div>

            <Sidebar />

            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative z-10 bg-dark-900 dash-main">
              <DashboardMobileWarning />
              <DashboardPlanGate>
                {children}
              </DashboardPlanGate>
            </main>
          </div>
          <ChatWidget />
        </SidebarProvider>
      </PlanProvider>
    </ThemeProvider>
  )
}
