import { useState, useEffect } from 'react'
import { Save, Shield, FileCheck, Info, FolderCheck, Settings as SettingsIcon } from 'lucide-react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useToast } from '../components/ToastProvider'

export default function Settings() {
  const [settings, setSettings] = useState({
    terms: 'Commission terms: 5% of project value...',
    technicalPack: 'This technical pack includes...',
    googleMapsApiKey: '',
    googleDriveFolderId: ''
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'global')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setSettings(docSnap.data())
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      await setDoc(doc(db, 'settings', 'global'), settings)
      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Error saving settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="premium-card p-8 space-y-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="text-purple-600" size={24} />
          <h2 className="text-xl font-bold dark:text-white">Global Application Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Shield size={16} />
              <label>Terms & Conditions (Boilerplate)</label>
            </div>
            <textarea 
              rows="6" 
              value={settings.terms}
              onChange={(e) => setSettings({ ...settings, terms: e.target.value })}
              className="w-full p-4 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white text-sm"
            ></textarea>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileCheck size={16} />
              <label>Technical Pack Text (Boilerplate)</label>
            </div>
            <textarea 
              rows="6" 
              value={settings.technicalPack}
              onChange={(e) => setSettings({ ...settings, technicalPack: e.target.value })}
              className="w-full p-4 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white text-sm"
            ></textarea>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Info size={16} />
              <label>Google Maps Static API Key</label>
            </div>
            <input 
              type="password" 
              value={settings.googleMapsApiKey}
              onChange={(e) => setSettings({ ...settings, googleMapsApiKey: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FolderCheck size={16} />
              <label>Google Drive "Projects" Folder ID</label>
            </div>
            <input 
              type="text" 
              placeholder="e.g. 1aBCdEff...gHiJkLmNo"
              value={settings.googleDriveFolderId}
              onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
            />
            <p className="text-[10px] text-gray-400">The ID of the folder you shared with the robot email. Found in the URL when you open that folder.</p>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 dark:border-[#2e303a] pt-6">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={20} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
