// Type definitions for @sap/cds
// This is a minimal type definition file for the parts we use

declare module '@sap/cds' {
  export interface CompileOptions {
    odataOpenapiHints?: boolean;
    edm4OpenAPI?: boolean;
    to?: string;
    [key: string]: any;
  }

  export interface CSN {
    definitions?: Record<string, any>;
    services?: Record<string, any>;
    [key: string]: any;
  }

  export interface CSDL {
    $Version?: string;
    $EntityContainer?: string;
    $Reference?: Record<string, any>;
    [key: string]: any;
  }

  const cds: {
    compile: {
      to: {
        edm(csn: CSN, options?: CompileOptions): CSDL | Generator<[CSDL | string, { file: string }]>;
      };
    };
    debug(module: string): ((message: string) => void) | undefined;
  };

  export = cds;
}

declare module '@sap/cds/lib' {
  import cds = require('@sap/cds');
  export = cds;
}