import { useState } from "react";
import { sealSecret } from "../lib/api";
import type { SealRequest, SealResponse, ApiError } from "../types/api";
import { toast } from "sonner";

export function useSeal() {
  const [sealResult, setSealResult] = useState<SealResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<SealRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seal = async (req: SealRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await sealSecret(req);
      setSealResult(res);
      setLastRequest(req);
      toast.success("Sealed Secret generated successfully");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.error?.message || "Failed to generate sealed secret");
      toast.error(apiErr?.error?.message || "Failed to generate sealed secret");
    } finally {
      setLoading(false);
    }
  };

  return { sealResult, lastRequest, loading, error, seal };
}
