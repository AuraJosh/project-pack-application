import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CreatePack from './pages/CreatePack'
import Settings from './pages/Settings'
import Login from './pages/Login'
import PackWorkspace from './pages/PackWorkspace'
import StorageExplorer from './pages/StorageExplorer'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreatePack />} />
          <Route path="/workspace/:id" element={<PackWorkspace />} />
          <Route path="/storage" element={<StorageExplorer />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
