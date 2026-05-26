/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { DB } from '../utils';
import { Key, Mail } from 'lucide-react';
import { firebaseEnabled, signInWithGoogle } from '../firebase';

interface AuthLayoutProps {
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  onShowNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function AuthLayout({ currentUser, onUserChanged, onShowNotification }: AuthLayoutProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orcidId, setOrcidId] = useState('');
  const [institution, setInstitution] = useState('');
  const [isOrcidLookup, setIsOrcidLookup] = useState(false);
  const [pendingProviderUid, setPendingProviderUid] = useState('');
  const demoPassword = 'password';

  const normalizeOrcid = (value: string) => value.replace(/^https?:\/\/orcid\.org\//i, '').trim();

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      const [given = 'GBMN', ...rest] = (result.user.displayName || '').split(' ').filter(Boolean);
      const family = rest.join(' ') || 'Author';
      const users = DB.getUsers();
      const existing = users.find(u => u.email.toLowerCase() === (result.user.email || '').toLowerCase());
      if (existing?.institution) {
        DB.setCurrentUser(existing);
        onUserChanged(existing);
        onShowNotification('Google sign-in completed.', 'success');
        return;
      }
      const user: User = existing || {
        id: result.user.uid,
        email: result.user.email || '',
        firstName: given,
        lastName: family,
        role: 'Author',
        institution: '',
        isVerified: true,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      setPendingProviderUid(user.id);
      setEmail(user.email);
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setInstitution(user.institution || '');
      setOrcidId(user.orcidId || '');
      setIsLogin(false);
      setIsReset(false);
      onShowNotification('Google verified. Complete missing author profile details to finish registration.', 'info');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '';
      const host = window.location.hostname;
      const message = rawMessage.includes('auth/unauthorized-domain')
        ? `Firebase Authorized domains-ში დაამატე ${host}. Firebase Console → Authentication → Settings → Authorized domains.`
        : rawMessage || 'Google sign-in is not available yet.';
      onShowNotification(message, 'error');
    }
  };

  const autofillFromOrcid = async () => {
    const clean = normalizeOrcid(orcidId);
    if (!clean) return;
    setIsOrcidLookup(true);
    try {
      const response = await fetch(`https://pub.orcid.org/v3.0/${clean}/record`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('ORCID lookup failed');
      const record = await response.json();
      const name = record?.person?.name;
      const given = name?.['given-names']?.value || '';
      const family = name?.['family-name']?.value || '';
      const emails = record?.person?.emails?.email || [];
      const employments = record?.['activities-summary']?.employments?.['affiliation-group'] || [];
      const orgName = employments?.[0]?.summaries?.[0]?.['employment-summary']?.organization?.name || '';
      if (given && !firstName) setFirstName(given);
      if (family && !lastName) setLastName(family);
      if (emails[0]?.email && !email) setEmail(emails[0].email);
      if (orgName && !institution) setInstitution(orgName);
      setOrcidId(clean);
      onShowNotification('ORCID profile details imported where available.', 'success');
    } catch {
      onShowNotification('Could not import ORCID details. You can still complete the fields manually.', 'error');
    } finally {
      setIsOrcidLookup(false);
    }
  };

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReset) {
      onShowNotification(`Password reset instructions successfully sent to ${email}.`, 'success');
      setIsReset(false);
      setIsLogin(true);
      return;
    }

    if (isLogin) {
      // Find matching simulated user
      const users = DB.getUsers();
      const match = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (match) {
        if (password !== demoPassword) {
          onShowNotification('Incorrect password for this account.', 'error');
          return;
        }
        DB.setCurrentUser(match);
        onUserChanged(match);
        onShowNotification(`Signed in as ${match.firstName} ${match.lastName} (${match.role})`, 'success');
        DB.addAuditLog({
          userId: match.id,
          userEmail: match.email,
          action: 'USER_LOGIN',
          targetId: match.id,
          details: `User completed authentication form into dashboard with role: ${match.role}`
        });
      } else {
        onShowNotification('No account exists with this email. Create an account first or use a registered role account.', 'error');
      }
    } else {
      // Register new user
      if (!email || !firstName || !lastName || !institution) {
        onShowNotification('Please fill in all required profile fields.', 'error');
        return;
      }
      const users = DB.getUsers();
      const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (userExists && !pendingProviderUid) {
        onShowNotification('Email is already registered.', 'error');
        return;
      }

      const newUser: User = {
        id: pendingProviderUid || `user-${Date.now()}`,
        email,
        firstName,
        lastName,
        orcidId: orcidId || undefined,
        role: 'Author',
        institution,
        isVerified: true,
        joinedDate: new Date().toISOString().split('T')[0]
      };

      const updatedUsers = userExists
        ? users.map(item => item.email.toLowerCase() === email.toLowerCase() ? { ...item, ...newUser } : item)
        : [...users, newUser];
      DB.setUsers(updatedUsers);
      DB.setCurrentUser(newUser);
      onUserChanged(newUser);
      onShowNotification(`Account successfully created! Logged in as ${newUser.firstName} ${newUser.lastName}.`, 'success');
      setPendingProviderUid('');
      
      DB.addAuditLog({
        userId: newUser.id,
        userEmail: newUser.email,
        action: 'USER_REGISTERED',
        targetId: newUser.id,
        details: `Submissions portal created. Allocated role ${newUser.role} affiliation: ${newUser.institution}.`
      });
    }
  };

  return (
    <div id="auth-portal" className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      
      {/* Platform Branding Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <img
          src={`${import.meta.env.BASE_URL}gbmn-logo.png`}
          alt="Georgian Biomedical News"
          className="mx-auto w-[360px] max-w-[86vw] h-auto object-contain"
        />
        <p className="mt-1 text-sm text-teal-700 font-medium tracking-wide">
          MANUSCRIPT SUBMISSION SYSTEM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-xl rounded-xl sm:px-10">
          
          <div className="flex justify-between border-b border-slate-100 pb-4 mb-6">
            <button
              id="switch-to-login-btn"
              onClick={() => { setIsLogin(true); setIsReset(false); }}
              className={`pb-2 font-medium text-sm transition-colors relative ${isLogin && !isReset ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
              {isLogin && !isReset && <div className="absolute left-0 bottom-0 w-full h-[2px] bg-teal-700 rounded-full" />}
            </button>
            <button
              id="switch-to-register-btn"
              onClick={() => { setIsLogin(false); setIsReset(false); }}
              className={`pb-2 font-medium text-sm transition-colors relative ${!isLogin && !isReset ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Create Account
              {!isLogin && !isReset && <div className="absolute left-0 bottom-0 w-full h-[2px] bg-teal-700 rounded-full" />}
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleAction}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!firebaseEnabled}
              className="w-full border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 font-semibold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-base font-black text-blue-600 border">G</span>
              Continue with Google
            </button>
            {!firebaseEnabled && (
              <p className="text-[10px] text-slate-400 -mt-2">
                Google authentication will activate after Firebase configuration is connected.
              </p>
            )}
            
            {isReset ? (
              <>
                <h3 className="text-slate-800 font-medium text-sm">Recover Password</h3>
                <p className="text-xs text-slate-500">Enter your institutional registered email to retrieve recovery procedures link.</p>
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-600 mb-1">Institutional Email</label>
                  <div className="relative">
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., scholar@tsmu.edu"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                    />
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </>
            ) : isLogin ? (
              <>
                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., author@gbmn.edu"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                    />
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="login-pass" className="text-xs font-semibold text-slate-600">Password</label>
                    <button
                      id="forgot-password-btn"
                      type="button"
                      onClick={() => setIsReset(true)}
                      className="text-xs text-teal-700 hover:underline font-medium"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-pass"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                    />
                    <Key className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded-sm"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-500">
                    Keep me signed into journal network
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* Registration Fields */}
                <div id="registration-fields" className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-first" className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
                    <input
                      id="reg-first"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g., Ioseb"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-last" className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
                    <input
                      id="reg-last"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g., Kavtaradze"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., academic@tsmu.edu"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label htmlFor="reg-orcid" className="block text-xs font-semibold text-slate-600 mb-1">
                    ORCID iD (optional)
                  </label>
                  <input
                    id="reg-orcid"
                    type="text"
                    value={orcidId}
                    onChange={(e) => setOrcidId(e.target.value)}
                    onBlur={autofillFromOrcid}
                    placeholder="0000-xxxx-xxxx-xxxx"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={autofillFromOrcid}
                    disabled={!orcidId.trim() || isOrcidLookup}
                    className="mt-2 text-[11px] font-bold text-teal-700 disabled:text-slate-400 hover:underline"
                  >
                    {isOrcidLookup ? 'Importing ORCID...' : 'Auto-fill from ORCID'}
                  </button>
                </div>

                <div>
                  <label htmlFor="reg-institution" className="block text-xs font-semibold text-slate-600 mb-1">University / Institute Affiliation *</label>
                  <input
                    id="reg-institution"
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g., Tbilisi State Medical University"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-[11px] text-teal-900">
                  New accounts are registered as authors. Editorial roles are assigned only by an administrator.
                </div>
              </>
            )}

            <button
              id="submit-auth-btn"
              type="submit"
              className="mt-2 w-full flex justify-center items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-xs hover:shadow-md transition-all text-sm cursor-pointer"
            >
              {isReset ? 'Send Instructions' : isLogin ? 'Sign In to Journal' : 'Complete Registration'}
            </button>

            {isReset && (
              <button
                id="cancel-reset-btn"
                type="button"
                className="w-full text-center text-xs text-slate-500 hover:underline"
                onClick={() => setIsReset(false)}
              >
                Go back to login
              </button>
            )}

          </form>

          {/* ORCID ID Sandbox Badge */}
          <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col items-center">
            <div className="bg-lime-50 border border-lime-100 px-3 py-1.5 rounded-md flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-800 font-medium font-mono">
                Integrated with ORCID Electronic Registry
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
