export interface PageIdentity {
  applicationLabel: string;
  domain: string;
  routeTemplate: string;
  pageLabel: string;
  moduleLabel?: string;
}

export type SensitivityClass =
  | 'password'
  | 'payment'
  | 'pii'
  | 'health'
  | 'government_id'
  | 'hr'
  | 'legal'
  | 'api_key'
  | 'custom';

export type RedactionOutcome = 'blocked' | 'structural_only' | 'redacted' | 'allowed';

export interface TargetSummary {
  selector?: string;
  selectorConfidence?: number;
  label?: string;
  role?: string;
  elementType?: string;
  isSensitive: boolean;
  sensitivityClass?: SensitivityClass;
}

export interface ExtensionSettings {
  uploadUrl: string;
  allowedDomains: string[];
  blockedDomains: string[];
  captureTextInput: boolean;
  captureScreenshots: false;
}
