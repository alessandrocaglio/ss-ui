import { useState, useCallback, useEffect } from "react";
import type { CertInfo, CertSource, ApiError } from "../types/api";
import { fetchCert, switchCertSource, uploadCert } from "../lib/api";
import { toast } from "sonner";

export function useCert() {
  const [certInfo, setCertInfo] = useState<CertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCert = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCert();
      setCertInfo(data);
      setError(null);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.error?.message || "Failed to fetch active certificate");
      setCertInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCert();
  }, [refreshCert]);

  const switchSource = async (source: CertSource) => {
    try {
      await switchCertSource(source);
      await refreshCert();
      toast.success(`Switched to ${source} certificate`);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.error?.message || "Failed to switch source");
    }
  };

  const uploadCertText = async (fileOrString: File | string) => {
    try {
      await uploadCert(fileOrString);
      await refreshCert();
      toast.success("Certificate uploaded successfully");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.error?.message || "Failed to upload certificate");
    }
  };

  return { certInfo, loading, error, refreshCert, switchSource, uploadCertText };
}
