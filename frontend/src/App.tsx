import { Toaster } from "sonner";
import { useCert } from "./hooks/useCert";
import { useSeal } from "./hooks/useSeal";
import { useTheme } from "./hooks/useTheme";
import { CertificatePanel } from "./components/CertificatePanel/CertificatePanel";
import { SecretForm } from "./components/SecretForm/SecretForm";
import { YamlPreview } from "./components/YamlPreview/YamlPreview";
import { SunIcon, MoonIcon } from "lucide-react";

export default function App() {
  const { certInfo, loading: certLoading, switchSource, uploadCertText } = useCert();
  const { sealResult, loading: sealLoading, seal } = useSeal();
  const { theme, toggleTheme } = useTheme();

  const isCertDisabled = certLoading || (!certInfo || certInfo.source === "none");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <header className="px-6 py-4 border-b flex items-center justify-between bg-card text-card-foreground shadow-sm">
        <div className="flex items-center gap-2">
          {/* Mock logo for styling */}
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center font-bold text-white text-xs">SM</div>
          <h1 className="text-lg font-semibold tracking-tight">ss-ui</h1>
        </div>
        <button 
          onClick={toggleTheme} 
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Toggle Theme"
        >
          {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
      </header>
      
      <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        {/* Left Panel */}
        <div className="w-full lg:w-[500px] xl:w-[600px] flex flex-col shrink-0">
          <CertificatePanel 
            certInfo={certInfo} 
            switchSource={switchSource}
            uploadCertText={uploadCertText}
          />
          <SecretForm 
            onGenerate={seal} 
            loading={sealLoading} 
            disabled={isCertDisabled} 
          />
        </div>

        {/* Right Panel */}
        <div className="w-full lg:flex-1 h-[600px] lg:h-[calc(100vh-8rem)] min-h-[500px]">
          <YamlPreview 
            sealResult={sealResult}
            loading={sealLoading}
            theme={theme}
          />
        </div>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
