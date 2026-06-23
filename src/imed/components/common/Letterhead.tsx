import React from 'react';
import type { ClinicConfig, Patient } from '../../types';

interface Props {
  clinic: ClinicConfig | null;
  patient?: Patient;
  docTitle: string;
  formNumber?: string;
  formLegalRef?: string;
  episodeNumber?: string;
  printDate?: string;
  /** ლაბორატორიული ბლანკი — ცალკე სატიტულე გამოიყენება */
  isLab?: boolean;
}

export function Letterhead({
  clinic,
  patient,
  docTitle,
  formNumber,
  formLegalRef,
  episodeNumber,
  printDate,
  isLab,
}: Props) {
  const now = printDate || new Date().toLocaleString('ka-GE');
  const titleUrl = isLab ? (clinic?.labTitlePageUrl || clinic?.titlePageUrl) : clinic?.titlePageUrl;

  return (
    <>
    {/* სატიტულე ფურცელი — მხოლოდ ბეჭდვისას, ყველა ბლანკის ზემოთ */}
    {titleUrl && (
      <div className="print-title-page" style={{ textAlign: 'center', marginBottom: 12 }}>
        <img src={titleUrl} alt="სატიტულე" style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
      </div>
    )}
    <div className="letterhead-block print-only border-b-2 border-gray-700 pb-4 mb-6">
      {/* კლინიკის სათაური */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {clinic?.logoUrl && (
            <img src={clinic.logoUrl} alt="ლოგო" className="h-14 mb-2 object-contain" />
          )}
          <div className="text-lg font-bold text-gray-900">{clinic?.name || 'სამედიცინო დაწესებულება'}</div>
          {clinic?.address && <div className="text-sm text-gray-600">{clinic.address}</div>}
          {clinic?.phone && <div className="text-sm text-gray-600">ტელ: {clinic.phone}</div>}
          {clinic?.licenseNumber && (
            <div className="text-xs text-gray-500">ლიცენზია №{clinic.licenseNumber}</div>
          )}
        </div>
        <div className="text-right text-xs text-gray-500 ml-4 min-w-[140px]">
          <div>თარიღი: {now}</div>
          {episodeNumber && <div>ეპიზოდი: {episodeNumber}</div>}
        </div>
      </div>

      {/* დოკუმენტის სათაური */}
      <div className="text-center my-4">
        <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">{docTitle}</h2>
        {formNumber && <div className="text-xs text-gray-500 mt-0.5">ფორმა №{formNumber}</div>}
      </div>

      {/* პაციენტის ბლოკი */}
      {patient && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <div>
            <span className="font-medium text-gray-600">პაციენტი:</span>{' '}
            <span className="font-semibold">{patient.lastName} {patient.firstName}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">დ/თ:</span>{' '}
            {patient.birthDate}
          </div>
          <div>
            <span className="font-medium text-gray-600">პირადი №:</span>{' '}
            {patient.personalId}
          </div>
          <div>
            <span className="font-medium text-gray-600">ბარათი №:</span>{' '}
            {patient.cardNumber}
          </div>
          {patient.sex && (
            <div>
              <span className="font-medium text-gray-600">სქესი:</span>{' '}
              {patient.sex === 'male' ? 'მამრობითი' : 'მდედრობითი'}
            </div>
          )}
          {patient.bloodType && (
            <div>
              <span className="font-medium text-gray-600">სისხ. ჯგ:</span>{' '}
              {patient.bloodType}
              {patient.rhFactor ? (patient.rhFactor === 'positive' ? ' Rh(+)' : ' Rh(-)') : ''}
            </div>
          )}
        </div>
      )}

      {/* სამართლებრივი ციტატა */}
      {formLegalRef && (
        <div className="mt-2 text-xs text-gray-500 italic">{formLegalRef}</div>
      )}
    </div>
    </>
  );
}

interface SignatureBlockProps {
  doctorName?: string;
  doctorSignatureUrl?: string;
  nurseName?: string;
  nurseSignatureUrl?: string;
  signedAt?: string;
}

export function SignatureBlock({
  doctorName,
  doctorSignatureUrl,
  nurseName,
  nurseSignatureUrl,
  signedAt,
}: SignatureBlockProps) {
  return (
    <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
      <div>
        <div className="font-medium text-gray-700 mb-2">მკურნალი ექიმი:</div>
        {doctorSignatureUrl ? (
          <img src={doctorSignatureUrl} alt="ხელმოწერა" className="h-12 mb-1" />
        ) : (
          <div className="border-b border-gray-400 h-10 mb-1" />
        )}
        <div className="text-gray-600">{doctorName || '________________________'}</div>
        <div className="text-xs text-gray-500 mt-1">
          {signedAt ? `თარიღი: ${signedAt}` : 'თარიღი: ____________'}
        </div>
      </div>
      {nurseName !== undefined && (
        <div>
          <div className="font-medium text-gray-700 mb-2">ექთანი:</div>
          {nurseSignatureUrl ? (
            <img src={nurseSignatureUrl} alt="ხელმოწერა" className="h-12 mb-1" />
          ) : (
            <div className="border-b border-gray-400 h-10 mb-1" />
          )}
          <div className="text-gray-600">{nurseName || '________________________'}</div>
          <div className="text-xs text-gray-500 mt-1">
            {signedAt ? `თარიღი: ${signedAt}` : 'თარიღი: ____________'}
          </div>
        </div>
      )}
    </div>
  );
}
