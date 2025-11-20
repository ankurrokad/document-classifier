export const LAB_TEMPLATES = [
    { name: 'WBC', unit: '10^9/L', normal: [4.0,11.0] },
    { name: 'RBC', unit: '10^12/L', normal: [4.2,5.9] },
    { name: 'Hemoglobin', unit: 'g/dL', normal: [13.5,17.5] },
    { name: 'Platelets', unit: '10^9/L', normal: [150,450] },
    { name: 'Creatinine', unit: 'mg/dL', normal: [0.6,1.3] },
    { name: 'Glucose', unit: 'mmol/L', normal: [3.9,7.8] },
    { name: 'Sodium', unit: 'mmol/L', normal: [135,145] },
    { name: 'Potassium', unit: 'mmol/L', normal: [3.5,5.1] },
    { name: 'Chloride', unit: 'mmol/L', normal: [98,107] },
    { name: 'Bicarbonate', unit: 'mmol/L', normal: [22,29] },
    { name: 'Calcium', unit: 'mg/dL', normal: [8.6,10.2] },
    { name: 'Urea', unit: 'mg/dL', normal: [7,20] },
    { name: 'eGFR', unit: 'mL/min/1.73m²', normal: [90,120] },
    { name: 'Total Protein', unit: 'g/dL', normal: [6.0,8.3] },
    { name: 'Albumin', unit: 'g/dL', normal: [3.5,5.0] },
    { name: 'Bilirubin (Total)', unit: 'mg/dL', normal: [0.1,1.2] },
    { name: 'ALT (SGPT)', unit: 'U/L', normal: [7,56] },
    { name: 'AST (SGOT)', unit: 'U/L', normal: [5,40] },
    { name: 'ALP', unit: 'U/L', normal: [40,129] },
    { name: 'LDH', unit: 'U/L', normal: [140,280] },    
    { name: 'Iron', unit: 'mcg/dL', normal: [60,170] },
    { name: 'TSH', unit: 'mIU/L', normal: [0.4,4.0] },
    { name: 'CRP', unit: 'mg/L', normal: [0,5] },
    { name: 'ESR', unit: 'mm/hr', normal: [0,20] },
    { name: 'Vitamin D', unit: 'ng/mL', normal: [20,50] }
  ];
  
  export function genLabResults() {
    return LAB_TEMPLATES.map(t => {
      const low = t.normal[0];
      const high = t.normal[1];
      // sometimes produce abnormal result
      const abnormalChance = Math.random() < 0.15;
      const value = abnormalChance
        ? +( (low*0.6 + Math.random()*(high*2)) ).toFixed(2)
        : +( (low + Math.random()*(high-low)).toFixed(2) );
      return { test: t.name, value, unit: t.unit, normal: `${low}-${high}`, flag: abnormalChance ? 'H' : '' };
    });
  }
  