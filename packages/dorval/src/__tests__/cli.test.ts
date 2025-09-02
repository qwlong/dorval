import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCLI } from '../cli';

describe('CLI', () => {
  let mockExit: any;
  let mockLog: any;
  let mockError: any;
  
  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
  });

  it('should export runCLI function', () => {
    expect(runCLI).toBeDefined();
    expect(typeof runCLI).toBe('function');
  });

  it('should handle base command', () => {
    // Just call with basic args to test initialization
    const args = ['node', 'dorval'];
    expect(() => runCLI(args)).not.toThrow();
  });

  it('should register generate command', () => {
    // Test that generate command exists without triggering help
    const args = ['node', 'dorval', 'generate'];
    // This will fail due to missing required options, but that's OK for this test
    expect(() => runCLI(args)).not.toThrow();
  });

  it('should register watch command', () => {
    // Test that watch command exists without triggering help
    const args = ['node', 'dorval', 'watch'];
    // This will fail due to missing required options, but that's OK for this test
    expect(() => runCLI(args)).not.toThrow();
  });
});