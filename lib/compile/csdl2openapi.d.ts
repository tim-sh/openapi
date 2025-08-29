import { CSDL } from '@sap/cds';
import { OpenAPIDocument } from '../../types/openapi';

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

export function csdl2openapi(
  csdl: CSDL,
  options?: Csdl2OpenApiOptions
): OpenAPIDocument;

declare const module: {
  csdl2openapi: typeof csdl2openapi;
};

export default module;