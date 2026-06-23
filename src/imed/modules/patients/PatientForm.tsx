import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { createPatient, updatePatient } from './patientsService';
import type { Patient, InsuranceStatus, BloodType } from '../../types';
import { INSURANCE_LABELS } from '../../types';
import { Save, ArrowLeft, User, Phone, MapPin, Heart, Shield } from 'lucide-react';

interface Props {
  existing?: Patient;
  onSaved?: (id: string) => void;
}

type FormData = Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'cardNumber' | 'historyNumber' | 'createdBy' | 'isActive'>;

const EMPTY: FormData = {
  lastName: '',
  firstName: '',
  birthDate: '',
  sex: 'male',
  personalId: '',
  isForigner: false,
  passportNumber: '',
  registrationAddress: '',
  actualAddress: '',
  phone: '',
  phone2: '',
  insuranceStatus: 'none',
  insuranceNumber: '',
  bloodType: undefined,
  rhFactor: undefined,
  allergies: '',
  chronicDiseases: '',
  legalRepresentative: undefined,
};

function toFormData(p: Patient): FormData {
  return {
    lastName: p.lastName,
    firstName: p.firstName,
    birthDate: p.birthDate,
    sex: p.sex,
    personalId: p.personalId,
    isForigner: p.isForigner,
    passportNumber: p.passportNumber,
    registrationAddress: p.registrationAddress,
    actualAddress: p.actualAddress,
    phone: p.phone,
    phone2: p.phone2,
    insuranceStatus: p.insuranceStatus,
    insuranceNumber: p.insuranceNumber,
    bloodType: p.bloodType,
    rhFactor: p.rhFactor,
    allergies: p.allergies,
    chronicDiseases: p.chronicDiseases,
    legalRepresentative: p.legalRepresentative,
  };
}

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
      <span className="text-blue-600">{icon}</span>
      <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
    </div>
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({
  label, required, colSpan, children,
}: {
  label: string; required?: boolean; colSpan?: boolean; children: React.ReactNode;
}) => (
  <div className={colSpan ? 'md:col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const selectCls = inputCls;
const textareaCls = `${inputCls} resize-none`;

export default function PatientForm({ existing, onSaved }: Props) {
  const navigate = useNavigate();
  const { imedUser } = useAuthStore();
  const [form, setForm] = useState<FormData>(existing ? toFormData(existing) : EMPTY);
  const [hasRep, setHasRep] = useState(!!existing?.legalRepresentative);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validatePersonalId = (id: string) => {
    if (form.isForigner) return true;
    return /^\d{11}$/.test(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!imedUser) return;
    if (!validatePersonalId(form.personalId)) {
      setError('პირადი ნომერი უნდა შეიცავდეს 11 ციფრს');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        legalRepresentative: hasRep ? form.legalRepresentative : undefined,
      };
      if (existing) {
        await updatePatient(existing.id, payload, imedUser);
        onSaved?.(existing.id);
        navigate(`/imed/patients/${existing.id}`);
      } else {
        const id = await createPatient(payload as any, imedUser);
        onSaved?.(id);
        navigate(`/imed/patients/${id}`);
      }
    } catch (err: any) {
      setError(err.message || 'შეცდომა შენახვისას');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {existing ? 'პაციენტის რედაქტირება' : 'პაციენტის რეგისტრაცია'}
            </h2>
            <p className="text-sm text-gray-500">სავალდებულო ველები მონიშნულია *-ით</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* პირადი მონაცემები */}
        <Section title="პირადი მონაცემები" icon={<User size={18} />}>
          <Field label="გვარი" required>
            <input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
          </Field>
          <Field label="სახელი" required>
            <input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
          </Field>
          <Field label="დაბადების თარიღი" required>
            <input type="date" className={inputCls} value={form.birthDate} onChange={e => set('birthDate', e.target.value)} required />
          </Field>
          <Field label="სქესი" required>
            <select className={selectCls} value={form.sex} onChange={e => set('sex', e.target.value as 'male' | 'female')} required>
              <option value="male">მამრობითი</option>
              <option value="female">მდედრობითი</option>
            </select>
          </Field>
          <Field label="უცხო ქვეყნის მოქალაქე">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={!!form.isForigner} onChange={e => set('isForigner', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">დიახ</span>
            </label>
          </Field>
          {form.isForigner ? (
            <Field label="პასპორტი / ბინადრობის მოწმობა" required>
              <input className={inputCls} value={form.passportNumber || ''} onChange={e => set('passportNumber', e.target.value)} required />
            </Field>
          ) : (
            <Field label="პირადი ნომერი (11 ციფრი)" required>
              <input
                className={inputCls}
                value={form.personalId}
                onChange={e => set('personalId', e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                pattern="\d{11}"
                required
                placeholder="00000000000"
              />
            </Field>
          )}
        </Section>

        {/* საკონტაქტო */}
        <Section title="საკონტაქტო და მისამართი" icon={<Phone size={18} />}>
          <Field label="მობილური ტელეფონი" required>
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} type="tel" required placeholder="+995 5XX XX XX XX" />
          </Field>
          <Field label="ტელეფონი 2 (არასავალდებულო)">
            <input className={inputCls} value={form.phone2 || ''} onChange={e => set('phone2', e.target.value)} type="tel" />
          </Field>
          <Field label="რეგისტრაციის მისამართი" required colSpan>
            <input className={inputCls} value={form.registrationAddress} onChange={e => set('registrationAddress', e.target.value)} required />
          </Field>
          <Field label="ფაქტობრივი მისამართი" required colSpan>
            <input className={inputCls} value={form.actualAddress} onChange={e => set('actualAddress', e.target.value)} required />
          </Field>
        </Section>

        {/* სამედიცინო */}
        <Section title="სამედიცინო ინფორმაცია" icon={<Heart size={18} />}>
          <Field label="სისხლის ჯგუფი">
            <select className={selectCls} value={form.bloodType || ''} onChange={e => set('bloodType', e.target.value || undefined)}>
              <option value="">— არ არის მითითებული —</option>
              <option value="I">I (0)</option>
              <option value="II">II (A)</option>
              <option value="III">III (B)</option>
              <option value="IV">IV (AB)</option>
            </select>
          </Field>
          <Field label="Rh-ფაქტორი">
            <select className={selectCls} value={form.rhFactor || ''} onChange={e => set('rhFactor', e.target.value || undefined)}>
              <option value="">— —</option>
              <option value="positive">Rh(+) დადებითი</option>
              <option value="negative">Rh(−) უარყოფითი</option>
            </select>
          </Field>
          <Field label="ალერგიები" colSpan>
            <textarea className={textareaCls} rows={2} value={form.allergies || ''} onChange={e => set('allergies', e.target.value)} placeholder="მიუთითეთ ალერგიები (მედიკამენტები, საკვები, გარემო...)"/>
          </Field>
          <Field label="ქრონიკული დაავადებები" colSpan>
            <textarea className={textareaCls} rows={2} value={form.chronicDiseases || ''} onChange={e => set('chronicDiseases', e.target.value)} placeholder="ქრონიკული დაავადებები, მდგომარეობები..."/>
          </Field>
        </Section>

        {/* დაზღვევა */}
        <Section title="დაზღვევა" icon={<Shield size={18} />}>
          <Field label="დაზღვევის სტატუსი" required>
            <select className={selectCls} value={form.insuranceStatus} onChange={e => set('insuranceStatus', e.target.value as InsuranceStatus)} required>
              {Object.entries(INSURANCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          {form.insuranceStatus !== 'none' && (
            <Field label="პოლისის / ბარათის №">
              <input className={inputCls} value={form.insuranceNumber || ''} onChange={e => set('insuranceNumber', e.target.value)} />
            </Field>
          )}
        </Section>

        {/* კანონიერი წარმომადგენელი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-blue-600"><User size={18} /></span>
              <h3 className="font-semibold text-gray-700 text-sm">კანონიერი წარმომადგენელი</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={hasRep} onChange={e => setHasRep(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              ესაჭიროება
            </label>
          </div>
          {hasRep && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="სახელი/გვარი" required>
                <input className={inputCls} value={form.legalRepresentative?.fullName || ''} onChange={e => set('legalRepresentative', { ...form.legalRepresentative, fullName: e.target.value })} required />
              </Field>
              <Field label="ნათესაობა" required>
                <input className={inputCls} value={form.legalRepresentative?.relationship || ''} onChange={e => set('legalRepresentative', { ...form.legalRepresentative, relationship: e.target.value })} required placeholder="მეუღლე, მშობელი, შვილი..." />
              </Field>
              <Field label="ტელეფონი" required>
                <input className={inputCls} value={form.legalRepresentative?.phone || ''} onChange={e => set('legalRepresentative', { ...form.legalRepresentative, phone: e.target.value })} type="tel" required />
              </Field>
              <Field label="პირადი №">
                <input className={inputCls} value={form.legalRepresentative?.personalId || ''} onChange={e => set('legalRepresentative', { ...form.legalRepresentative, personalId: e.target.value })} />
              </Field>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            გაუქმება
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Save size={16} />
            {saving ? 'ინახება...' : (existing ? 'შენახვა' : 'რეგისტრაცია')}
          </button>
        </div>
      </form>
    </div>
  );
}
