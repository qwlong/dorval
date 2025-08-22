/**
 * File system utilities
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { GeneratedFile } from '../types';

export async function writeToDisk(
  files: GeneratedFile[],
  targetDir: string
): Promise<void> {
  // Ensure target directory exists
  await fs.ensureDir(targetDir);
  
  // Write each file
  for (const file of files) {
    const filePath = path.join(targetDir, file.path);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.ensureDir(dir);
    
    // Write file
    if (file.overwrite !== false || !(await fs.pathExists(filePath))) {
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
  }
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}