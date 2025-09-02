import { describe, it, expect } from 'vitest';
import { loadConfig } from '../config';

describe('Config', () => {
  it('should export loadConfig function', () => {
    expect(loadConfig).toBeDefined();
    expect(typeof loadConfig).toBe('function');
  });

  it('should throw error when no config found', async () => {
    // Test that loadConfig throws when no configuration exists
    await expect(loadConfig()).rejects.toThrow('No configuration file found');
  });

  it('should throw error for non-existent config file', async () => {
    const configPath = './non-existent-config.js';
    await expect(loadConfig(configPath)).rejects.toThrow();
  });
});