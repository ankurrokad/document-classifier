import { PatientModel } from '@doc-clf/dal';

interface ExtractedData {
  patientName?: string;
  healthCard?: string;
  dob?: Date;
  provider?: string;
  medications?: any[];
}

interface MatchResult {
  patientId: string | null;
  matchMethod: 'health_card' | 'name_dob' | 'none';
  confidence: number;
}

export class MatchProcessor {
  constructor(private patientModel: PatientModel) {}

  /**
   * Match document to patient using extracted data
   */
  async match(extractedData: ExtractedData): Promise<MatchResult> {
    // Strategy 1: Exact match on health card number
    if (extractedData.healthCard) {
      const patient = await this.patientModel.findByHealthCard(extractedData.healthCard);
      if (patient) {
        return {
          patientId: patient._id.toString(),
          matchMethod: 'health_card',
          confidence: 100,
        };
      }
    }

    // Strategy 2: Fuzzy name matching + exact DOB match
    if (extractedData.patientName && extractedData.dob) {
      const patients = await this.patientModel.findByNameAndDOB(
        extractedData.patientName,
        extractedData.dob
      );

      if (patients.length > 0) {
        // If multiple matches, use the first one (could be improved with better scoring)
        // For now, we'll use the first match
        const bestMatch = patients[0];
        
        // Calculate name similarity for confidence
        const similarity = this.calculateNameSimilarity(
          extractedData.patientName,
          bestMatch.fullName
        );

        if (similarity >= 0.8) {
          return {
            patientId: bestMatch._id.toString(),
            matchMethod: 'name_dob',
            confidence: Math.round(similarity * 100),
          };
        }
      }
    }

    // No match found
    return {
      patientId: null,
      matchMethod: 'none',
      confidence: 0,
    };
  }

  /**
   * Calculate name similarity using simple Levenshtein-like approach
   * Returns a value between 0 and 1
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Exact match
    if (n1 === n2) {
      return 1.0;
    }

    // Split into words and compare
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');

    // If different number of words, lower similarity
    if (words1.length !== words2.length) {
      // Still try to match if one contains the other
      const longer = words1.length > words2.length ? words1 : words2;
      const shorter = words1.length > words2.length ? words2 : words1;
      
      let matches = 0;
      shorter.forEach((word) => {
        if (longer.some((w) => w.includes(word) || word.includes(w))) {
          matches++;
        }
      });

      return matches / Math.max(words1.length, words2.length);
    }

    // Same number of words - compare each word
    let matches = 0;
    words1.forEach((word1, i) => {
      if (i < words2.length) {
        const word2 = words2[i];
        if (word1 === word2) {
          matches += 1;
        } else if (word1.includes(word2) || word2.includes(word1)) {
          matches += 0.7;
        } else {
          // Calculate character-level similarity
          const charSimilarity = this.calculateStringSimilarity(word1, word2);
          matches += charSimilarity;
        }
      }
    });

    return matches / words1.length;
  }

  /**
   * Calculate string similarity using simple character matching
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Count matching characters
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longer.length;
  }
}

