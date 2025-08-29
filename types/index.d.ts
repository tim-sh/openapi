// Main type definitions for @cap-js/openapi

import { CSN, CSDL } from '@sap/cds';
import { OpenAPIDocument } from './openapi';

export interface ProcessorOptions {
  url?: string;
  servers?: string | any[];
  odataVersion?: string;
  scheme?: 'http' | 'https';
  host?: string;
  basePath?: string;
  diagram?: boolean;
  maxLevels?: number;
  odataOpenapiHints?: boolean;
  edm4OpenAPI?: boolean;
  to?: string;
  service?: string;
  servicePath?: string;
  'config-file'?: string;
  [key: string]: any;
}

export interface ServiceMetadata {
  file: string;
}

export type ProcessorResult = OpenAPIDocument | Generator<[OpenAPIDocument, ServiceMetadata]>;

export interface Csdl2OpenApiOptions {
  url?: string;
  servers?: string | any[];
  odataVersion?: string;
  scheme?: 'http' | 'https';
  host?: string;
  basePath?: string;
  diagram?: boolean;
  maxLevels?: number;
}

// Module exports
declare function processor(csn: CSN, options?: ProcessorOptions): ProcessorResult;

export default processor;