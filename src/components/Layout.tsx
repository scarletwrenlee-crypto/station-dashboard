import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Zap } from 'lucide-react'

const tabs = [
  { path: '/', icon: Zap, label: '首页' },
  { path: '/dashboard', icon: BarChart3, label: '财报' },
]

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isActive = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-[#1a1a1a]">
      <main className="pb-14 max-w-lg mx-auto"><Outlet /></main>

      <nav className="fixed bottom-0 w-full z-50 bg-[#fbfbfa]/90 backdrop-blur border-t border-[#f1f1f0]">
        <div className="max-w-lg mx-auto flex justify-around py-1.5">
          {tabs.map(({ path, icon: Icon, label }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-md transition-colors ${
                isActive(path) ? 'text-[#1a1a1a]' : 'text-[#aeaeb2]'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
