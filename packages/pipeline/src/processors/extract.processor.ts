interface ExtractedData {
  patientName?: string;
  healthCard?: string;
  dob?: Date;
  provider?: string;
  medications?: Array<{
    name: string;
    dose: string;
    frequency: string;
  }>;
  rawText?: string; // This is already stored, but included for completeness
}

export class ExtractProcessor {
  /**
   * Extract structured fields from OCR text
   */
  extract(rawText: string, docType: string): ExtractedData {
    const extracted: ExtractedData = {};

    // Extract Patient Name
    const patientNameMatch = rawText.match(/Patient\s*:\s*([A-Za-z\s]+)/i);
    if (patientNameMatch && patientNameMatch[1]) {
      extracted.patientName = patientNameMatch[1].trim();
    }

    // Extract Health Card Number (HCN)
    const hcnMatch = rawText.match(/HCN\s*:\s*(\d{10})/i) || 
                     rawText.match(/Health\s+Card\s*:\s*(\d{10})/i);
    if (hcnMatch && hcnMatch[1]) {
      extracted.healthCard = hcnMatch[1].trim();
    }

    // Extract Date of Birth (DOB)
    const dobMatch = rawText.match(/DOB\s*:\s*(\d{4}-\d{2}-\d{2})/i) ||
                     rawText.match(/DOB\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
                     rawText.match(/DOB\s*:\s*(\d{1,2}-\d{1,2}-\d{4})/i);
    if (dobMatch && dobMatch[1]) {
      const dobStr = dobMatch[1];
      // Try to parse the date
      const date = this.parseDate(dobStr);
      if (date) {
        extracted.dob = date;
      }
    }

    // Extract Provider (for prescriptions and clinic notes)
    const providerMatch = rawText.match(/Prescriber\s*:\s*Dr\.\s*([A-Za-z\s.]+)/i) ||
                         rawText.match(/Provider\s*:\s*([A-Za-z\s.]+)/i) ||
                         rawText.match(/Prescriber\s*:\s*([A-Za-z\s.]+)/i);
    if (providerMatch && providerMatch[1]) {
      extracted.provider = providerMatch[1].trim();
    }

    // Extract Medications (for prescriptions)
    if (docType === 'prescription') {
      extracted.medications = this.extractMedications(rawText);
    }

    return extracted;
  }

  /**
   * Extract medications from prescription text
   * Pattern: "1. Medication Name — Dose — Frequency"
   */
  private extractMedications(text: string): Array<{ name: string; dose: string; frequency: string }> {
    const medications: Array<{ name: string; dose: string; frequency: string }> = [];
    
    // Match pattern: "1. Name — Dose — Frequency"
    const medicationRegex = /\d+\.\s*([^—]+)\s*—\s*([^—]+)\s*—\s*(.+?)(?=\d+\.|$)/g;
    let match;

    while ((match = medicationRegex.exec(text)) !== null) {
      medications.push({
        name: match[1].trim(),
        dose: match[2].trim(),
        frequency: match[3].trim(),
      });
    }

    return medications;
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date | null {
    // Try ISO format first (YYYY-MM-DD)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }

    // Try MM/DD/YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      // Assume YYYY-MM-DD or MM/DD/YYYY
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      } else {
        // MM/DD/YYYY
        return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      }
    }

    // Try direct Date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }
}

