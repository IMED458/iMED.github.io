import React from 'react';
import type { LabResult, Patient, ClinicConfig } from '../../types';

interface Props {
  result?: LabResult;
  results?: LabResult[];
  patient: Patient | null;
  clinic: ClinicConfig | null;
  orderingDoctor?: string;
}

function calcAge(bd: string): number {
  if (!bd) return 0;
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}
function flagMark(flag: string): string {
  if (flag === 'high' || flag === 'critical_high') return '↑';
  if (flag === 'low' || flag === 'critical_low') return '↓';
  return '';
}
function fmtDT(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const cellTd: React.CSSProperties = { border: '1px solid #ccc', padding: '2px 6px', fontSize: 11 };

// ლაბორატორიული პასუხის ოფიციალური ბეჭდვადი ფურცელი
// აერთიანებს ერთ ან რამდენიმე კვლევას ერთ დოკუმენტში
export default function LabResultSheet({ result, results, patient, clinic, orderingDoctor }: Props) {
  const list: LabResult[] = results && results.length ? results : result ? [result] : [];
  if (list.length === 0 || !patient) return null;

  const first = list[0];
  const sexLabel = patient.sex === 'male' ? 'მამრობითი' : 'მდედრობითი';
  const performer = list.find(r => r.performedByName)?.performedByName || '';
  const labDoctor = list.find(r => r.confirmedByName)?.confirmedByName || performer;

  const clinicName = clinic?.name || 'შპს „თბილისის სახელმწიფო სამედიცინო უნივერსიტეტისა და ინგოროყვას მაღალი სამედიცინო ტექნოლოგიების საუნივერსიტეტო კლინიკა"';
  const clinicAddr = clinic?.address || 'საქართველო, თბილისი 0144, წინანდლის ქ. N9';

  return (
    <div className="lab-result-sheet" style={{ color: '#000', fontSize: 12, fontFamily: "'Noto Sans Georgian', sans-serif" }}>
      {/* ლოგო/სათაური */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 6, marginBottom: 8 }}>
        {clinic?.titlePageUrl || clinic?.labTitlePageUrl ? (
          <img src={clinic.labTitlePageUrl || clinic.titlePageUrl} alt="" style={{ maxHeight: 70, objectFit: 'contain' }} />
        ) : (
          <div style={{ fontWeight: 700, fontSize: 13 }}>{clinicName}</div>
        )}
      </div>

      {/* პაციენტის ბლოკი */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', verticalAlign: 'top', padding: '1px 4px' }}>
              <div><b>პაციენტი:</b> {patient.lastName} {patient.firstName}, {calcAge(patient.birthDate)} წ.</div>
              <div><b>სქესი, დაბ.თარიღი:</b> {sexLabel} • {patient.birthDate}</div>
              <div><b>ID კოდი:</b> {patient.personalId} • {patient.historyNumber || patient.cardNumber}</div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', padding: '1px 4px' }}>
              <div><b>შეკვეთის №:</b> {first.referralNumber || '—'} • {patient.historyNumber || patient.cardNumber}</div>
              <div><b>ექიმი:</b> {orderingDoctor || '—'}</div>
              <div><b>მასალა:</b> {first.material || 'სისხლი'} • {fmtDT(first.createdAt)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '4px 0 8px' }}>
        ლაბორატორიული კვლევის შედეგები
      </div>

      {/* თითო კვლევა — ცალკე ჯგუფი */}
      {list.map((r, gi) => (
        <div key={gi} className="imed-print-block" style={{ marginBottom: 12 }}>
          <div style={{ background: '#eef2f7', border: '1px solid #ccc', borderBottom: 'none', padding: '3px 6px', fontWeight: 700, fontSize: 12 }}>
            {r.groupCode ? `${r.groupCode}   ` : ''}{r.groupName || r.testName}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f7f7' }}>
                <th style={{ ...cellTd, textAlign: 'left' }}>მაჩვენებელი</th>
                <th style={{ ...cellTd, textAlign: 'left', width: 70 }}>კოდი</th>
                <th style={{ ...cellTd, textAlign: 'center', width: 24 }}></th>
                <th style={{ ...cellTd, textAlign: 'left', width: 80 }}>შედეგი</th>
                <th style={{ ...cellTd, textAlign: 'left', width: 70 }}>ერთეული</th>
                <th style={{ ...cellTd, textAlign: 'left', width: 100 }}>რეფ.ინტ.</th>
              </tr>
            </thead>
            <tbody>
              {r.parameters.map((p, i) => {
                const abn = p.flag !== 'normal';
                return (
                  <tr key={i}>
                    <td style={cellTd}>{p.name}</td>
                    <td style={{ ...cellTd, fontFamily: 'monospace' }}>{p.code.startsWith('CUSTOM') ? '' : p.code}</td>
                    <td style={{ ...cellTd, textAlign: 'center', fontWeight: 700, color: p.flag === 'high' ? '#c00' : p.flag === 'low' ? '#06c' : '#000' }}>{flagMark(p.flag)}</td>
                    <td style={{ ...cellTd, fontWeight: abn ? 700 : 400 }}>{p.value || '—'}</td>
                    <td style={cellTd}>{p.unit}</td>
                    <td style={cellTd}>{p.refRange}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {r.comment && <div style={{ fontSize: 11, padding: '2px 4px' }}><b>კომენტარი:</b> {r.comment}</div>}
        </div>
      ))}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #333', marginTop: 14, paddingTop: 6, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>ანალიზის შემსრულებელი: <b>{performer || '—'}</b></div>
          <div>ექიმი ლაბორანტი: <b>{labDoctor || '—'}</b></div>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: '#444' }}>
          {clinicName}<br />{clinicAddr}
        </div>
      </div>
    </div>
  );
}
