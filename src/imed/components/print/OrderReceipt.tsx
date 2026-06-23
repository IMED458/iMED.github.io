import React from 'react';
import type { Order, Patient, ClinicConfig } from '../../types';
import Barcode from './Barcode';

interface Props {
  order: Order;
  patient: Patient;
  clinic: ClinicConfig | null;
  doctorName?: string;
  formCode?: string;
  copies?: number;
}

function calcAge(bd: string): number {
  if (!bd) return 0;
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

// ერთი ქვითარი (მიმართვა ლაბორატორიას) — ატვირთული ფოტოს მსგავსი
function ReceiptCopy({ order, patient, clinic, doctorName, formCode }: Props) {
  const ref = order.referralNumber || order.id.slice(-8).toUpperCase();
  const items = order.items && order.items.length > 0
    ? order.items
    : [{ code: order.serviceCode, name: order.description }];

  return (
    <div className="receipt-copy" style={{ pageBreakInside: 'avoid', padding: '6px 4px', fontSize: 12, color: '#000' }}>
      {/* ბარკოდი + № */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Barcode value={ref} height={42} />
        <div style={{ fontSize: 20, fontWeight: 700, flex: 1, textAlign: 'center' }}>{ref}</div>
        <div style={{ textAlign: 'right', fontSize: 11, minWidth: 120 }}>
          <div>{formCode || 'F-SOP-024A-001-01'}</div>
          <div style={{ fontWeight: 600 }}>{clinic?.nameEn || clinic?.name || ''}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontWeight: 600, margin: '2px 0 6px' }}>
        მიმართვა {order.type === 'laboratory' ? 'ლაბორატორიას' : order.type === 'radiology' ? 'რადიოლოგიას' : order.type === 'consultation' ? 'კონსულტანტს' : 'სამსახურს'}
      </div>

      {/* პაციენტის ბლოკი */}
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>პაციენტი: <b>{patient.lastName} {patient.firstName}</b> ID: {patient.personalId}</span>
          <span>{patient.birthDate} ({calcAge(patient.birthDate)} წლის)</span>
          <span>ისტ. N {patient.historyNumber || patient.cardNumber}</span>
        </div>
        <div>
          გამომგზავნი დაწესებულება / ექიმი: {doctorName || order.requestedByName || ''}
        </div>
        <div>EMail: {clinic?.email || ''}</div>
        <div>მობილური: {patient.phone || ''}</div>
      </div>

      {/* ცხრილი */}
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0', fontSize: 12 }}>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #000', padding: '3px 6px', width: 90, fontFamily: 'monospace' }}>{it.code || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{it.name}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', width: 140 }}>მაისურაძე თეკლა</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span>რეგისტრაციის დრო: {new Date(order.requestedAt).toLocaleString('ka-GE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        <span>მასალის მიღების დრო: ___________</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
        <span>მასალის აღების დრო: ___________</span>
        <span>მასალის აღების პირი: ___________</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
        <span>პაციენტის ნდობით აღჭურვილი (პასუხის ნახვა) პირი: ___________</span>
        <span>მასალის მიმღები პირი: ___________</span>
      </div>
    </div>
  );
}

export default function OrderReceipt(props: Props) {
  const copies = props.copies || 3;
  return (
    <div>
      {Array.from({ length: copies }).map((_, i) => (
        <React.Fragment key={i}>
          <ReceiptCopy {...props} />
          {i < copies - 1 && (
            <div style={{ borderTop: '1px dashed #999', margin: '10px 0' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
