import React from 'react';
import type { Patient, ClinicConfig, ImedUser } from '../../types';
import type { EmergencySheet } from './clinicalService';
import { DIAGNOSIS_KIND_LABELS } from './clinicalService';
import { Letterhead } from '../../components/common/Letterhead';

// ემერჯენსის გასინჯვის ფურცლის ბეჭდვადი ხედი (plain text, A4)
export default function EmergencyPrintView({ sheet, patient, clinic, doctor }: {
  sheet: EmergencySheet; patient: Patient; clinic: ClinicConfig | null; doctor?: ImedUser | null;
}) {
  return (
    <div className="imed-print-block" style={{ color: '#000', fontSize: 12, lineHeight: 1.5 }}>
      <Letterhead clinic={clinic} patient={patient} docTitle="ემერჯენსის გასინჯვის ფურცელი"
        formLegalRef="გადაუდებელი დახმარების სამედიცინო დოკუმენტაცია — №108/ნ" />

      <Block label="ჩივილები" v={sheet.complaints} />
      <Block label="დაავადების ანამნეზი" v={sheet.anamnesis} />
      <Block label="ობიექტური გასინჯვა — Status localis" v={sheet.statusLocalis} />

      <div style={{ marginTop: 6 }}>
        <b>დიაგნოზი (ICD-10):</b>
        {sheet.diagnoses.length === 0 ? ' —' : (
          <div style={{ paddingLeft: 14 }}>
            {sheet.diagnoses.map((d, i) => (
              <div key={i}>{d.code} — {d.name} <i>({DIAGNOSIS_KIND_LABELS[d.kind]})</i></div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
        <div>თარიღი: <b>{sheet.examDate}</b> &nbsp; დრო: <b>{sheet.examTime}</b></div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div><b>მკურნალი ექიმი:</b> {sheet.doctorName || '—'}</div>
        {doctor?.signatureUrl && <img src={doctor.signatureUrl} alt="ხელმოწერა" style={{ height: 40, marginTop: 4 }} />}
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>ხელმოწერა</div>
      </div>
    </div>
  );
}

function Block({ label, v }: { label: string; v?: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <b>{label}:</b>
      <div style={{ paddingLeft: 14, whiteSpace: 'pre-wrap' }}>{v || '—'}</div>
    </div>
  );
}
