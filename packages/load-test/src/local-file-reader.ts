import * as path from 'path';
import * as fs from 'fs';

// Find root-level .data directory
function getDataDirectory(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), '.data'),
    path.resolve(process.cwd(), '../.data'),
    path.resolve(process.cwd(), '../../.data'),
    path.resolve(process.cwd(), '../../../.data'),
    path.resolve(__dirname, '../../../../.data'),
  ];

  for (const dataPath of possiblePaths) {
    if (fs.existsSync(dataPath)) {
      return dataPath;
    }
  }

  // Default to process.cwd()/.data if none found
  return path.resolve(process.cwd(), '.data');
}

// Recursively find all PDF files in a directory
function findPdfFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findPdfFiles(filePath, fileList);
    } else if (file.endsWith('.pdf')) {
      // Store relative path from .data directory
      const dataDir = getDataDirectory();
      const relativePath = path.relative(path.join(dataDir, 'documents', 'original'), filePath);
      // Normalize path separators to forward slashes for consistency
      fileList.push(relativePath.replace(/\\/g, '/'));
    }
  });

  return fileList;
}

export class LocalFileReader {
  private dataDir: string;
  private documentsDir: string;

  constructor() {
    this.dataDir = getDataDirectory();
    this.documentsDir = path.join(this.dataDir, 'documents', 'original');
    
    if (!fs.existsSync(this.documentsDir)) {
      throw new Error(
        `Local data directory not found: ${this.documentsDir}\n` +
        `Please generate synthetic documents first using: pnpm gen:documents`
      );
    }
  }

  async listSyntheticFiles(): Promise<string[]> {
    const files = findPdfFiles(this.documentsDir);
    
    // Shuffle for randomness
    const shuffled = [...files];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  async downloadFile(key: string): Promise<Buffer> {
    // Key is relative path from documents/original, e.g., "prescription_0_John_Doe/prescription_0_John_Doe.pdf"
    // Normalize key to use OS-specific path separators
    const normalizedKey = key.replace(/\//g, path.sep);
    const filePath = path.join(this.documentsDir, normalizedKey);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.readFileSync(filePath);
  }
}

