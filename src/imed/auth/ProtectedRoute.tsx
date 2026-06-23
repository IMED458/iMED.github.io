import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { imedUser, loading, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-['Noto_Sans_Georgian',_sans-serif]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">იტვირთება...</p>
        </div>
      </div>
    );
  }

  if (!imedUser) {
    return <Navigate to="/imed/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(imedUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-['Noto_Sans_Georgian',_sans-serif]">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">წვდომა შეზღუდულია</h2>
          <p className="text-gray-500 text-sm">თქვენ არ გაქვთ ამ გვერდზე შესვლის უფლება.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
