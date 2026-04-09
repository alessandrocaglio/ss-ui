import { useState } from "react";
import type { SealRequest } from "../../types/api";

interface Props {
  onGenerate: (req: SealRequest) => void;
  loading: boolean;
  disabled: boolean;
}

export function SecretForm({ onGenerate, loading, disabled }: Props) {
  const [tab, setTab] = useState<"form" | "yaml">("form");
  
  // Form State
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("");
  const [type, setType] = useState("Opaque");
  const [scope, setScope] = useState<"strict" | "namespace-wide" | "cluster-wide">("strict");

  const [kvPairs, setKvPairs] = useState([{ key: "", value: "" }]);
  
  // Specialized types
  const [dockerUser, setDockerUser] = useState("");
  const [dockerPass, setDockerPass] = useState("");
  const [dockerRegistry, setDockerRegistry] = useState("https://index.docker.io/v1/");

  // Raw YAML state
  const [rawYaml, setRawYaml] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (tab === "yaml") {
      onGenerate({
        name: "", namespace: "", type: "Opaque", data: {}, scope: "strict", secretYaml: rawYaml
      });
      return;
    }

    const data: Record<string, string> = {};
    if (type === "Opaque") {
      kvPairs.forEach(kv => {
        if (kv.key) data[kv.key] = kv.value;
      });
    } else if (type === "kubernetes.io/dockerconfigjson") {
      const auth = btoa(`${dockerUser}:${dockerPass}`);
      const cfg = { auths: { [dockerRegistry]: { auth } } };
      data[".dockerconfigjson"] = JSON.stringify(cfg);
    }
    
    onGenerate({
      name, namespace, type, scope, data
    });
  };

  return (
    <div className="border rounded-lg bg-card shadow-sm flex flex-col">
      <div className="border-b flex">
        <button 
          onClick={() => setTab("form")}
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${tab === "form" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Form Builder
        </button>
        <button 
          onClick={() => setTab("yaml")}
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${tab === "yaml" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Raw Secret YAML
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        {tab === "yaml" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Paste Kubernetes Secret YAML</label>
            <textarea 
              className="w-full text-xs font-mono p-3 border rounded h-64 focus:ring-1 focus:ring-primary outline-none"
              placeholder={'apiVersion: v1\nkind: Secret\nmetadata:\n  name: my-secret\n  namespace: default\ndata:\n  key: value'}
              value={rawYaml}
              onChange={e => setRawYaml(e.target.value)}
              required
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input required className="w-full p-2 border rounded text-sm focus:ring-1 outline-none" value={name} onChange={e=>setName(e.target.value)} placeholder="my-secret" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Namespace</label>
                <input required className="w-full p-2 border rounded text-sm focus:ring-1 outline-none" value={namespace} onChange={e=>setNamespace(e.target.value)} placeholder="default" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Secret Type</label>
              <select className="w-full p-2 border rounded text-sm outline-none" value={type} onChange={e=>setType(e.target.value)}>
                <option value="Opaque">Opaque</option>
                <option value="kubernetes.io/dockerconfigjson">Docker Registration (Image Pull)</option>
              </select>
            </div>

            <div className="p-3 bg-muted/30 border rounded space-y-3">
              <h4 className="text-sm font-semibold">Data</h4>
              {type === "Opaque" && (
                <div className="space-y-2">
                  {kvPairs.map((kv, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="w-1/3 p-2 border rounded text-sm" placeholder="Key" value={kv.key} onChange={e => {
                        const newKv = [...kvPairs];
                        newKv[i].key = e.target.value;
                        setKvPairs(newKv);
                      }} />
                      <input type="password" className="flex-1 p-2 border rounded text-sm" placeholder="Value" value={kv.value} onChange={e => {
                        const newKv = [...kvPairs];
                        newKv[i].value = e.target.value;
                        setKvPairs(newKv);
                      }} />
                      <button type="button" onClick={() => setKvPairs(kvPairs.filter((_, idx) => idx !== i))} className="px-2 text-destructive">X</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setKvPairs([...kvPairs, {key:"", value:""}])} className="text-sm text-primary font-medium hover:underline">+ Add Row</button>
                </div>
              )}

              {type === "kubernetes.io/dockerconfigjson" && (
                <div className="grid grid-cols-2 gap-3">
                  <input required className="col-span-2 p-2 border rounded text-sm" placeholder="Registry (e.g. docker.io)" value={dockerRegistry} onChange={e=>setDockerRegistry(e.target.value)} />
                  <input required className="p-2 border rounded text-sm" placeholder="Username" value={dockerUser} onChange={e=>setDockerUser(e.target.value)} />
                  <input required type="password" className="p-2 border rounded text-sm" placeholder="Password" value={dockerPass} onChange={e=>setDockerPass(e.target.value)} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sealing Scope</label>
              <select className="w-full p-2 border rounded text-sm outline-none" value={scope} onChange={e=>setScope(e.target.value as "strict" | "namespace-wide" | "cluster-wide")}>
                <option value="strict">Strict (Bound to exact name + namespace)</option>
                <option value="namespace-wide">Namespace-wide</option>
                <option value="cluster-wide">Cluster-wide</option>
              </select>
            </div>
          </>
        )}

        <button 
          disabled={disabled || loading}
          className="w-full mt-4 py-2 bg-primary text-white rounded font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Sealed Secret"}
        </button>
      </form>
    </div>
  );
}
