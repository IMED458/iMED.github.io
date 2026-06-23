import React, { useEffect, useState, useRef } from 'react';
import {
  firestore, COLLECTIONS, collection, getDocs, query, limit, setDoc, doc, addDoc,
  firebaseStorage, ref, uploadBytes, getDownloadURL,
} from '../../firebase/db';
import type { ClinicConfig } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import { Save, Upload, Settings, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function SettingsPage() {
  const { imedUser } = useAuthStore();
  const [config, setConfig] = useState<Partial<ClinicConfig>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '',
    taxId: '',
    director: '',
    headDoctor: '',
  });
  const [docId, setDocId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [titleFile, setTitleFile] = useState<File | null>(null);
  const [titlePreview, setTitlePreview] = useState<string>('');
  const [labTitleFile, setLabTitleFile] = useState<File | null>(null);
  const [labTitlePreview, setLabTitlePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const logoRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const labTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!firestore) { setLoading(false); return; }
    getDocs(query(collection(firestore, COLLECTIONS.CLINIC_CONFIG), limit(1))).then(snap => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as ClinicConfig;
        setDocId(d.id);
        setConfig(data);
        if (data.logoUrl) setLogoPreview(data.logoUrl);
        if (data.titlePageUrl) setTitlePreview(data.titlePageUrl);
        if (data.labTitlePageUrl) setLabTitlePreview(data.labTitlePageUrl);
      }
      setLoading(false);
    });
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imedUser || !firestore) return;
    setSaving(true);
    try {
      let logoUrl = config.logoUrl;
      if (logoFile && firebaseStorage) {
        const sRef = ref(firebaseStorage, 'imed/clinic/logo.png');
        await uploadBytes(sRef, logoFile);
        logoUrl = await getDownloadURL(sRef);
      }
      let titlePageUrl = config.titlePageUrl;
      if (titleFile && firebaseStorage) {
        const sRef = ref(firebaseStorage, 'imed/clinic/titlepage.png');
        await uploadBytes(sRef, titleFile);
        titlePageUrl = await getDownloadURL(sRef);
      }
      let labTitlePageUrl = config.labTitlePageUrl;
      if (labTitleFile && firebaseStorage) {
        const sRef = ref(firebaseStorage, 'imed/clinic/lab-titlepage.png');
        await uploadBytes(sRef, labTitleFile);
        labTitlePageUrl = await getDownloadURL(sRef);
      }
      const data: Omit<ClinicConfig, 'id'> = {
        ...config as any,
        logoUrl,
        titlePageUrl,
        labTitlePageUrl,
        updatedAt: new Date().toISOString(),
      };
      if (docId) {
        await setDoc(doc(firestore, COLLECTIONS.CLINIC_CONFIG, docId), data);
      } else {
        const r = await addDoc(collection(firestore, COLLECTIONS.CLINIC_CONFIG), data);
        setDocId(r.id);
      }
      setConfig(prev => ({ ...prev, logoUrl, titlePageUrl, labTitlePageUrl }));
      const { clearClinicConfigCache } = await import('./clinicConfig');
      clearClinicConfigCache();
      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: 'update', resourceType: 'clinic_config',
        description: 'კლინიკის კონფიგურაცია განახლდა',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof ClinicConfig, v: string) => setConfig(prev => ({ ...prev, [k]: v }));

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">კლინიკის პარამეტრები</h2>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 size={16} /> პარამეტრები შეინახა
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* ლოგო */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">ლოგო და Letterhead</h3>
          <div className="flex items-start gap-5">
            <div className="w-32 h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
              {logoPreview ? (
                <img src={logoPreview} alt="ლოგო" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-xs text-gray-400 text-center">ლოგო</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" ref={logoRef} onChange={handleLogoChange} className="hidden" />
              <button type="button" onClick={() => logoRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Upload size={16} /> ლოგოს ატვირთვა
              </button>
              <p className="text-xs text-gray-400 mt-1.5">PNG/SVG. ნაჩვენებია ყველა ბეჭდვად დოკუმენტში.</p>
            </div>
          </div>
        </div>

        {/* სატიტულე ფურცლები */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-1 text-sm">სატიტულე ფურცლები (Letterhead)</h3>
          <p className="text-xs text-gray-400 mb-4">სატიტულე ჯდება ყველა ბლანკის ზემოთ ბეჭდვისას. ლაბორატორიას ცალკე სატიტულე აქვს, დანარჩენებს — ერთი საერთო.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">ზოგადი სატიტულე (ყველა ბლანკი)</div>
              <div className="w-full h-32 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 mb-2">
                {titlePreview ? <img src={titlePreview} alt="title" className="w-full h-full object-contain p-1" /> : <span className="text-xs text-gray-400">სატიტულე ფურცელი</span>}
              </div>
              <input type="file" accept="image/*" ref={titleRef} onChange={e => { const f = e.target.files?.[0]; if (f) { setTitleFile(f); setTitlePreview(URL.createObjectURL(f)); } }} className="hidden" />
              <button type="button" onClick={() => titleRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center">
                <Upload size={16} /> ატვირთვა
              </button>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">ლაბორატორიის სატიტულე</div>
              <div className="w-full h-32 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 mb-2">
                {labTitlePreview ? <img src={labTitlePreview} alt="lab title" className="w-full h-full object-contain p-1" /> : <span className="text-xs text-gray-400">ლაბ. სატიტულე</span>}
              </div>
              <input type="file" accept="image/*" ref={labTitleRef} onChange={e => { const f = e.target.files?.[0]; if (f) { setLabTitleFile(f); setLabTitlePreview(URL.createObjectURL(f)); } }} className="hidden" />
              <button type="button" onClick={() => labTitleRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center">
                <Upload size={16} /> ატვირთვა
              </button>
            </div>
          </div>
        </div>

        {/* ძირითადი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">კლინიკის მონაცემები</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">დასახელება *</label>
              <input className={inputCls} value={config.name || ''} onChange={e => set('name', e.target.value)} required placeholder="ООО კლინიკა სტელა..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">მისამართი</label>
              <input className={inputCls} value={config.address || ''} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ტელეფონი</label>
              <input className={inputCls} value={config.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ელ-ფოსტა</label>
              <input type="email" className={inputCls} value={config.email || ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ვებ-გვერდი</label>
              <input className={inputCls} value={config.website || ''} onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">სალიცენზიო №</label>
              <input className={inputCls} value={config.licenseNumber || ''} onChange={e => set('licenseNumber', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">საიდ. კოდი (ს/ნ)</label>
              <input className={inputCls} value={config.taxId || ''} onChange={e => set('taxId', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">დირექტორი</label>
              <input className={inputCls} value={config.director || ''} onChange={e => set('director', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">მთ. ექიმი</label>
              <input className={inputCls} value={config.headDoctor || ''} onChange={e => set('headDoctor', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Save size={16} />
            {saving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </div>
  );
}
