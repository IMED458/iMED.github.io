import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { initAuthListener } from './store/authStore';
import { useAuthStore } from './store/authStore';

import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import ChangePasswordGate from './auth/ChangePasswordGate';
import LoginPage from './auth/LoginPage';
import SetupPage from './auth/SetupPage';

import DashboardPage from './modules/dashboard/DashboardPage';
import PatientsListPage from './modules/patients/PatientsListPage';
import PatientForm from './modules/patients/PatientForm';
import PatientProfilePage from './modules/patients/PatientProfilePage';
import AppointmentsPage from './modules/appointments/AppointmentsPage';
import OrdersPage from './modules/orders/OrdersPage';
import NewOrderPage from './modules/orders/NewOrderPage';
import OrderDetailsPage from './modules/orders/OrderDetailsPage';
import LaboratoryPage from './modules/laboratory/LaboratoryPage';
import RadiologyPage from './modules/radiology/RadiologyPage';
import InpatientPage from './modules/inpatient/InpatientPage';
import AdmitPage from './modules/inpatient/AdmitPage';
import EpisodePage from './modules/inpatient/EpisodePage';
import DocumentsPage from './modules/documents/DocumentsPage';
import DocumentEditorPage from './modules/documents/DocumentEditorPage';
import EmergencySheetPage from './modules/clinical/EmergencySheetPage';
import Form100Page from './modules/clinical/Form100Page';
import AuditPage from './modules/audit/AuditPage';
import UsersPage from './modules/users/UsersPage';
import SettingsPage from './modules/settings/SettingsPage';

// Placeholder pages for modules not yet fully implemented
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="text-center py-20 text-gray-400">
    <div className="text-5xl mb-4">🚧</div>
    <h3 className="text-xl font-semibold text-gray-600 mb-2">{title}</h3>
    <p className="text-sm">მოდული მზადდება...</p>
  </div>
);

export default function ImedApp() {
  useEffect(() => {
    const unsub = initAuthListener();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/imed/login" element={<LoginPublicRoute />} />
        <Route path="/imed/setup" element={<SetupPage />} />

        <Route
          path="/imed"
          element={
            <ProtectedRoute>
              <ChangePasswordGate>
                <MainLayout />
              </ChangePasswordGate>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/imed/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* პაციენტები */}
          <Route path="patients" element={<PatientsListPage />} />
          <Route path="patients/new" element={<PatientForm />} />
          <Route path="patients/:id" element={<PatientProfilePage />} />
          <Route path="patients/:id/edit" element={<PatientFormEdit />} />
          <Route path="patients/:id/emergency" element={<EmergencySheetPage />} />
          <Route path="patients/:id/form100" element={<Form100Page />} />

          {/* ჩაწერა */}
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="appointments/new" element={<AppointmentsPage />} />

          {/* შეკვეთები */}
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />

          {/* ლაბ. */}
          <Route path="laboratory" element={
            <ProtectedRoute roles={['super_admin', 'lab_technician', 'doctor', 'department_head', 'nurse']}>
              <LaboratoryPage />
            </ProtectedRoute>
          } />

          {/* რად. */}
          <Route path="radiology" element={
            <ProtectedRoute roles={['super_admin', 'radiologist', 'doctor', 'department_head']}>
              <RadiologyPage />
            </ProtectedRoute>
          } />

          {/* სტაც. */}
          <Route path="inpatient" element={<InpatientPage />} />
          <Route path="inpatient/admit" element={<AdmitPage />} />
          <Route path="inpatient/episodes/:id" element={<EpisodePage />} />

          {/* დოკუმენტები */}
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/new" element={<DocumentEditorPage />} />
          <Route path="documents/:id" element={<DocumentEditorPage />} />

          {/* სტატ. */}
          <Route path="statistics" element={
            <ProtectedRoute roles={['super_admin', 'statistician', 'department_head']}>
              <PlaceholderPage title="სტატისტიკა და ანგარიშგება" />
            </ProtectedRoute>
          } />

          {/* აუდ. */}
          <Route path="audit" element={
            <ProtectedRoute roles={['super_admin']}>
              <AuditPage />
            </ProtectedRoute>
          } />

          {/* იუ. */}
          <Route path="users" element={
            <ProtectedRoute roles={['super_admin']}>
              <UsersPage />
            </ProtectedRoute>
          } />

          {/* პარ. */}
          <Route path="settings" element={
            <ProtectedRoute roles={['super_admin']}>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/imed/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}

function LoginPublicRoute() {
  const { imedUser, initialized } = useAuthStore();
  if (initialized && imedUser) return <Navigate to="/imed/dashboard" replace />;
  return <LoginPage />;
}

function PatientFormEdit() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = React.useState<any>(null);
  React.useEffect(() => {
    if (id) import('./modules/patients/patientsService').then(({ getPatient }) => getPatient(id).then(setPatient));
  }, [id]);
  if (!patient) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  return <PatientForm existing={patient} />;
}
