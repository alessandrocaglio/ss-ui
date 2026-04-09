import { useState, useEffect } from "react";
import type { CertInfo, CertSource } from "../../types/api";
import { CheckCircle2, ShieldAlert, UploadCloud } from "lucide-react";

interface Props {
  certInfo: CertInfo | null;
  switchSource: (source: CertSource) => void;
  uploadCertText: (str: string | File) => void;
}

export function CertificatePanel({ certInfo, switchSource, uploadCertText }: Props) {
  const [pasteVal, setPasteVal] = useState("");
  const [activeTab, setActiveTab] = useState<CertSource>("upload");

  useEffect(() => {
    if (certInfo && certInfo.source !== "none") {
      setTimeout(() => setActiveTab(certInfo.source), 0);
    }
  }, [certInfo, certInfo?.source]);

  const isAvail = (src: CertSource) => certInfo?.availableSources.includes(src);

  const handleTabClick = (src: CertSource) => {
    setActiveTab(src);
    if (isAvail(src)) {
      switchSource(src);
    }
  };

  return (
    <div className="border rounded-lg bg-card mb-6 shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
        <h3 className="font-semibold text-sm">Certificate Configuration</h3>
        {certInfo?.source && certInfo.source !== "none" ? (
          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            <CheckCircle2 size={12} /> Active: {certInfo.source}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            <ShieldAlert size={12} /> No Certificate
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {certInfo?.pem && activeTab === certInfo.source && (
          <div className="p-3 bg-muted rounded border text-xs font-mono break-all text-muted-foreground">
            <b>Fingerprint:</b> {certInfo.fingerprint}<br/>
            <b>Expires:</b> {new Date(certInfo.expiresAt).toLocaleString()}<br/>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 border-b pb-2">
          <button 
            disabled={!isAvail("controller")}
            onClick={() => handleTabClick("controller")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === "controller" ? "bg-primary text-white" :  isAvail("controller") ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"}`}
          >
            Controller {isAvail("controller") ? "" : "(Not Available)"}
          </button>
          <button 
            disabled={!isAvail("file")}
            onClick={() => handleTabClick("file")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === "file" ? "bg-primary text-white" : isAvail("file") ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"}`}
          >
            File {isAvail("file") ? "" : "(Not configured)"}
          </button>
          <button 
            onClick={() => handleTabClick("upload")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === "upload" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            Upload manually
          </button>
        </div>

        {activeTab === "upload" && (
           <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-foreground">Paste PEM or drop a .pem file</label>
              <textarea 
                className="w-full text-xs font-mono p-2 border rounded bg-background h-32 focus:ring-1 focus:ring-primary outline-none" 
                placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                value={pasteVal}
                onChange={e => setPasteVal(e.target.value)}
              />
              <button 
                onClick={() => uploadCertText(pasteVal)}
                disabled={!pasteVal}
                className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                <UploadCloud size={16}/> Use This Certificate
              </button>
           </div>
        )}
      </div>
    </div>
  );
}
