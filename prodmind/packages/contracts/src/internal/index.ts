export const CONTRACTS_INTERNAL_MARKER = '__internal_only__';

export interface InternalContractConfig {
  schemaVersion: string;
  strictMode: boolean;
}

export const defaultInternalConfig: InternalContractConfig = {
  schemaVersion: '1.0.0',
  strictMode: true,
};
