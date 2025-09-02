import { describe, it, expect } from 'vitest';
import { generateCustomClient } from './index';

describe('@dorval/custom', () => {
  it('should export generateCustomClient function', () => {
    expect(generateCustomClient).toBeDefined();
    expect(typeof generateCustomClient).toBe('function');
  });

  it('should be a client builder function', () => {
    // generateCustomClient is a ClientGeneratorBuilder function
    // It returns a builder that will be called by the core generator
    const builder = generateCustomClient;
    expect(builder).toBeDefined();
    expect(typeof builder).toBe('function');
    expect(builder.name).toBe('generateCustomClient');
  });
});