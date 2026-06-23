// ============================================================
// iMED — ლაბორატორიული რეფერენს-დიაპაზონები
// კლინიკის რეალური ნორმებით (ლაბ. PDF-ების მიხედვით)
// ============================================================

import type { Sex } from '../types';

export interface RefRule {
  sex?: Sex;
  minAge?: number;
  maxAge?: number;
  low?: number;
  high?: number;
  text?: string;
}

export interface LabAnalyte {
  code: string;      // მაგ. WBC, pH, ALT
  name: string;      // ქართული დასახელება
  unit: string;
  rules: RefRule[];
}

// ── ანალიტების ბაზა ──
export const LAB_ANALYTES: LabAnalyte[] = [
  // —— CBC+5DIFF (BL.6) ——
  { code: 'WBC', name: 'ლეიკოციტები', unit: '10^9/L', rules: [{ low: 4.40, high: 11.30 }] },
  { code: 'RBC', name: 'ერითროციტები', unit: '10^12/L', rules: [
    { sex: 'male', low: 4.50, high: 5.90 }, { sex: 'female', low: 4.00, high: 5.20 } ]},
  { code: 'HGB', name: 'ჰემოგლობინი', unit: 'g/dl', rules: [
    { sex: 'male', low: 13.50, high: 17.50 }, { sex: 'female', low: 12.00, high: 15.50 } ]},
  { code: 'HCT', name: 'ჰემატოკრიტი', unit: '%', rules: [
    { sex: 'male', low: 40.00, high: 52.00 }, { sex: 'female', low: 36.00, high: 46.00 } ]},
  { code: 'MCV', name: 'ერითროციტების საშუალო მოცულობა', unit: 'fl', rules: [{ low: 80.00, high: 96.00 }] },
  { code: 'MCH', name: 'ჰემოგლობ. საშ. შემცველობა ერითრ-ში', unit: 'pg', rules: [{ low: 27.00, high: 33.00 }] },
  { code: 'MCHC', name: 'ჰემოგლობინის საშ. კონცენტრაცია ერითრ.', unit: 'g/dl', rules: [{ low: 32.00, high: 36.00 }] },
  { code: 'RDW-SD', name: 'ერითროციტების ანიზოციტოზი -SD', unit: 'fl', rules: [{ low: 37.10, high: 45.70 }] },
  { code: 'RDW-CV', name: 'ერითროციტების ანიზოციტოზი CV', unit: '%', rules: [{ low: 12.00, high: 13.60 }] },
  { code: 'PLT', name: 'თრომბოციტები', unit: '10^9/L', rules: [{ low: 140.00, high: 360.00 }] },
  { code: 'PCT', name: 'თრომბოკრიტი', unit: '10^-2 L/L', rules: [{ low: 0.17, high: 0.32 }] },
  { code: 'MPV', name: 'თრომბოციტების საშუალო მოცულობა', unit: 'fl', rules: [{ low: 9.30, high: 12.10 }] },
  { code: 'PDW', name: 'თრომბოციტების ანიზოციტოზი', unit: 'fl', rules: [{ low: 10.10, high: 16.10 }] },
  { code: 'P-LCR', name: 'დიდი ზომის თრომბოციტების წილი', unit: '%', rules: [{ low: 18.50, high: 42.30 }] },
  { code: 'NEUT%', name: 'ნეიტროფილები', unit: '%', rules: [{ low: 41.00, high: 70.70 }] },
  { code: 'NEUT#', name: 'ნეიტროფილები (აბს.)', unit: '10^9/L', rules: [{ low: 1.80, high: 6.98 }] },
  { code: 'LYMPH%', name: 'ლიმფოციტები', unit: '%', rules: [{ low: 19.10, high: 47.90 }] },
  { code: 'LYMPH#', name: 'ლიმფოციტები (აბს.)', unit: '10^9/L', rules: [{ low: 1.10, high: 3.20 }] },
  { code: 'MONO%', name: 'მონოციტები', unit: '%', rules: [{ low: 4.00, high: 12.20 }] },
  { code: 'MONO#', name: 'მონოციტები (აბს.)', unit: '10^9/L', rules: [{ low: 0.10, high: 0.90 }] },
  { code: 'EO%', name: 'ეოზინოფილები', unit: '%', rules: [{ low: 0.50, high: 5.50 }] },
  { code: 'EO#', name: 'ეოზინოფილები (აბს.)', unit: '10^9/L', rules: [{ low: 0.02, high: 0.50 }] },
  { code: 'BASO%', name: 'ბაზოფილები', unit: '%', rules: [{ low: 0.00, high: 1.50 }] },
  { code: 'BASO#', name: 'ბაზოფილები (აბს.)', unit: '10^9/L', rules: [{ low: 0.00, high: 0.10 }] },
  { code: 'ESR', name: 'ედს (ESR)', unit: 'mm/h', rules: [
    { sex: 'male', low: 0, high: 15 }, { sex: 'female', low: 0, high: 20 } ]},

  // —— Blood gas (BL.14) ——
  { code: 'pH', name: 'pH', unit: '', rules: [{ low: 7.32, high: 7.43 }] },
  { code: 'pCO2', name: 'pCO₂', unit: 'mmHg', rules: [{ low: 37.00, high: 50.00 }] },
  { code: 'pO2', name: 'pO₂', unit: 'mmHg', rules: [{ low: 36.00, high: 44.00 }] },
  { code: 'HCO3act', name: 'HCO₃ act', unit: 'mmol/L', rules: [{ low: 22.00, high: 28.00 }] },
  { code: 'HCO3std', name: 'HCO₃ std', unit: 'mmol/L', rules: [{ low: 21.00, high: 26.00 }] },
  { code: 'BE(B)', name: 'BE(B)', unit: 'mmol/L', rules: [{ low: -2, high: 2 }] },
  { code: 'BE(ecf)', name: 'BE(ecf)', unit: 'mmol/L', rules: [{ low: -2, high: 2 }] },
  { code: 'ctCO2', name: 'ctCO₂', unit: 'mmol/L', rules: [{ text: '—' }] },
  { code: 'BO2', name: 'BO₂', unit: 'mL/dL', rules: [{ low: 16.00, high: 24.00 }] },
  { code: 'ctO2v', name: 'ctO₂(v)', unit: 'mL/dL', rules: [{ low: 13.00, high: 18.00 }] },
  { code: 'sO2', name: 'sO₂', unit: '%', rules: [{ low: 95, high: 100 }] },
  { code: 'K', name: 'კალიუმი (K⁺)', unit: 'mmol/L', rules: [{ low: 3.50, high: 5.10 }] },
  { code: 'Na', name: 'ნატრიუმი (Na⁺)', unit: 'mmol/L', rules: [{ low: 136, high: 145 }] },
  { code: 'Cl', name: 'ქლორი (Cl⁻)', unit: 'mmol/L', rules: [{ low: 98, high: 107 }] },
  { code: 'iCa', name: 'იონიზ. კალციუმი (Ca²⁺)', unit: 'mmol/L', rules: [{ low: 1.12, high: 1.32 }] },
  { code: 'Lac', name: 'ლაქტატი', unit: 'mmol/L', rules: [{ low: 0.50, high: 2.20 }] },
  { code: 'Glu', name: 'გლუკოზა (გაზ.)', unit: 'mmol/L', rules: [{ low: 3.90, high: 6.10 }] },

  // —— ბიოქიმია ——
  { code: 'GLUC', name: 'გლუკოზა', unit: 'mmol/L', rules: [{ low: 3.90, high: 6.10 }] },
  { code: 'ALT', name: 'ALT (ალანინამინოტრანსფერაზა)', unit: 'U/L', rules: [
    { sex: 'male', low: 0, high: 41 }, { sex: 'female', low: 0, high: 33 } ]},
  { code: 'AST', name: 'AST (ასპარტატამინოტრანსფერაზა)', unit: 'U/L', rules: [
    { sex: 'male', low: 0, high: 40 }, { sex: 'female', low: 0, high: 32 } ]},
  { code: 'GGT', name: 'GGT (გამა-გლუტამილტრანსფერაზა)', unit: 'U/L', rules: [
    { sex: 'male', low: 10, high: 71 }, { sex: 'female', low: 6, high: 42 } ]},
  { code: 'ALP', name: 'ALP (ტუტე ფოსფატაზა)', unit: 'U/L', rules: [{ low: 40, high: 130 }] },
  { code: 'AMYL', name: 'ამილაზა', unit: 'U/L', rules: [{ low: 28, high: 100 }] },
  { code: 'LIPC', name: 'ლიპაზა', unit: 'U/L', rules: [{ low: 13, high: 60 }] },
  { code: 'LDH', name: 'ლაქტატდეჰიდროგენაზა (LDH)', unit: 'U/L', rules: [{ low: 135, high: 225 }] },
  { code: 'CK', name: 'კრეატინკინაზა (CK)', unit: 'U/L', rules: [
    { sex: 'male', low: 39, high: 308 }, { sex: 'female', low: 26, high: 192 } ]},
  { code: 'CK-MB', name: 'კრეატინკინაზა MB', unit: 'U/L', rules: [{ low: 0, high: 24 }] },
  { code: 'TCHOL', name: 'საერთო ქოლესტერინი', unit: 'mmol/L', rules: [{ low: 0, high: 5.20 }] },
  { code: 'HDL', name: 'HDL ქოლესტერინი', unit: 'mmol/L', rules: [{ low: 1.04, high: 1.55 }] },
  { code: 'LDL', name: 'LDL ქოლესტერინი', unit: 'mmol/L', rules: [{ low: 0, high: 3.37 }] },
  { code: 'TRIG', name: 'ტრიგლიცერიდი', unit: 'mmol/L', rules: [{ low: 0, high: 1.70 }] },
  { code: 'TP', name: 'საერთო ცილა', unit: 'g/L', rules: [{ low: 64, high: 83 }] },
  { code: 'ALB', name: 'ალბუმინი', unit: 'g/L', rules: [{ low: 35, high: 52 }] },
  { code: 'CRE', name: 'კრეატინინი', unit: 'µmol/L', rules: [
    { sex: 'male', low: 62, high: 106 }, { sex: 'female', low: 44, high: 80 } ]},
  { code: 'UREA', name: 'შარდოვანა', unit: 'mmol/L', rules: [{ low: 2.50, high: 7.10 }] },
  { code: 'UA', name: 'შარდმჟავა', unit: 'µmol/L', rules: [
    { sex: 'male', low: 202, high: 416 }, { sex: 'female', low: 142, high: 339 } ]},
  { code: 'TBIL', name: 'საერთო ბილირუბინი', unit: 'µmol/L', rules: [{ low: 3.4, high: 20.5 }] },
  { code: 'DBIL', name: 'პირდაპირი ბილირუბინი', unit: 'µmol/L', rules: [{ low: 0, high: 5.1 }] },
  { code: 'CA', name: 'საერთო კალციუმი', unit: 'mmol/L', rules: [{ low: 2.15, high: 2.55 }] },
  { code: 'P', name: 'ფოსფორი', unit: 'mmol/L', rules: [{ low: 0.81, high: 1.45 }] },
  { code: 'MG', name: 'მაგნიუმი', unit: 'mmol/L', rules: [{ low: 0.66, high: 1.07 }] },
  { code: 'IRON', name: 'რკინა', unit: 'µmol/L', rules: [
    { sex: 'male', low: 11, high: 28 }, { sex: 'female', low: 7, high: 26 } ]},
  { code: 'CRP', name: 'C-რეაქტიული ცილა (CRP)', unit: 'mg/L', rules: [{ low: 0, high: 5 }] },
  { code: 'HBA1c', name: 'გლიკოზირებული ჰემოგლობინი (HbA1c)', unit: '%', rules: [{ low: 4.0, high: 6.0 }] },
  { code: 'AMMONIA', name: 'ამიაკი', unit: 'µmol/L', rules: [{ low: 16, high: 60 }] },

  // —— კოაგულაცია ——
  { code: 'PT', name: 'პროთრომბინის დრო (PT)', unit: 'sec', rules: [{ low: 11, high: 14 }] },
  { code: 'INR', name: 'INR', unit: '', rules: [{ low: 0.8, high: 1.2 }] },
  { code: 'APTT', name: 'APTT', unit: 'sec', rules: [{ low: 25, high: 38 }] },
  { code: 'FIB', name: 'ფიბრინოგენი', unit: 'g/L', rules: [{ low: 2.0, high: 4.0 }] },
  { code: 'TT', name: 'თრომბინის დრო (TT)', unit: 'sec', rules: [{ low: 14, high: 21 }] },
  { code: 'DDIMER', name: 'D-დიმერი', unit: 'µg/mL', rules: [{ low: 0, high: 0.5 }] },

  // —— იმუნოლოგია / ჰორმონები ——
  { code: 'TSH', name: 'TSH', unit: 'mIU/L', rules: [{ low: 0.27, high: 4.20 }] },
  { code: 'FT4', name: 'თავისუფალი თიროქსინი (FT4)', unit: 'pmol/L', rules: [{ low: 12.0, high: 22.0 }] },
  { code: 'FT3', name: 'თავისუფალი ტრიიოდთირონინი (FT3)', unit: 'pmol/L', rules: [{ low: 3.1, high: 6.8 }] },
  { code: 'TROP', name: 'ტროპონინი HS', unit: 'ng/L', rules: [{ low: 0, high: 14 }] },
  { code: 'FERR', name: 'ფერიტინი', unit: 'ng/mL', rules: [
    { sex: 'male', low: 30, high: 400 }, { sex: 'female', low: 13, high: 150 } ]},
  { code: 'VITD', name: 'ვიტამინი D (Total)', unit: 'ng/mL', rules: [{ low: 30, high: 100 }] },
  { code: 'VITB12', name: 'ვიტამინი B12', unit: 'pg/mL', rules: [{ low: 197, high: 771 }] },
  { code: 'PSA', name: 'PSA (საერთო)', unit: 'ng/mL', rules: [{ low: 0, high: 4.0 }] },
  { code: 'NTBNP', name: 'NT-proBNP', unit: 'pg/mL', rules: [{ low: 0, high: 125 }] },
  { code: 'PCT', name: 'პროკალციტონინი', unit: 'ng/mL', rules: [{ low: 0, high: 0.5 }] },
];

// ── პანელები: ჯგუფის კოდი + დასახელება + ანალიტების კოდები ──
export interface LabPanel {
  key: string;
  groupCode: string;   // მაგ. BL.6
  groupName: string;   // მაგ. სისხლის საერთო ანალიზი (CBC+5DIFF)
  analytes: string[];
}

export const LAB_PANELS: LabPanel[] = [
  { key: 'CBC5', groupCode: 'BL.6', groupName: 'სისხლის საერთო ანალიზი (CBC+5DIFF)',
    analytes: ['WBC','RBC','HGB','HCT','MCV','MCH','MCHC','RDW-SD','RDW-CV','PLT','PCT','MPV','PDW','P-LCR','NEUT%','NEUT#','LYMPH%','LYMPH#','MONO%','MONO#','EO%','EO#','BASO%','BASO#'] },
  { key: 'CBC', groupCode: 'BL.5', groupName: 'სისხლის საერთო ანალიზი (CBC)',
    analytes: ['WBC','RBC','HGB','HCT','MCV','MCH','MCHC','PLT'] },
  { key: 'GAS', groupCode: 'BL.14', groupName: 'არტერიული/ვენური სისხლის გაზები და ელექტროლიტები',
    analytes: ['pH','pCO2','pO2','HCO3act','HCO3std','BE(B)','BE(ecf)','ctCO2','BO2','ctO2v','sO2','K','Na','Cl','iCa','Lac','Glu'] },
  { key: 'ELYTES', groupCode: 'BL.3', groupName: 'ელექტროლიტები',
    analytes: ['K','Na','Cl','iCa'] },
  { key: 'COAG', groupCode: 'CO.1', groupName: 'კოაგულოგრამა',
    analytes: ['PT','INR','APTT','FIB','TT'] },
  { key: 'LIPID', groupCode: 'BC.5', groupName: 'ლიპიდური პროფილი',
    analytes: ['TCHOL','HDL','LDL','TRIG'] },
  { key: 'LIVER', groupCode: 'BC.2', groupName: 'ღვიძლის პანელი',
    analytes: ['ALT','AST','GGT','ALP','TBIL','DBIL','TP','ALB'] },
  { key: 'RENAL', groupCode: 'BC.3', groupName: 'თირკმლის პანელი',
    analytes: ['CRE','UREA','UA'] },
  { key: 'THYROID', groupCode: 'IM.1', groupName: 'ფარისებრი ჯირკვლის პანელი',
    analytes: ['TSH','FT4','FT3'] },
];

// ── დამხმარეები ──
export function findAnalyte(code: string): LabAnalyte | undefined {
  return LAB_ANALYTES.find(a => a.code === code);
}

export function findPanel(key: string): LabPanel | undefined {
  return LAB_PANELS.find(p => p.key === key);
}

export function getReference(analyte: LabAnalyte, sex: Sex, ageYears: number): RefRule | undefined {
  const matches = analyte.rules.filter(r => {
    if (r.sex && r.sex !== sex) return false;
    if (r.minAge !== undefined && ageYears < r.minAge) return false;
    if (r.maxAge !== undefined && ageYears > r.maxAge) return false;
    return true;
  });
  if (matches.length === 0) return analyte.rules[0];
  return matches.sort((a, b) => (b.sex ? 1 : 0) - (a.sex ? 1 : 0))[0];
}

export function formatRange(rule?: RefRule): string {
  if (!rule) return '';
  if (rule.text) return rule.text === '—' ? '' : rule.text;
  const fmt = (n: number) => (n < 0 ? `(${n})` : `${n}`);
  if (rule.low !== undefined && rule.high !== undefined) return `${fmt(rule.low)} - ${fmt(rule.high)}`;
  if (rule.high !== undefined) return `< ${rule.high}`;
  if (rule.low !== undefined) return `> ${rule.low}`;
  return '';
}

export type LabFlag = 'normal' | 'high' | 'low';

export function flagValue(value: number, rule?: RefRule): LabFlag {
  if (!rule || (rule.low === undefined && rule.high === undefined)) return 'normal';
  if (rule.high !== undefined && value > rule.high) return 'high';
  if (rule.low !== undefined && value < rule.low) return 'low';
  return 'normal';
}

// უკუთავსებადობა — ძველი PANEL_ANALYTES
export const PANEL_ANALYTES: Record<string, string[]> = Object.fromEntries(
  LAB_PANELS.map(p => [p.key, p.analytes])
);
PANEL_ANALYTES['CBC+5DIFF'] = findPanel('CBC5')!.analytes;
PANEL_ANALYTES['BLOOD_GAS'] = findPanel('GAS')!.analytes;
