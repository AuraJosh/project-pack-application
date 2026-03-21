import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { X, User, Briefcase, Phone, Mail, MapPin } from 'lucide-react';

export default function AddProfileModal({ isOpen, onClose, view, projects }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isBuilder = view === 'builders';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (isBuilder) {
        // Add new Builder
        await addDoc(collection(db, 'contacts'), {
          name,
          company,
          phone,
          email,
          contact_type: 'Builder',
          status: 'Vetting',
          date_added: new Date().toISOString()
        });
      } else {
        // Add new Homeowner and link to a Project
        if (!selectedProjectId) {
          alert("Please select a project to link this homeowner to.");
          setLoading(false);
          return;
        }

        const homeownerRef = await addDoc(collection(db, 'contacts'), {
          name,
          phone,
          email,
          contact_type: 'Homeowner',
          date_added: new Date().toISOString()
        });

        // Link Homeowner to Project
        await updateDoc(doc(db, 'projects', selectedProjectId), {
          homeowner_id: homeownerRef.id,
          crm_active: true // optional tag if we want to filter them later
        });
      }
      onClose();
    } catch (err) {
      console.error("Error creating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pt-24 pb-4 px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-[#16171d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in relative z-10 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2e303a] flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isBuilder ? 'Add Builder Profile' : 'Add Homeowner Profile'}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252630]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto w-full">
          <form id="add-profile-form" onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Common Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {isBuilder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                    placeholder="JD Construction Ltd"
                  />
                </div>
              </div>
            )}

            {!isBuilder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Project</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                    required
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white appearance-none"
                  >
                    <option value="" disabled>Select a project from the dashboard...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.address || p.reference || p.name || 'Unnamed Project'}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                    placeholder="07700 900000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-[#2e303a] bg-white dark:bg-[#16171d] shrink-0">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252630] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-profile-form"
              disabled={loading}
              className={`px-6 py-2 rounded-xl font-medium text-white shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center ${isBuilder ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isBuilder ? 'Save Builder' : 'Save Homeowner'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
