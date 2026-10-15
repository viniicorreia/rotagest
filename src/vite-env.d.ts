/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da rotagest-api, incluindo a versão. Ex.: http://localhost:3000/api/v1 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
