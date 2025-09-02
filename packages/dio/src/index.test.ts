import { describe, it, expect } from 'vitest';
import { generateDioClient } from './index';

describe('@dorval/dio', () => {
  it('should export generateDioClient function', () => {
    expect(generateDioClient).toBeDefined();
    expect(typeof generateDioClient).toBe('function');
  });

  it('should be a client builder function', () => {
    // generateDioClient is a ClientGeneratorBuilder function
    // It returns a builder that will be called by the core generator
    const builder = generateDioClient;
    expect(builder).toBeDefined();
    expect(typeof builder).toBe('function');
    expect(builder.name).toBe('generateDioClient');
  });
});