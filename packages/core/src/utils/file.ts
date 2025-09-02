/**
 * File system utilities
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GeneratedFile } from '../types';

export async function writeToDisk(
  files: GeneratedFile[],
  targetDir: string
): Promise<void> {
  // Ensure target directory exists
  await fs.mkdir(targetDir, { recursive: true });
  
  // Write each file
  for (const file of files) {
    const filePath = path.join(targetDir, file.path);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    if (file.overwrite !== false || !(await fileExists(filePath))) {
      // Ensure file ends with a newline
      const content = file.content.endsWith('\n') ? file.content : file.content + '\n';
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }
}

// Core file operations
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFile(
  filePath: string, 
  content: string | Buffer, 
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  return fs.writeFile(filePath, content, encoding);
}

export async function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  return fs.readFile(filePath, encoding);
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function copyFile(src: string, dest: string): Promise<void> {
  return fs.copyFile(src, dest);
}

export async function removeFile(filePath: string): Promise<void> {
  return fs.rm(filePath, { recursive: true, force: true });
}

export async function getFiles(
  dirPath: string,
  extension?: string
): Promise<string[]> {
  const files = await fs.readdir(dirPath);
  if (extension) {
    return files.filter(file => file.endsWith(extension));
  }
  return files;
}

// Path utilities
export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

export function getFileNameWithoutExtension(filePath: string): string {
  const name = path.basename(filePath);
  const ext = path.extname(filePath);
  return ext ? name.slice(0, -ext.length) : name;
}

export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

export function resolvePath(...segments: string[]): string {
  return path.resolve(...segments);
}

export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

export function normalizeFilePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/').replace(/\/$/, '');
}

// Temp directory utilities
let tempDirs: string[] = [];

export async function createTempDir(prefix: string = 'dorval-'): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `${prefix}${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  tempDirs.push(tempDir);
  return tempDir;
}

export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDirs = tempDirs.filter(dir => dir !== tempDir);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Legacy compatibility
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}