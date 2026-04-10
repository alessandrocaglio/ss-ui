import { useState } from "react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { CopyIcon, DownloadIcon, TerminalIcon, CheckIcon } from "lucide-react";
import type { SealResponse, SealRequest, CertInfo } from "../../types/api";

interface Props {
  sealResult: SealResponse | null;
  lastRequest: SealRequest | null;
  certInfo: CertInfo | null;
  loading: boolean;
  theme: string;
  showValues: boolean;
}

export function YamlPreview({ sealResult, lastRequest, certInfo, loading, theme, showValues }: Props) {
  const [format, setFormat] = useState<"sealed" | "gitops">("sealed");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [showCli, setShowCli] = useState(false);

  let displayYaml = sealResult?.yaml || "";
  const displayFilename = sealResult?.filename || "";

  if (format === "gitops" && sealResult?.encryptedData) {
    const lines = [`- name: ${sealResult.name || "sealed-secret"}`];
    
    if (sealResult.labels && Object.keys(sealResult.labels).length > 0) {
      lines.push("  labels:");
      for (const [k, v] of Object.entries(sealResult.labels)) {
        lines.push(`    ${k}: ${v}`);
      }
    }

    if (sealResult.annotations && Object.keys(sealResult.annotations).length > 0) {
      lines.push("  annotations:");
      for (const [k, v] of Object.entries(sealResult.annotations)) {
        lines.push(`    ${k}: ${v}`);
      }
    }

    lines.push("  data:");
    for (const [k, v] of Object.entries(sealResult.encryptedData)) {
      lines.push(`    ${k}: ${v}`);
    }
    displayYaml = lines.join("\n");
  }

  const handleCopy = () => {
    if (!displayYaml) return;
    navigator.clipboard.writeText(displayYaml);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    if (!displayYaml) return;
    const blob = new Blob([displayYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = displayFilename || "sealed-secret.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateKubesealCommand = () => {
    if (!lastRequest) return "";

    let cmd = "";
    
    if (lastRequest.secretYaml) {
      cmd = `cat secret.yaml | \\\n  kubeseal --format yaml`;
    } else {
      let createCmd = "";
      const name = lastRequest.name || "my-secret";
      const ns = lastRequest.namespace ? ` -n ${lastRequest.namespace}` : "";

      if (lastRequest.type === "kubernetes.io/dockerconfigjson") {
         // Since the backend constructs the full JSON, revealing it in the CLI might be complex. 
         // For now, let's just respect the toggle for direct literals.
         createCmd = `kubectl create secret docker-registry ${name}${ns} \\\n  --docker-server=... \\\n  --docker-username=... \\\n  --docker-password=...`;
      } else if (lastRequest.type === "kubernetes.io/tls") {
         createCmd = `kubectl create secret tls ${name}${ns} \\\n  --cert=tls.crt \\\n  --key=tls.key`;
      } else {
         const type = lastRequest.type === "Opaque" ? "generic" : lastRequest.type.replace("kubernetes.io/", "");
         createCmd = `kubectl create secret ${type} ${name}${ns}`;
         Object.keys(lastRequest.data).forEach(key => {
           const val = showValues ? lastRequest.data[key] : "...";
           createCmd += ` \\\n  --from-literal=${key}='${val}'`;
         });
      }

      cmd = `${createCmd} \\\n  --dry-run=client -o yaml | \\\n  kubeseal --format yaml`;
    }

    // Add scope
    if (lastRequest.scope && lastRequest.scope !== "strict") {
      cmd += ` \\\n  --scope ${lastRequest.scope}`;
    }

    // Add cert/controller info
    if (certInfo) {
      if (certInfo.source === "controller") {
        cmd += ` \\\n  --controller-name=sealed-secrets \\\n  --controller-namespace=kube-system`;
      } else {
        cmd += ` \\\n  --cert cert.pem`;
      }
    }

    return cmd;
  };

  const cliCommand = generateKubesealCommand();

  const handleCopyCmd = () => {
    if (!cliCommand) return;
    navigator.clipboard.writeText(cliCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
    toast.success("Command copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground border rounded-lg shadow-sm">
        Generating...
      </div>
    );
  }

  if (!sealResult) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground border rounded-lg p-6 text-center shadow-sm">
        Fill out the form and click 'Generate Sealed Secret' to see the output here.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col flex-1 border rounded-lg bg-card overflow-hidden shadow-sm min-h-0">
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
          <span className="text-sm font-mono text-muted-foreground">{displayFilename}</span>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="p-2 hover:bg-muted hover:text-foreground rounded text-sm flex items-center gap-1 text-muted-foreground transition-colors">
              <CopyIcon size={14} /> Copy
            </button>
            <button onClick={handleDownload} className="p-2 hover:bg-muted hover:text-foreground rounded text-sm flex items-center gap-1 text-muted-foreground transition-colors">
              <DownloadIcon size={14} /> Download
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-background">
          <Editor
            height="100%"
            defaultLanguage="yaml"
            value={displayYaml}
            theme={theme === "dark" ? "vs-dark" : "vs-light"}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: "on",
              wordWrap: "on",
              fontFamily: "'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace",
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <div className="flex items-center gap-4 border-t px-4 py-3 bg-muted/30">
          <label className="flex items-center gap-2 text-sm cursor-pointer font-medium hover:text-primary transition-colors">
            <input 
              type="radio" 
              name="yamlFormat" 
              value="sealed" 
              checked={format === "sealed"} 
              onChange={() => setFormat("sealed")} 
              className="w-4 h-4 accent-primary" 
            />
            Sealed Secret
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer font-medium hover:text-primary transition-colors">
            <input 
              type="radio" 
              name="yamlFormat" 
              value="gitops" 
              checked={format === "gitops"} 
              onChange={() => setFormat("gitops")} 
              className="w-4 h-4 accent-primary" 
            />
            GitOps helper
          </label>
        </div>
      </div>

      {/* CLI Command Preview */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm shrink-0">
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setShowCli(!showCli)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowCli(!showCli);
            }
          }}
          className="w-full flex items-center justify-between px-4 py-2 bg-muted/50 hover:bg-muted transition-colors cursor-pointer border-b"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <TerminalIcon size={16} className="text-primary" />
            Equivalent CLI Command
          </div>
          <div className="flex items-center gap-2">
             {showCli && (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCmd();
                }}
                className="p-1 hover:bg-muted-foreground/10 rounded transition-colors text-muted-foreground hover:text-foreground mr-1"
                title="Copy Command"
              >
                {copiedCmd ? <CheckIcon size={14} className="text-green-500" /> : <CopyIcon size={14} />}
              </button>
             )}
             <ChevronRightIcon size={16} className={`text-muted-foreground transition-transform duration-200 ${showCli ? "rotate-90" : ""}`} />
          </div>
        </div>
        
        {showCli && (
          <div className="p-3 bg-zinc-950 dark:bg-zinc-900 overflow-x-auto">
            <pre className="m-0">
              <code className="text-[13px] font-mono text-zinc-300 whitespace-pre">
                {cliCommand}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronRightIcon({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
