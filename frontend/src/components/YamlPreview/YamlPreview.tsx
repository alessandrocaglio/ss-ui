import { useState } from "react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { CopyIcon, DownloadIcon } from "lucide-react";
import type { SealResponse } from "../../types/api";

export function YamlPreview({ sealResult, loading, theme }: { sealResult: SealResponse | null; loading: boolean, theme: string }) {
  const [format, setFormat] = useState<"sealed" | "gitops">("sealed");

  let displayYaml = sealResult?.yaml || "";
  const displayFilename = sealResult?.filename || "";

  if (format === "gitops" && sealResult?.encryptedData) {
    const lines = [`- name: ${sealResult.name || "sealed-secret"}`];
    lines.push("  data:");
    for (const [k, v] of Object.entries(sealResult.encryptedData)) {
      lines.push(`     ${k}: ${v}`);
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
    <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden shadow-sm">
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
  );
}
