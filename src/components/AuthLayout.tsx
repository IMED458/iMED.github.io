/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { DB } from '../utils';
import { Shield, Key, Mail, CheckCircle, GraduationCap, RefreshCw } from 'lucide-react';

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
  const [role, setRole] = useState<UserRole>('Author');
  const demoPassword = 'password';

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
        onShowNotification('Please fill in all required fields.', 'error');
        return;
      }
      const users = DB.getUsers();
      const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        onShowNotification('Email is already registered.', 'error');
        return;
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        firstName,
        lastName,
        orcidId: orcidId || undefined,
        role,
        institution,
        isVerified: true,
        joinedDate: new Date().toISOString().split('T')[0]
      };

      const updatedUsers = [...users, newUser];
      DB.setUsers(updatedUsers);
      DB.setCurrentUser(newUser);
      onUserChanged(newUser);
      onShowNotification(`Account successfully created! Logged in as ${newUser.firstName} ${newUser.lastName}.`, 'success');
      
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
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-teal-50 border border-teal-100 rounded-2xl mb-4 text-teal-700 shadow-xs">
          <GraduationCap className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-slate-800">
          Georgian Biomedical and Medical Nexus
        </h2>
        <p className="mt-1 text-sm text-teal-700 font-medium tracking-wide">
          GEORGIAN BIOMEDICAL NEWS · SUBMISSION STANDARD
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-xl rounded-2xl sm:px-10">
          
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
                    ORCID iD (Recommended)
                  </label>
                  <input
                    id="reg-orcid"
                    type="text"
                    value={orcidId}
                    onChange={(e) => setOrcidId(e.target.value)}
                    placeholder="0000-xxxx-xxxx-xxxx"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600 font-mono"
                  />
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

                <div>
                  <label htmlFor="reg-role" className="block text-xs font-semibold text-slate-600 mb-1">Desired Central Role</label>
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="Author">Author (Submitter)</option>
                    <option value="Reviewer">Independent Referee / Reviewer</option>
                  </select>
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

        <div className="mt-6 bg-slate-900 text-slate-100 rounded-2xl p-4 shadow-xl border border-slate-700 text-xs">
          <h4 className="font-semibold uppercase tracking-wide text-sm">Registered demo accounts</h4>
          <p className="text-slate-400 mt-1">
            Use the account email for the role you need. Password for seeded accounts: <strong className="text-teal-300">password</strong>.
          </p>
          <div className="mt-3 grid gap-1.5 font-mono text-[11px] text-slate-300">
            <span>author@gbmn.edu</span>
            <span>editor@gbmn.edu</span>
            <span>reviewer@gbmn.edu</span>
            <span>managing.editor@gbmn.edu</span>
            <span>admin@gbmn.org</span>
          </div>
        </div>

      </div>
    </div>
  );
}
