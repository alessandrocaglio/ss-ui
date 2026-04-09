import { useState } from "react";
import type { SealRequest } from "../../types/api";
import { ChevronDown, ChevronRight, X, Plus } from "lucide-react";

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

  const [labelPairs, setLabelPairs] = useState<{key: string, value: string}[]>([]);
  const [annotationPairs, setAnnotationPairs] = useState<{key: string, value: string}[]>([]);
  const [showMetadataExtras, setShowMetadataExtras] = useState(false);
  
  // Specialized types
  const [dockerUser, setDockerUser] = useState("");
  const [dockerPass, setDockerPass] = useState("");
  const [dockerRegistry, setDockerRegistry] = useState("https://index.docker.io/v1/");

  const [tlsCert, setTlsCert] = useState("");
  const [tlsKey, setTlsKey] = useState("");

  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const [sshKey, setSshKey] = useState("");

  // Raw YAML state
  const [rawYaml, setRawYaml] = useState("");

  const hasData = () => {
    if (type === "Opaque") return kvPairs.some(kv => kv.key || kv.value);
    if (type === "kubernetes.io/dockerconfigjson") return dockerUser || dockerPass;
    if (type === "kubernetes.io/tls") return tlsCert || tlsKey;
    if (type === "kubernetes.io/basic-auth") return authUsername || authPassword;
    if (type === "kubernetes.io/ssh-auth") return sshKey;
    return false;
  };

  const handleTypeChange = (newType: string) => {
    if (newType === type) return;
    if (hasData()) {
      if (!confirm("Changing the secret type will reset the data fields. Do you want to proceed?")) {
        return;
      }
    }
    // Reset data fields
    setKvPairs([{ key: "", value: "" }]);
    setDockerUser("");
    setDockerPass("");
    setTlsCert("");
    setTlsKey("");
    setAuthUsername("");
    setAuthPassword("");
    setSshKey("");
    
    setType(newType);
  };

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
    const annotations: Record<string, string> = {};
    const labels: Record<string, string> = {};

    // Process custom labels
    labelPairs.forEach(p => {
      if (p.key) labels[p.key] = p.value;
    });

    // Process custom annotations
    annotationPairs.forEach(p => {
      if (p.key) annotations[p.key] = p.value;
    });

    if (type === "Opaque") {
      kvPairs.forEach(kv => {
        if (kv.key) data[kv.key] = kv.value;
      });
    } else if (type === "kubernetes.io/dockerconfigjson") {
      const auth = btoa(`${dockerUser}:${dockerPass}`);
      const cfg = { auths: { [dockerRegistry]: { auth } } };
      data[".dockerconfigjson"] = JSON.stringify(cfg);
    } else if (type === "kubernetes.io/tls") {
      if (tlsCert) {
        if (!tlsCert.trim().startsWith("-----BEGIN CERTIFICATE-----")) {
          alert("TLS Certificate must start with '-----BEGIN CERTIFICATE-----'");
          return;
        }
        data["tls.crt"] = tlsCert;
      }
      if (tlsKey) data["tls.key"] = tlsKey;
    } else if (type === "kubernetes.io/basic-auth") {
      if (authUsername) data["username"] = authUsername;
      if (authPassword) data["password"] = authPassword;
    } else if (type === "kubernetes.io/ssh-auth") {
      if (sshKey) {
        if (!sshKey.trim().startsWith("-----BEGIN")) {
          alert("SSH Key must start with '-----BEGIN'");
          return;
        }
        data["ssh-privatekey"] = sshKey;
      }
    }
    
    onGenerate({
      name, namespace, type, scope, data, annotations, labels
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

            <div className="border rounded-md overflow-hidden">
               <button 
                 type="button"
                 onClick={() => setShowMetadataExtras(!showMetadataExtras)}
                 className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium"
               >
                 <span>Labels & Annotations</span>
                 {showMetadataExtras ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
               </button>
               
               {showMetadataExtras && (
                 <div className="p-3 space-y-4 bg-background">
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-muted-foreground uppercase">Labels</label>
                       {labelPairs.map((lp, i) => (
                         <div key={i} className="flex gap-2">
                            <input className="flex-1 p-1.5 border rounded text-xs" placeholder="key" value={lp.key} onChange={e => {
                               const next = [...labelPairs];
                               next[i].key = e.target.value;
                               setLabelPairs(next);
                            }} />
                            <input className="flex-1 p-1.5 border rounded text-xs" placeholder="value" value={lp.value} onChange={e => {
                               const next = [...labelPairs];
                               next[i].value = e.target.value;
                               setLabelPairs(next);
                            }} />
                            <button type="button" onClick={() => setLabelPairs(labelPairs.filter((_, idx) => idx !== i))} className="text-destructive"><X size={14}/></button>
                         </div>
                       ))}
                       <button type="button" onClick={() => setLabelPairs([...labelPairs, {key:"", value:""}])} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                         <Plus size={12}/> Add Label
                       </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                       <label className="text-xs font-semibold text-muted-foreground uppercase">Annotations</label>
                       {annotationPairs.map((ap, i) => (
                         <div key={i} className="flex gap-2">
                            <input className="flex-1 p-1.5 border rounded text-xs" placeholder="key" value={ap.key} onChange={e => {
                               const next = [...annotationPairs];
                               next[i].key = e.target.value;
                               setAnnotationPairs(next);
                            }} />
                            <input className="flex-1 p-1.5 border rounded text-xs" placeholder="value" value={ap.value} onChange={e => {
                               const next = [...annotationPairs];
                               next[i].value = e.target.value;
                               setAnnotationPairs(next);
                            }} />
                            <button type="button" onClick={() => setAnnotationPairs(annotationPairs.filter((_, idx) => idx !== i))} className="text-destructive"><X size={14}/></button>
                         </div>
                       ))}
                       <button type="button" onClick={() => setAnnotationPairs([...annotationPairs, {key:"", value:""}])} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                         <Plus size={12}/> Add Annotation
                       </button>
                    </div>
                 </div>
               )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Secret Type</label>
              <select className="w-full p-2 border rounded text-sm outline-none" value={type} onChange={e => handleTypeChange(e.target.value)}>
                <option value="Opaque">Opaque</option>
                <option value="kubernetes.io/dockerconfigjson">Image Pull Secret</option>
                <option value="kubernetes.io/tls">TLS</option>
                <option value="kubernetes.io/basic-auth">Basic Authentication</option>
                <option value="kubernetes.io/ssh-auth">SSH Authentication</option>
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
                  <input required className="col-span-2 p-2 border rounded text-sm" placeholder="Registry (e.g. https://index.docker.io/v1/)" value={dockerRegistry} onChange={e=>setDockerRegistry(e.target.value)} />
                  <input required className="p-2 border rounded text-sm" placeholder="Username" value={dockerUser} onChange={e=>setDockerUser(e.target.value)} />
                  <input required type="password" className="p-2 border rounded text-sm" placeholder="Password" value={dockerPass} onChange={e=>setDockerPass(e.target.value)} />
                </div>
              )}

              {type === "kubernetes.io/tls" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">TLS Certificate (tls.crt)</label>
                    <textarea 
                      required 
                      className="w-full text-xs font-mono p-2 border rounded h-24 focus:ring-1 outline-none" 
                      placeholder="-----BEGIN CERTIFICATE-----" 
                      value={tlsCert}
                      onChange={e => setTlsCert(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">TLS Key (tls.key)</label>
                    <textarea 
                      required 
                      className="w-full text-xs font-mono p-2 border rounded h-24 focus:ring-1 outline-none" 
                      placeholder="-----BEGIN RSA PRIVATE KEY-----" 
                      value={tlsKey}
                      onChange={e => setTlsKey(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {type === "kubernetes.io/basic-auth" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Username</label>
                    <input required className="w-full p-2 border rounded text-sm outline-none focus:ring-1" value={authUsername} onChange={e=>setAuthUsername(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Password</label>
                    <input required type="password" className="w-full p-2 border rounded text-sm outline-none focus:ring-1" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} />
                  </div>
                </div>
              )}

              {type === "kubernetes.io/ssh-auth" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">SSH Private Key (ssh-privatekey)</label>
                  <textarea 
                    required 
                    className="w-full text-xs font-mono p-2 border rounded h-32 focus:ring-1 outline-none" 
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" 
                    value={sshKey}
                    onChange={e => setSshKey(e.target.value)}
                  />
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
