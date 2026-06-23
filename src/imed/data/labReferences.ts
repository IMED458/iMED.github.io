// ============================================================
// iMED — ლაბორატორიული რეფერენს-დიაპაზონები
// იცვლება სქესისა და ასაკის მიხედვით
// ============================================================

import type { Sex } from '../types';

export interface RefRule {
  sex?: Sex;            // თუ არ არის — ორივე სქესზე
  minAge?: number;      // წლები (ჩათვლით)
  maxAge?: number;
  low?: number;
  high?: number;
  text?: string;        // თუ რიცხვითი დიაპაზონი არ აქვს
}

export interface LabAnalyte {
  code: string;
  name: string;         // ქართული დასახელება
  unit: string;
  rules: RefRule[];
}

// ბავშვი = <14, მოზრდილი = ≥14 (გამარტივებული)
export const LAB_ANALYTES: LabAnalyte[] = [
  // — ჰემატოლოგია (CBC) —
  { code: 'WBC', name: 'ლეიკოციტები (WBC)', unit: '10⁹/L', rules: [
    { minAge: 14, low: 4.0, high: 10.0 },
    { maxAge: 13, low: 5.0, high: 14.5 },
  ]},
  { code: 'RBC', name: 'ერითროციტები (RBC)', unit: '10¹²/L', rules: [
    { sex: 'male', minAge: 14, low: 4.5, high: 5.9 },
    { sex: 'female', minAge: 14, low: 4.0, high: 5.2 },
    { maxAge: 13, low: 4.0, high: 5.5 },
  ]},
  { code: 'HGB', name: 'ჰემოგლობინი (HGB)', unit: 'g/L', rules: [
    { sex: 'male', minAge: 14, low: 130, high: 170 },
    { sex: 'female', minAge: 14, low: 120, high: 155 },
    { maxAge: 13, low: 110, high: 145 },
  ]},
  { code: 'HCT', name: 'ჰემატოკრიტი (HCT)', unit: '%', rules: [
    { sex: 'male', minAge: 14, low: 40, high: 50 },
    { sex: 'female', minAge: 14, low: 36, high: 46 },
    { maxAge: 13, low: 34, high: 44 },
  ]},
  { code: 'MCV', name: 'MCV', unit: 'fL', rules: [{ low: 80, high: 100 }] },
  { code: 'MCH', name: 'MCH', unit: 'pg', rules: [{ low: 27, high: 34 }] },
  { code: 'MCHC', name: 'MCHC', unit: 'g/L', rules: [{ low: 320, high: 360 }] },
  { code: 'PLT', name: 'თრომბოციტები (PLT)', unit: '10⁹/L', rules: [{ low: 150, high: 400 }] },
  { code: 'NEU%', name: 'ნეიტროფილები %', unit: '%', rules: [{ low: 40, high: 70 }] },
  { code: 'LYM%', name: 'ლიმფოციტები %', unit: '%', rules: [
    { minAge: 14, low: 20, high: 40 },
    { maxAge: 13, low: 30, high: 60 },
  ]},
  { code: 'MON%', name: 'მონოციტები %', unit: '%', rules: [{ low: 2, high: 10 }] },
  { code: 'EOS%', name: 'ეოზინოფილები %', unit: '%', rules: [{ low: 1, high: 5 }] },
  { code: 'BAS%', name: 'ბაზოფილები %', unit: '%', rules: [{ low: 0, high: 1 }] },
  { code: 'ESR', name: 'ედს (ESR)', unit: 'mm/h', rules: [
    { sex: 'male', low: 0, high: 15 },
    { sex: 'female', low: 0, high: 20 },
  ]},

  // — გაზები და ელექტროლიტები —
  { code: 'pH', name: 'pH', unit: '', rules: [{ low: 7.35, high: 7.45 }] },
  { code: 'pCO2', name: 'pCO₂', unit: 'mmHg', rules: [{ low: 35, high: 45 }] },
  { code: 'pO2', name: 'pO₂', unit: 'mmHg', rules: [{ low: 80, high: 100 }] },
  { code: 'HCO3', name: 'HCO₃⁻', unit: 'mmol/L', rules: [{ low: 22, high: 26 }] },
  { code: 'BE', name: 'Base Excess (BE)', unit: 'mmol/L', rules: [{ low: -2, high: 2 }] },
  { code: 'SO2', name: 'სატურაცია (SO₂)', unit: '%', rules: [{ low: 95, high: 100 }] },
  { code: 'K', name: 'კალიუმი (K⁺)', unit: 'mmol/L', rules: [{ low: 3.5, high: 5.1 }] },
  { code: 'Na', name: 'ნატრიუმი (Na⁺)', unit: 'mmol/L', rules: [{ low: 136, high: 145 }] },
  { code: 'Cl', name: 'ქლორი (Cl⁻)', unit: 'mmol/L', rules: [{ low: 98, high: 107 }] },
  { code: 'iCa', name: 'იონიზ. კალციუმი (Ca²⁺)', unit: 'mmol/L', rules: [{ low: 1.12, high: 1.32 }] },
  { code: 'LACT', name: 'ლაქტატი', unit: 'mmol/L', rules: [{ low: 0.5, high: 2.2 }] },
  { code: 'GLU', name: 'გლუკოზა', unit: 'mmol/L', rules: [{ low: 3.9, high: 6.1 }] },

  // — ბიოქიმია —
  { code: 'ALT', name: 'ALT', unit: 'U/L', rules: [
    { sex: 'male', low: 0, high: 41 }, { sex: 'female', low: 0, high: 33 } ]},
  { code: 'AST', name: 'AST', unit: 'U/L', rules: [
    { sex: 'male', low: 0, high: 40 }, { sex: 'female', low: 0, high: 32 } ]},
  { code: 'CRE', name: 'კრეატინინი', unit: 'µmol/L', rules: [
    { sex: 'male', minAge: 14, low: 62, high: 106 },
    { sex: 'female', minAge: 14, low: 44, high: 80 },
    { maxAge: 13, low: 27, high: 62 },
  ]},
  { code: 'UREA', name: 'შარდოვანა', unit: 'mmol/L', rules: [{ low: 2.5, high: 7.1 }] },
  { code: 'TBIL', name: 'საერთო ბილირუბინი', unit: 'µmol/L', rules: [{ low: 3.4, high: 20.5 }] },
  { code: 'TP', name: 'საერთო ცილა', unit: 'g/L', rules: [{ low: 64, high: 83 }] },
  { code: 'ALB', name: 'ალბუმინი', unit: 'g/L', rules: [{ low: 35, high: 52 }] },
  { code: 'CRP', name: 'CRP', unit: 'mg/L', rules: [{ low: 0, high: 5 }] },
  { code: 'TCHOL', name: 'საერთო ქოლესტერინი', unit: 'mmol/L', rules: [{ low: 0, high: 5.2 }] },
  { code: 'CA', name: 'საერთო კალციუმი', unit: 'mmol/L', rules: [{ low: 2.15, high: 2.55 }] },
  { code: 'MG', name: 'მაგნიუმი', unit: 'mmol/L', rules: [{ low: 0.66, high: 1.07 }] },
  { code: 'P', name: 'ფოსფორი', unit: 'mmol/L', rules: [{ low: 0.81, high: 1.45 }] },
  { code: 'IRON', name: 'რკინა', unit: 'µmol/L', rules: [
    { sex: 'male', low: 11, high: 28 }, { sex: 'female', low: 7, high: 26 } ]},

  // — შტამპები —
  { code: 'TSH', name: 'TSH', unit: 'mIU/L', rules: [{ low: 0.27, high: 4.2 }] },
  { code: 'FT4', name: 'FT4', unit: 'pmol/L', rules: [{ low: 12, high: 22 }] },
  { code: 'PT', name: 'პროთრომბინის დრო', unit: 'sec', rules: [{ low: 11, high: 14 }] },
  { code: 'INR', name: 'INR', unit: '', rules: [{ low: 0.8, high: 1.2 }] },
  { code: 'APTT', name: 'APTT', unit: 'sec', rules: [{ low: 25, high: 38 }] },
  { code: 'FIB', name: 'ფიბრინოგენი', unit: 'g/L', rules: [{ low: 2.0, high: 4.0 }] },
];

export function getReference(analyte: LabAnalyte, sex: Sex, ageYears: number): RefRule | undefined {
  // ვირჩევთ ყველაზე სპეციფიკურ წესს
  const matches = analyte.rules.filter(r => {
    if (r.sex && r.sex !== sex) return false;
    if (r.minAge !== undefined && ageYears < r.minAge) return false;
    if (r.maxAge !== undefined && ageYears > r.maxAge) return false;
    return true;
  });
  if (matches.length === 0) return analyte.rules[0];
  // უპირატესობა — სქესით განსაზღვრულს
  return matches.sort((a, b) => (b.sex ? 1 : 0) - (a.sex ? 1 : 0))[0];
}

export function formatRange(rule?: RefRule): string {
  if (!rule) return '—';
  if (rule.text) return rule.text;
  if (rule.low !== undefined && rule.high !== undefined) return `${rule.low} – ${rule.high}`;
  if (rule.high !== undefined) return `< ${rule.high}`;
  if (rule.low !== undefined) return `> ${rule.low}`;
  return '—';
}

export type LabFlag = 'normal' | 'high' | 'low';

export function flagValue(value: number, rule?: RefRule): LabFlag {
  if (!rule || rule.low === undefined && rule.high === undefined) return 'normal';
  if (rule.high !== undefined && value > rule.high) return 'high';
  if (rule.low !== undefined && value < rule.low) return 'low';
  return 'normal';
}

// ანალიზის პანელის → ანალიტების mapping (რომელ ტესტს რა შემადგენელი აქვს)
export const PANEL_ANALYTES: Record<string, string[]> = {
  'CBC+5DIFF': ['WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT', 'NEU%', 'LYM%', 'MON%', 'EOS%', 'BAS%'],
  'CBC': ['WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT'],
  'BLOOD_GAS': ['pH', 'pCO2', 'pO2', 'HCO3', 'BE', 'SO2', 'K', 'Na', 'Cl', 'iCa', 'LACT', 'GLU'],
  'ELECTROLYTES': ['K', 'Na', 'Cl', 'iCa'],
  'COAG': ['PT', 'INR', 'APTT', 'FIB'],
  'THYROID': ['TSH', 'FT4'],
};

export function findAnalyte(code: string): LabAnalyte | undefined {
  return LAB_ANALYTES.find(a => a.code === code);
}
