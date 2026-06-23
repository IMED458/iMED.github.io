import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Stethoscope, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { SEEDED_ADMIN } from '../firebase/db';

export default function LoginPage() {
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/imed/dashboard');
    } catch {
      // error is set in store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4 font-['Noto_Sans_Georgian',_sans-serif]">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-blue-900 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
              <Stethoscope size={32} className="text-blue-700" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">iMED</h1>
            <p className="text-blue-300 text-sm">კლინიკის მართვის სისტემა</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">სისტემაში შესვლა</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ლოკალური რეჟიმის სატესტო ანგარიში */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <div className="font-semibold mb-1">🔧 ლოკალური რეჟიმი — სატესტო ანგარიში</div>
              <div>ელ-ფოსტა: <code className="bg-white px-1 rounded">{SEEDED_ADMIN.email}</code></div>
              <div>პაროლი: <code className="bg-white px-1 rounded">{SEEDED_ADMIN.password}</code></div>
              <button
                type="button"
                onClick={() => { setEmail(SEEDED_ADMIN.email); setPassword(SEEDED_ADMIN.password); }}
                className="mt-2 text-blue-600 hover:underline font-medium"
              >
                ველების ავტომატური შევსება →
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ელ-ფოსტა</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="name.surname@imed.local"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">პაროლი</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm text-sm mt-2"
              >
                {submitting ? 'შესვლა...' : 'შესვლა'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center text-xs text-gray-400">
            მონაცემები დაცულია „პერსონალურ მონაცემთა დაცვის შესახებ" საქართველოს კანონის შესაბამისად
          </div>
        </div>
      </div>
    </div>
  );
}
