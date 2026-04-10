export type CertSource = "controller" | "file" | "upload" | "none";

export interface HealthResponse {
  status: string;
  version: string;
  certSource: CertSource;
  insecure: boolean;
  controllerNamespace?: string;
  controllerName?: string;
}

export interface CertInfo {
  source: CertSource;
  pem: string;
  fingerprint: string;
  expiresAt: string;
  availableSources: CertSource[];
}

export interface SealRequest {
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  type: string;
  data: Record<string, string>;
  scope: "strict" | "namespace-wide" | "cluster-wide";
  secretYaml?: string;
}

export interface SealResponse {
  yaml: string;
  filename: string;
  name?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  encryptedData?: Record<string, string>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
