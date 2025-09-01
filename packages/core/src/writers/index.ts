/**
 * File writing utilities - aligned with Orval structure
 * This module handles all file output operations
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { GeneratedFile } from '../types';

// Export writer modes
export * from './split-mode';
export * from './single-mode';

/**
 * Write generated files to disk
 */
export async function writeFiles(
  files: GeneratedFile[],
  outputPath: string
): Promise<void> {
  // Ensure output directory exists
  await fs.ensureDir(outputPath);

  // Write each file
  for (const file of files) {
    const filePath = path.join(outputPath, file.path);
    const fileDir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.ensureDir(fileDir);
    
    // Write file content
    await fs.writeFile(filePath, file.content, 'utf-8');
  }
}

/**
 * Write a single file
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  const fileDir = path.dirname(filePath);
  
  // Ensure directory exists
  await fs.ensureDir(fileDir);
  
  // Write file
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Clean output directory
 */
export async function cleanOutputDir(outputPath: string): Promise<void> {
  if (await fs.pathExists(outputPath)) {
    await fs.emptyDir(outputPath);
  } else {
    await fs.ensureDir(outputPath);
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Copy file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const destDir = path.dirname(dest);
  await fs.ensureDir(destDir);
  await fs.copy(src, dest);
}

/**
 * Get all files in directory
 */
export async function getFiles(dir: string, pattern?: RegExp): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (!pattern || pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await walk(dir);
  return files;
}

/**
 * Write JSON file
 */
export async function writeJson(
  filePath: string,
  data: any,
  pretty = true
): Promise<void> {
  const content = pretty 
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  
  await writeFile(filePath, content);
}

/**
 * Read JSON file
 */
export async function readJson(filePath: string): Promise<any> {
  const content = await readFile(filePath);
  return JSON.parse(content);
}

/**
 * Group files by directory for batch writing
 */
export function groupFilesByDirectory(files: GeneratedFile[]): Map<string, GeneratedFile[]> {
  const grouped = new Map<string, GeneratedFile[]>();
  
  files.forEach(file => {
    const dir = path.dirname(file.path);
    if (!grouped.has(dir)) {
      grouped.set(dir, []);
    }
    grouped.get(dir)!.push(file);
  });
  
  return grouped;
}

/**
 * Write files in parallel by directory
 */
export async function writeFilesParallel(
  files: GeneratedFile[],
  outputPath: string
): Promise<void> {
  const grouped = groupFilesByDirectory(files);
  
  // Write files in each directory in parallel
  const writePromises: Promise<void>[] = [];
  
  for (const [dir, dirFiles] of grouped) {
    const dirPath = path.join(outputPath, dir);
    
    // Ensure directory exists
    await fs.ensureDir(dirPath);
    
    // Write all files in this directory in parallel
    for (const file of dirFiles) {
      const filePath = path.join(outputPath, file.path);
      writePromises.push(fs.writeFile(filePath, file.content, 'utf-8'));
    }
  }
  
  await Promise.all(writePromises);
}