import type { OpenAPIV3 } from 'openapi-types';

export type OpenAPIObject = OpenAPIV3.Document;

export type DartClientType = 'dio' | 'http' | 'chopper' | 'retrofit';

export type DartOutputMode = 'single' | 'split' | 'tags';

export interface DartGeneratorOptions {
  input: string | OpenAPIObject;
  output: {
    target: string;
    mode?: DartOutputMode;
    client?: DartClientType;
    override?: {
      generator?: {
        freezed?: boolean;
        jsonSerializable?: boolean;
        nullSafety?: boolean;
        partFiles?: boolean;
        equatable?: boolean;
      };
      dio?: {
        baseUrl?: string;
        interceptors?: string[];
      };
      methodNaming?: 'operationId' | 'methodPath';  // New option for method naming strategy
      sharedHeaders?: Record<string, string[]>;  // Configurable shared header models
    };
  };
  hooks?: {
    afterAllFilesWrite?: string | string[];
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  overwrite?: boolean;
}

export interface DartModel {
  name: string;
  properties: DartProperty[];
  imports: string[];
  isEnum?: boolean;
  enumValues?: string[];
  description?: string;
}

export interface DartProperty {
  name: string;
  type: string;
  required: boolean;
  nullable: boolean;
  description?: string;
  defaultValue?: any;
  jsonKey?: string;
}

export interface DartEndpoint {
  name: string;
  method: string;
  path: string;
  parameters: DartParameter[];
  requestBody?: DartRequestBody;
  responses: DartResponse[];
  description?: string;
  deprecated?: boolean;
  tags?: string[];
}

export interface DartParameter {
  name: string;
  type: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
}

export interface DartRequestBody {
  type: string;
  required: boolean;
  contentType?: string;
}

export interface DartResponse {
  status: string;
  type?: string;
  description?: string;
}

// Configuration types for defineConfig
export type DartConfig = {
  [project: string]: DartGeneratorOptions;
};

export type DartConfigExport = DartConfig | Promise<DartConfig> | (() => DartConfig | Promise<DartConfig>);