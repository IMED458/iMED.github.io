import React from 'react';
import type { LabResult, Patient, ClinicConfig } from '../../types';
import { Letterhead } from '../common/Letterhead';

interface Props {
  result: LabResult;
  patient: Patient | null;
  clinic: ClinicConfig | null;
}

function flagMark(flag: string): string {
  if (flag === 'high' || flag === 'critical_high') return '↑';
  if (flag === 'low' || flag === 'critical_low') return '↓';
  return '';
}

// ლაბორატორიული პასუხის ბეჭდვადი ფურცელი — ლაბ. სატიტულე ზემოთ
export default function LabResultSheet({ result, patient, clinic }: Props) {
  return (
    <div className="lab-result-sheet" style={{ color: '#000' }}>
      <Letterhead
        clinic={clinic}
        patient={patient || undefined}
        docTitle="ლაბორატორიული კვლევის პასუხი"
        formLegalRef="ლაბორატორიული დიაგნოსტიკის სტანდარტი"
        isLab
      />

      <div style={{ margin: '8px 0 4px', fontWeight: 700, fontSize: 14 }}>
        {result.testName}
        {result.referralNumber && <span style={{ float: 'right', fontFamily: 'monospace', fontWeight: 400 }}>მიმართვა №{result.referralNumber}</span>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'left' }}>პარამეტრი</th>
            <th style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'left' }}>შედეგი</th>
            <th style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'left' }}>ერთეული</th>
            <th style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'left' }}>ნორმა</th>
          </tr>
        </thead>
        <tbody>
          {result.parameters.map((p, i) => {
            const abn = p.flag !== 'normal';
            return (
              <tr key={i}>
                <td style={{ border: '1px solid #999', padding: '4px 6px' }}>{p.name}</td>
                <td style={{ border: '1px solid #999', padding: '4px 6px', fontWeight: abn ? 700 : 400 }}>
                  {p.value || '—'} {flagMark(p.flag)}
                </td>
                <td style={{ border: '1px solid #999', padding: '4px 6px' }}>{p.unit}</td>
                <td style={{ border: '1px solid #999', padding: '4px 6px' }}>{p.refRange}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {result.comment && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <b>კომენტარი:</b> {result.comment}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <div>
          <div>შემსრულებელი ლაბორანტი: <b>{result.performedByName || '—'}</b></div>
          <div>დამადასტურებელი: <b>{result.confirmedByName || '—'}</b></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>დადასტურების დრო:</div>
          <div><b>{result.confirmedAt ? new Date(result.confirmedAt).toLocaleString('ka-GE') : '—'}</b></div>
        </div>
      </div>
    </div>
  );
}
