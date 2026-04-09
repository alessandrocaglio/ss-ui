import { useState } from "react";
import { sealSecret } from "../lib/api";
import type { SealRequest, SealResponse } from "../types/api";
import { toast } from "sonner";

export function useSeal() {
  const [sealResult, setSealResult] = useState<SealResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seal = async (req: SealRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await sealSecret(req);
      setSealResult(res);
      toast.success("Sealed Secret generated successfully");
    } catch (err: any) {
      setError(err?.error?.message || "Failed to generate sealed secret");
      toast.error(err?.error?.message || "Failed to generate sealed secret");
    } finally {
      setLoading(false);
    }
  };

  return { sealResult, loading, error, seal };
}
