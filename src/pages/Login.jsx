import { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { LogIn, FileText, Loader2 } from 'lucide-react'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0c] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 text-white mb-4">
            <FileText size={32} />
          </div>
          <h1 className="text-3xl font-bold dark:text-white">PackGen Automator</h1>
          <p className="text-gray-500 dark:text-gray-400">Sign in to manage your project packs</p>
        </div>

        <div className="premium-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-[#1f2028] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
                placeholder="you@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-[#1f2028] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
