import React from 'react';
import type { Patient, ClinicConfig, ImedUser } from '../../types';
import type { Form100Data, DiagnosisEntry } from './clinicalService';
import { Letterhead } from '../../components/common/Letterhead';

function calcAge(bd: string): number {
  if (!bd) return 0;
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}
const diagText = (list: DiagnosisEntry[]) => list.map(d => `${d.code} — ${d.name}`).join('; ') || '—';

// ფორმა 100-ის ოფიციალური ბეჭდვადი ხედი (plain text, A4)
export default function Form100PrintView({ form, patient, clinic, doctor }: {
  form: Form100Data; patient: Patient; clinic: ClinicConfig | null; doctor?: ImedUser | null;
}) {
  return (
    <div className="imed-print-block" style={{ color: '#000', fontSize: 12, lineHeight: 1.5 }}>
      <Letterhead clinic={clinic} docTitle="ცნობა ჯანმრთელობის მდგომარეობის შესახებ"
        formNumber="IV-100/ა"
        formLegalRef="დამტკიცებულია საქართველოს შრომის, ჯანმრთელობისა და სოციალური დაცვის მინისტრის 2007 წ. 9 აგვისტოს №338/ნ ბრძანებით — ფორმა № IV-100/ა" />

      <P n="1" label="ცნობის გამცემი დაწესებულება" v={form.issuer || clinic?.name} />
      <P n="2" label="ცნობა იგზავნება" v={form.sentTo} />
      <P n="3" label="პაციენტი" v={`${patient.lastName} ${patient.firstName}`} />
      <P n="4" label="დაბადების თარიღი" v={`${patient.birthDate} (${calcAge(patient.birthDate)} წ.)`} />
      <P n="5" label="პირადი ნომერი" v={patient.personalId} />
      <P n="6" label="მისამართი" v={patient.actualAddress || patient.registrationAddress} />
      <P n="—" label="ისტორიის №" v={patient.historyNumber || patient.cardNumber} />
      <P n="7" label="სამუშაო ადგილი / სასწავლო დაწესებულება" v={form.workplace} />

      <div style={{ marginTop: 4 }}><b>8. თარიღები:</b>
        <div style={{ paddingLeft: 14 }}>
          <div>ა) ამბულატორიაში მიმართვის: {form.dateAmbulatory || '—'}</div>
          <div>ბ) სტაციონარში გაგზავნის: {form.dateSentStationar || '—'}</div>
          <div>გ) სტაციონარში მოთავსების: {form.dateAdmission || '—'}</div>
          <div>დ) გაწერის: {form.dateDischarge || '—'}</div>
        </div>
      </div>

      <div style={{ marginTop: 4 }}><b>9. სრული დიაგნოზი:</b>
        <div style={{ paddingLeft: 14 }}>
          <div>ძირითადი დაავადება(ები): {diagText(form.diagMain)}</div>
          <div>თანმხლები დაავადება(ები): {diagText(form.diagSecondary)}</div>
          {form.complications && <div>გართულებები: {form.complications}</div>}
        </div>
      </div>

      <Block n="10" label="გადატანილი დაავადებები" v={form.pastDiseases} />
      <Block n="11" label="მოკლე ანამნეზი" v={form.briefAnamnesis} />
      <Block n="12" label="ჩატარებული დიაგნოსტიკური გამოკვლევები და კონსულტაციები" v={form.investigations} pre />
      <Block n="13" label="ავადმყოფობის მიმდინარეობა" v={form.courseOfDisease} />
      <Block n="14" label="ჩატარებული მკურნალობა" v={form.treatment} />
      <Block n="15" label="მდგომარეობა სტაციონარში გაგზავნისას" v={form.stateOnAdmission} />
      <Block n="16" label="მდგომარეობა სტაციონარიდან გაწერისას" v={form.stateOnDischarge} />
      <Block n="17" label="სამკურნალო და შრომითი რეკომენდაციები" v={form.recommendations} />

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div><b>18. მკურნალი ექიმი:</b> {form.doctorName || '—'}</div>
          {doctor?.signatureUrl && <img src={doctor.signatureUrl} alt="ხელმოწერა" style={{ height: 40, marginTop: 4 }} />}
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>ხელმოწერა / ბეჭედი</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><b>20. ცნობის გაცემის თარიღი:</b> {form.issueDate || '—'}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 18 }}>დაწესებულების ხელმძღვანელი / მოადგილე ___________</div>
        </div>
      </div>
    </div>
  );
}

function P({ n, label, v }: { n: string; label: string; v?: string }) {
  return <div style={{ marginTop: 2 }}><b>{n}. {label}:</b> {v || '—'}</div>;
}
function Block({ n, label, v, pre }: { n: string; label: string; v?: string; pre?: boolean }) {
  return (
    <div style={{ marginTop: 4 }}>
      <b>{n}. {label}:</b>
      <div style={{ paddingLeft: 14, whiteSpace: pre ? 'pre-wrap' : 'pre-wrap' }}>{v || '—'}</div>
    </div>
  );
}
