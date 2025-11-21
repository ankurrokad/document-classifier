interface ClassificationResult {
  label: string;
  confidence: number;
}

export class ClassifyProcessor {
  /**
   * Classify document type based on text content
   */
  classify(rawText: string): ClassificationResult {
    const text = rawText.toLowerCase();

    // Define keywords for each document type
    const prescriptionKeywords = [
      'prescription',
      'rx',
      'medication',
      'dispense',
      'prescriber',
      'sunrise clinic',
    ];

    const labReportKeywords = [
      'lab results',
      'laboratory',
      'test results',
      'blood work',
      'acme labs',
      'lab report',
    ];

    const clinicNoteKeywords = [
      'clinic note',
      'soap',
      'visit',
      'assessment',
      'downtown family practice',
      'clinical note',
    ];

    // Count keyword matches for each type
    let prescriptionScore = 0;
    let labReportScore = 0;
    let clinicNoteScore = 0;

    prescriptionKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        prescriptionScore++;
      }
    });

    labReportKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        labReportScore++;
      }
    });

    clinicNoteKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        clinicNoteScore++;
      }
    });

    // Determine the classification
    const scores = [
      { label: 'prescription', score: prescriptionScore },
      { label: 'lab_report', score: labReportScore },
      { label: 'clinic_note', score: clinicNoteScore },
    ];

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    const winner = scores[0];
    const totalPossible = Math.max(
      prescriptionKeywords.length,
      labReportKeywords.length,
      clinicNoteKeywords.length
    );

    // Calculate confidence as percentage of keywords matched
    // Minimum 30% confidence if at least one keyword matches
    const confidence = winner.score > 0
      ? Math.max(30, Math.min(100, (winner.score / totalPossible) * 100))
      : 0;

    // If no keywords matched, default to 'unknown'
    const label = winner.score > 0 ? winner.label : 'unknown';

    return {
      label,
      confidence: Math.round(confidence),
    };
  }
}

