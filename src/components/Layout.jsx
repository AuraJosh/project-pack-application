import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  FileText,
  HardDrive
} from 'lucide-react'

import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const location = useLocation()

  const handleLogout = () => signOut(auth)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Create Pack', href: '/create', icon: PlusCircle },
    { name: 'Storage', href: '/storage', icon: HardDrive },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] flex">
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        transition-all duration-300 ease-in-out
        bg-white dark:bg-[#16171d] border-r border-gray-200 dark:border-[#2e303a]
        flex flex-col z-50
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg dark:text-white">PackGen</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-400"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' 
                    : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'}
                `}
              >
                <item.icon size={20} />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-[#2e303a]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-[#16171d] border-b border-gray-200 dark:border-[#2e303a] flex items-center px-8 justify-between">
          <h1 className="text-xl font-semibold dark:text-white">
            {navigation.find(n => n.href === location.pathname)?.name || 'Project'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
