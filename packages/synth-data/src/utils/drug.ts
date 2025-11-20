export const DRUGS = [
  { name: 'Amoxicillin', dose: ['250 mg', '500 mg'], freq: ['BD', 'TID', 'OD'] },
  { name: 'Azithromycin', dose: ['250 mg'], freq: ['OD'] },
  { name: 'Metformin', dose: ['500 mg','850 mg'], freq: ['BD'] },
  { name: 'Atorvastatin', dose: ['10 mg','20 mg'], freq: ['OD'] },
  { name: 'Omeprazole', dose: ['20 mg'], freq: ['OD'] },
  { name: 'Lisinopril', dose: ['10 mg','20 mg'], freq: ['OD'] },
  { name: 'Simvastatin', dose: ['10 mg', '20 mg', '40 mg'], freq: ['OD'] },
  { name: 'Amlodipine', dose: ['5 mg', '10 mg'], freq: ['OD'] },
  { name: 'Metoprolol', dose: ['25 mg', '50 mg', '100 mg'], freq: ['BD', 'OD'] },
  { name: 'Losartan', dose: ['25 mg','50 mg'], freq: ['OD'] },
  { name: 'Levothyroxine', dose: ['25 mcg','50 mcg','100 mcg'], freq: ['OD'] },
  { name: 'Prednisone', dose: ['5 mg', '10 mg', '20 mg'], freq: ['OD'] },
  { name: 'Hydrochlorothiazide', dose: ['12.5 mg','25 mg'], freq: ['OD'] },
  { name: 'Gabapentin', dose: ['100 mg','300 mg','600 mg'], freq: ['TID'] },
  { name: 'Cetirizine', dose: ['10 mg'], freq: ['OD'] },
  { name: 'Alprazolam', dose: ['0.25 mg','0.5 mg','1 mg'], freq: ['TID', 'OD'] },
  { name: 'Clopidogrel', dose: ['75 mg'], freq: ['OD'] },
  { name: 'Sertraline', dose: ['50 mg','100 mg'], freq: ['OD'] },
  { name: 'Escitalopram', dose: ['10 mg','20 mg'], freq: ['OD'] },
  { name: 'Bisoprolol', dose: ['2.5 mg','5 mg','10 mg'], freq: ['OD'] },
  { name: 'Enalapril', dose: ['5 mg','10 mg'], freq: ['OD'] },
  { name: 'Ramipril', dose: ['2.5 mg','5 mg','10 mg'], freq: ['OD'] },
  { name: 'Citalopram', dose: ['10 mg','20 mg','40 mg'], freq: ['OD'] },
  { name: 'Tamsulosin', dose: ['0.4 mg'], freq: ['OD'] },
  { name: 'Warfarin', dose: ['1 mg','2 mg','5 mg'], freq: ['OD'] },
  { name: 'Allopurinol', dose: ['100 mg','300 mg'], freq: ['OD'] },
  { name: 'Paracetamol', dose: ['500 mg'], freq: ['TID', 'QID'] },
  { name: 'Ibuprofen', dose: ['200 mg','400 mg'], freq: ['TID'] },
  { name: 'Insulin Glargine', dose: ['10 units','20 units', '30 units'], freq: ['OD'] },
  { name: 'Dapagliflozin', dose: ['5 mg','10 mg'], freq: ['OD'] },
  { name: 'Spironolactone', dose: ['25 mg','50 mg'], freq: ['OD'] },
  { name: 'Furosemide', dose: ['20 mg','40 mg'], freq: ['OD', 'BD'] },
  { name: 'Nitrofurantoin', dose: ['50 mg','100 mg'], freq: ['BD'] },
  { name: 'Sitagliptin', dose: ['50 mg','100 mg'], freq: ['OD'] },
  { name: 'Duloxetine', dose: ['30 mg','60 mg'], freq: ['OD'] },
  { name: 'Tramadol', dose: ['50 mg'], freq: ['TID'] },
  { name: 'Alendronate', dose: ['70 mg'], freq: ['Weekly'] },
  { name: 'Montelukast', dose: ['10 mg'], freq: ['OD'] },
  { name: 'Salbutamol (inhaler)', dose: ['100 mcg'], freq: ['PRN'] },
  { name: 'Loratadine', dose: ['10 mg'], freq: ['OD'] },
  { name: 'Mirtazapine', dose: ['15 mg','30 mg'], freq: ['OD'] },
  { name: 'Quetiapine', dose: ['25 mg','50 mg','100 mg'], freq: ['OD','BD'] },
  { name: 'Ranitidine', dose: ['150 mg'], freq: ['BD'] },
  { name: 'Doxycycline', dose: ['100 mg'], freq: ['BD'] },
  { name: 'Venlafaxine', dose: ['37.5 mg','75 mg'], freq: ['BD'] },
  { name: 'Diazepam', dose: ['2 mg','5 mg'], freq: ['TID','OD'] },
  { name: 'Amitriptyline', dose: ['10 mg','25 mg'], freq: ['OD'] },
  { name: 'Olanzapine', dose: ['5 mg','10 mg'], freq: ['OD'] },
  { name: 'Fluoxetine', dose: ['20 mg'], freq: ['OD'] },
  { name: 'Clarithromycin', dose: ['250 mg','500 mg'], freq: ['BD'] },
  { name: 'Ciprofloxacin', dose: ['250 mg','500 mg'], freq: ['BD'] },
  { name: 'Amiodarone', dose: ['100 mg','200 mg'], freq: ['OD'] },
  { name: 'Mometasone (nasal spray)', dose: ['50 mcg'], freq: ['OD'] },
  { name: 'Desloratadine', dose: ['5 mg'], freq: ['OD'] },
  { name: 'Fexofenadine', dose: ['120 mg','180 mg'], freq: ['OD'] },
  { name: 'Rosuvastatin', dose: ['10 mg','20 mg'], freq: ['OD'] },
  { name: 'Topiramate', dose: ['25 mg','50 mg'], freq: ['BD'] },
  { name: 'Lamotrigine', dose: ['25 mg','100 mg'], freq: ['BD'] },
  { name: 'Valproate', dose: ['250 mg','500 mg'], freq: ['BD','TID'] }
];
  
  export function pickMeds(count = 2) {
    const arr = [];
    for (let i=0;i<count;i++) {
      const d = DRUGS[Math.floor(Math.random() * DRUGS.length)];
      arr.push({
        name: d.name,
        dose: d.dose[Math.floor(Math.random()*d.dose.length)],
        frequency: d.freq[Math.floor(Math.random()*d.freq.length)]
      });
    }
    return arr;
  }
  