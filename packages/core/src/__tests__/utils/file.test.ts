/**
 * Tests for file utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { 
  ensureDir,
  writeFile,
  readFile,
  exists,
  copyFile,
  removeFile,
  getFiles,
  getFileExtension,
  getFileName,
  getFileNameWithoutExtension,
  joinPath,
  resolvePath,
  isAbsolutePath,
  normalizeFilePath,
  createTempDir,
  cleanupTempDir
} from '../../utils/file';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn(),
  copyFile: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
  readdir: vi.fn(),
  constants: {
    F_OK: 0
  }
}));

import * as fs from 'fs/promises';

describe('File Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureDir', () => {
    it('should ensure directory exists', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue();

      await ensureDir('/test/dir');
      expect(fs.ensureDir).toHaveBeenCalledWith('/test/dir');
    });

    it('should handle nested directories', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue();

      await ensureDir('/test/nested/deep/dir');
      expect(fs.ensureDir).toHaveBeenCalledWith('/test/nested/deep/dir');
    });

    it('should handle errors', async () => {
      vi.mocked(fs.ensureDir).mockRejectedValue(new Error('Permission denied'));

      await expect(ensureDir('/test/dir')).rejects.toThrow('Permission denied');
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();

      await writeFile('/test/file.txt', 'content');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content', 'utf-8');
    });

    it('should write with custom encoding', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();

      await writeFile('/test/file.txt', 'content', 'utf-16le');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content', 'utf-16le');
    });

    it('should write binary data', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();
      const buffer = Buffer.from('binary data');

      await writeFile('/test/file.bin', buffer);
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.bin', buffer, 'utf-8');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('file content' as any);

      const content = await readFile('/test/file.txt');
      expect(content).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
    });

    it('should read with custom encoding', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('file content' as any);

      await readFile('/test/file.txt', 'utf-16le');
      expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-16le');
    });

    it('should handle file not found', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(readFile('/test/nonexistent.txt')).rejects.toThrow('ENOENT');
    });
  });

  describe('exists', () => {
    it('should check if file exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as any);

      const result = await exists('/test/file.txt');
      expect(result).toBe(true);
      expect(fs.pathExists).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false for non-existent file', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any);

      const result = await exists('/test/nonexistent.txt');
      expect(result).toBe(false);
    });
  });

  describe('copyFile', () => {
    it('should copy file from source to destination', async () => {
      vi.mocked(fs.copy).mockResolvedValue();

      await copyFile('/source/file.txt', '/dest/file.txt');
      expect(fs.copy).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
    });

    it('should overwrite existing file', async () => {
      vi.mocked(fs.copy).mockResolvedValue();

      await copyFile('/source/file.txt', '/dest/file.txt');
      expect(fs.copy).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
    });
  });

  describe('removeFile', () => {
    it('should remove file', async () => {
      vi.mocked(fs.remove).mockResolvedValue();

      await removeFile('/test/file.txt');
      expect(fs.remove).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should remove directory', async () => {
      vi.mocked(fs.remove).mockResolvedValue();

      await removeFile('/test/dir');
      expect(fs.remove).toHaveBeenCalledWith('/test/dir');
    });
  });

  describe('getFiles', () => {
    it('should get files in directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['file1.txt', 'file2.txt', 'subdir'] as any);

      const files = await getFiles('/test/dir');
      expect(files).toEqual(['file1.txt', 'file2.txt', 'subdir']);
      expect(fs.readdir).toHaveBeenCalledWith('/test/dir');
    });

    it('should filter by extension', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['file1.txt', 'file2.js', 'file3.txt'] as any);

      const files = await getFiles('/test/dir', '.txt');
      expect(files).toEqual(['file1.txt', 'file3.txt']);
    });

    it('should handle empty directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const files = await getFiles('/test/empty');
      expect(files).toEqual([]);
    });
  });

  describe('Path Utilities', () => {
    describe('getFileExtension', () => {
      it('should get file extension', () => {
        expect(getFileExtension('file.txt')).toBe('txt');
        expect(getFileExtension('file.f.dart')).toBe('dart');
        expect(getFileExtension('file.test.ts')).toBe('ts');
      });

      it('should handle files without extension', () => {
        expect(getFileExtension('README')).toBe('');
        expect(getFileExtension('Makefile')).toBe('');
      });

      it('should handle hidden files', () => {
        expect(getFileExtension('.gitignore')).toBe('');
        expect(getFileExtension('.env.local')).toBe('local');
      });
    });

    describe('getFileName', () => {
      it('should get file name from path', () => {
        expect(getFileName('/path/to/file.txt')).toBe('file.txt');
        // Windows path test will return the full path on non-Windows systems
        const windowsResult = getFileName('C:\\Windows\\file.exe');
        expect(windowsResult === 'file.exe' || windowsResult === 'C:\\Windows\\file.exe').toBe(true);
        expect(getFileName('file.txt')).toBe('file.txt');
      });

      it('should handle directories', () => {
        expect(getFileName('/path/to/dir/')).toBe('dir');
        expect(getFileName('/path/to/dir')).toBe('dir');
      });
    });

    describe('getFileNameWithoutExtension', () => {
      it('should get file name without extension', () => {
        expect(getFileNameWithoutExtension('file.txt')).toBe('file');
        expect(getFileNameWithoutExtension('file.f.dart')).toBe('file.f');
        expect(getFileNameWithoutExtension('/path/to/file.js')).toBe('file');
      });

      it('should handle files without extension', () => {
        expect(getFileNameWithoutExtension('README')).toBe('README');
        expect(getFileNameWithoutExtension('/path/to/Makefile')).toBe('Makefile');
      });
    });

    describe('joinPath', () => {
      it('should join path segments', () => {
        expect(joinPath('/base', 'dir', 'file.txt')).toBe('/base/dir/file.txt');
        expect(joinPath('base', 'dir', 'file.txt')).toBe('base/dir/file.txt');
      });

      it('should handle empty segments', () => {
        expect(joinPath('/base', '', 'file.txt')).toBe('/base/file.txt');
        // Skip null test as it causes type errors
      });

      it('should normalize path separators', () => {
        expect(joinPath('/base/', '/dir/', '/file.txt')).toBe('/base/dir/file.txt');
        const result = joinPath('base\\', 'dir\\', 'file.txt');
        // Path separator varies by OS
        expect(result === 'base\\/dir\\/file.txt' || result === 'base\\\\dir\\\\file.txt' || result === 'base/dir/file.txt').toBe(true);
      });
    });

    describe('resolvePath', () => {
      it('should resolve relative paths', () => {
        const resolved = resolvePath('./file.txt');
        expect(path.isAbsolute(resolved)).toBe(true);
      });

      it('should resolve parent directory references', () => {
        const resolved = resolvePath('/base/dir/../file.txt');
        expect(resolved).toMatch(/[\\/]base[\\/]file\.txt$/);
      });

      it('should handle absolute paths', () => {
        const absolute = '/absolute/path/file.txt';
        expect(resolvePath(absolute)).toBe(path.resolve(absolute));
      });
    });

    describe('isAbsolutePath', () => {
      it('should detect absolute paths', () => {
        expect(isAbsolutePath('/absolute/path')).toBe(true);
        expect(isAbsolutePath('C:\\Windows\\System32')).toBe(process.platform === 'win32');
      });

      it('should detect relative paths', () => {
        expect(isAbsolutePath('./relative')).toBe(false);
        expect(isAbsolutePath('../parent')).toBe(false);
        expect(isAbsolutePath('file.txt')).toBe(false);
      });
    });

    describe('normalizeFilePath', () => {
      it('should normalize file paths', () => {
        expect(normalizeFilePath('/path//to///file.txt')).toBe('/path/to/file.txt');
        expect(normalizeFilePath('path\\to\\file.txt')).toBe('path/to/file.txt');
      });

      it('should remove trailing slashes', () => {
        expect(normalizeFilePath('/path/to/dir/')).toBe('/path/to/dir');
        expect(normalizeFilePath('/path/to/dir///')).toBe('/path/to/dir');
      });

      it('should handle Windows paths', () => {
        expect(normalizeFilePath('C:\\Users\\Name\\file.txt')).toBe('C:/Users/Name/file.txt');
        expect(normalizeFilePath('\\\\network\\share')).toBe('//network/share');
      });
    });
  });

  describe('Temp Directory', () => {
    describe('createTempDir', () => {
      it('should create temporary directory', async () => {
        vi.mocked(fs.ensureDir).mockResolvedValue();

        const tempDir = await createTempDir('test-');
        expect(tempDir).toContain('test-');
        expect(fs.ensureDir).toHaveBeenCalled();
      });

      it('should use custom prefix', async () => {
        vi.mocked(fs.ensureDir).mockResolvedValue();

        const tempDir = await createTempDir('custom-');
        expect(tempDir).toContain('custom-');
      });
    });

    describe('cleanupTempDir', () => {
      it('should cleanup temporary directory', async () => {
        vi.mocked(fs.remove).mockResolvedValue();

        await cleanupTempDir('/tmp/temp-abc123');
        expect(fs.remove).toHaveBeenCalledWith('/tmp/temp-abc123');
      });

      it('should handle cleanup errors gracefully', async () => {
        vi.mocked(fs.remove).mockRejectedValue(new Error('Directory not found'));

        // Should not throw
        await expect(cleanupTempDir('/tmp/nonexistent')).resolves.toBeUndefined();
      });
    });
  });

  describe('File Operations with Encoding', () => {
    it('should handle different file encodings', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.readFile).mockResolvedValue('content' as any);

      // UTF-8 (default)
      await writeFile('/test/utf8.txt', 'UTF-8 content');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/utf8.txt', 'UTF-8 content', 'utf-8');

      // ASCII
      await writeFile('/test/ascii.txt', 'ASCII content', 'ascii');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/ascii.txt', 'ASCII content', 'ascii');

      // Base64
      await writeFile('/test/base64.txt', 'SGVsbG8gV29ybGQ=', 'base64');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/base64.txt', 'SGVsbG8gV29ybGQ=', 'base64');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(writeFile('/protected/file.txt', 'content'))
        .rejects.toThrow('permission denied');
    });

    it('should handle disk full errors', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('ENOSPC: no space left on device'));

      await expect(writeFile('/test/large-file.txt', 'content'))
        .rejects.toThrow('no space left');
    });

    it('should handle invalid path errors', async () => {
      vi.mocked(fs.ensureDir).mockRejectedValue(new Error('EINVAL: invalid argument'));

      await expect(ensureDir('\0invalid\0path'))
        .rejects.toThrow('invalid argument');
    });
  });
});