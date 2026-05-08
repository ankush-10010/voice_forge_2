import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  EXTRACT_EMBEDDING_URL,
  GENERATE_AUDIO_URL,
  LOAD_MODELS_URL,
  SPECTROGRAM_IMAGE_URL,
  SYNTHESIZE_SPECTROGRAM_URL,
  VOCODE_AUDIO_URL,
} from "../backend";

export const Route = createFileRoute("/")({
  component: Index,
});

type Embedding = number[];

// FIX: Matched the exact absolute paths from your working curl command
const modelPayload = {
  encoder_path: "/root/saved_models/default/encoder.pt",
  synthesizer_path: "/root/saved_models/default/synthesizer.pt",
  vocoder_path: "/root/saved_models/default/vocoder.pt",
};

async function ensureOk(response: Response, fallback: string) {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || fallback);
  }
}

function Index() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState("");
  const [embedding, setEmbedding] = useState<Embedding | null>(null);
  // FIX: Updated default text to match your test payload
  const [textPrompt, setTextPrompt] = useState("Hey man, this is Joe. We are cloning this voice directly from the cloud using Modal GPUs.");
  const [specId, setSpecId] = useState("");
  const [spectrogramImgUrl, setSpectrogramImgUrl] = useState("");
  const [waveformImgUrl, setWaveformImgUrl] = useState("");
  const [outputAudioUrl, setOutputAudioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const embeddingReady = Boolean(embedding?.length);
  const statusText = useMemo(() => {
    if (isLoading) return loadingStatus;
    if (modelsLoaded && embeddingReady && specId) return "Pipeline ready for final waveform export";
    if (modelsLoaded && embeddingReady) return "Voice embedding ready";
    if (modelsLoaded) return "Models loaded on GPU";
    return "Awaiting model initialization";
  }, [embeddingReady, isLoading, loadingStatus, modelsLoaded, specId]);

  useEffect(() => {
    return () => {
      if (referenceAudioUrl) URL.revokeObjectURL(referenceAudioUrl);
      if (spectrogramImgUrl) URL.revokeObjectURL(spectrogramImgUrl);
      if (waveformImgUrl) URL.revokeObjectURL(waveformImgUrl);
      if (outputAudioUrl) URL.revokeObjectURL(outputAudioUrl);
    };
  }, [outputAudioUrl, referenceAudioUrl, spectrogramImgUrl, waveformImgUrl]);

  const b64toBlob = (b64Data: string, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: contentType});
  }

  const runRequest = async (status: string, request: () => Promise<void>) => {
    setIsLoading(true);
    setLoadingStatus(status);
    setErrorMessage("");
    try {
      await request();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Request failed. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const handleReferenceAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReferenceAudio(file);
    setEmbedding(null);
    if (referenceAudioUrl) URL.revokeObjectURL(referenceAudioUrl);
    setReferenceAudioUrl(file ? URL.createObjectURL(file) : "");
  };

  const loadModels = () => runRequest("Loading encoder, synthesizer, and vocoder onto GPU…", async () => {
    const response = await fetch(LOAD_MODELS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelPayload),
    });
    await ensureOk(response, "Unable to load the ML models.");
    setModelsLoaded(true);
  });

  const extractEmbedding = () => runRequest("Extracting speaker embedding from reference audio…", async () => {
    if (!referenceAudio) throw new Error("Upload a .wav or .mp3 reference audio file first.");
    const formData = new FormData();
    
    // FIX: Changed "audio" to "file" to match the FastAPI UploadFile parameter
    formData.append("file", referenceAudio); 
    
    const response = await fetch(EXTRACT_EMBEDDING_URL, { method: "POST", body: formData });
    await ensureOk(response, "Unable to extract the speaker embedding.");
    const data = await response.json();
    
    // FIX: Changed data.embedding to data.embed to match the python backend dictionary key
    setEmbedding(Array.isArray(data) ? data : data.embed);
  });

  const generateSpectrogram = () => runRequest("Synthesizing Mel spectrogram and fetching preview…", async () => {
    const response = await fetch(SYNTHESIZE_SPECTROGRAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textPrompt, embed: embedding }),
    });
    await ensureOk(response, "Unable to synthesize the spectrogram.");
    const data = await response.json();
    const nextSpecId = data.spec_id;
    if (!nextSpecId) throw new Error("The backend did not return a spec_id.");
    setSpecId(nextSpecId);

    // FIX: Use the base64 image returned directly from the synthesis request 
    // to avoid 404 errors in multi-container Modal environments.
    if (data.spec_img_base64) {
      if (spectrogramImgUrl) URL.revokeObjectURL(spectrogramImgUrl);
      setSpectrogramImgUrl(`data:image/png;base64,${data.spec_img_base64}`);
    } else {
      // Fallback to legacy behavior if backend hasn't been updated
      const imageResponse = await fetch(`${SPECTROGRAM_IMAGE_URL}/spectrogram_image/${nextSpecId}`);
      await ensureOk(imageResponse, "Unable to fetch the spectrogram image.");
      const imageBlob = await imageResponse.blob();
      if (spectrogramImgUrl) URL.revokeObjectURL(spectrogramImgUrl);
      setSpectrogramImgUrl(URL.createObjectURL(imageBlob));
    }
  });

  const vocodeAudio = () => runRequest("Running vocoder on generated spectrogram…", async () => {
    const response = await fetch(VOCODE_AUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec_id: specId }),
    });
    await ensureOk(response, "Unable to vocode audio from this spectrogram.");
    const data = await response.json();
    
    if (data.audio_base64) {
      const audioBlob = b64toBlob(data.audio_base64, 'audio/wav');
      if (outputAudioUrl) URL.revokeObjectURL(outputAudioUrl);
      setOutputAudioUrl(URL.createObjectURL(audioBlob));
    }
    if (data.waveform_img_base64) {
      if (waveformImgUrl) URL.revokeObjectURL(waveformImgUrl);
      setWaveformImgUrl(`data:image/png;base64,${data.waveform_img_base64}`);
    }
  });

  const generateAudio = () => runRequest("Generating cloned waveform in one pass…", async () => {
    const response = await fetch(GENERATE_AUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // This sends {"text": "...", "embed": [..]} which matches your payload.json structure
      body: JSON.stringify({ text: textPrompt, embed: embedding }),
    });
    await ensureOk(response, "Unable to generate cloned audio.");
    const data = await response.json();
    
    if (data.audio_base64) {
      const audioBlob = b64toBlob(data.audio_base64, 'audio/wav');
      if (outputAudioUrl) URL.revokeObjectURL(outputAudioUrl);
      setOutputAudioUrl(URL.createObjectURL(audioBlob));
    }
    if (data.waveform_img_base64) {
      if (waveformImgUrl) URL.revokeObjectURL(waveformImgUrl);
      setWaveformImgUrl(`data:image/png;base64,${data.waveform_img_base64}`);
    }
    if (data.spec_img_base64) {
      if (spectrogramImgUrl) URL.revokeObjectURL(spectrogramImgUrl);
      setSpectrogramImgUrl(`data:image/png;base64,${data.spec_img_base64}`);
    }
  });

  return (
    <main className="voice-grid min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-surface-glow blur-3xl" />
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex rounded-md border border-border bg-panel-strong px-3 py-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Real-time voice cloning control plane
            </p>
            <h1 className="font-display text-4xl font-black tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              VoiceClone ML Pipeline
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Load GPU models, capture speaker identity, synthesize a Mel spectrogram, and export a cloned waveform from one responsive dashboard.
            </p>
          </div>
          <div className="min-w-72 rounded-lg border border-border bg-panel p-4 shadow-panel backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-panel-foreground">System status</span>
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>
            <p className="text-sm text-muted-foreground">{statusText}</p>
            <div className="mt-4 flex h-10 items-end gap-1.5 overflow-hidden rounded-md bg-wave/10 px-3 py-2">
              {Array.from({ length: 28 }).map((_, index) => (
                <span
                  key={index}
                  className="signal-wave block w-full origin-bottom rounded-full bg-wave"
                  style={{ animationDelay: `${index * 70}ms`, height: `${28 + ((index * 13) % 42)}%` }}
                />
              ))}
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.05fr]">
          <Panel title="01 · Setup & Environment" delay="0ms">
            <ActionButton onClick={loadModels} disabled={modelsLoaded || isLoading} tone="primary">
              {modelsLoaded ? "Models Loaded" : "Load Models"}
            </ActionButton>
            <EndpointLabel value={LOAD_MODELS_URL} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-panel-foreground">Reference audio</span>
              <input
                type="file"
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                onChange={handleReferenceAudio}
                className="w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground"
              />
            </label>
            {referenceAudioUrl ? <audio className="w-full" controls src={referenceAudioUrl} /> : <EmptyLine text="Upload a .wav or .mp3 clip to preview it here." />}
            <ActionButton onClick={extractEmbedding} disabled={!modelsLoaded || !referenceAudio || isLoading}>
              Extract Embedding
            </ActionButton>
            <EndpointLabel value={EXTRACT_EMBEDDING_URL} />
            <Metric label="Embedding vector" value={embeddingReady ? `${embedding?.length ?? 0} floats` : "Not extracted"} />
          </Panel>

          <Panel title="02 · Generation Controls" delay="90ms">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-panel-foreground">Text prompt</span>
              <textarea
                value={textPrompt}
                onChange={(event) => setTextPrompt(event.target.value)}
                rows={7}
                className="min-h-40 w-full resize-none rounded-md border border-input bg-background/70 px-3 py-3 text-sm leading-6 text-foreground shadow-inner placeholder:text-muted-foreground"
                placeholder="Type the script for the cloned voice…"
              />
            </label>
            <ActionButton onClick={generateSpectrogram} disabled={!embeddingReady || !textPrompt.trim() || isLoading}>
              Generate Spectrogram
            </ActionButton>
            <EndpointLabel value={SYNTHESIZE_SPECTROGRAM_URL} />
            <ActionButton onClick={vocodeAudio} disabled={!specId || isLoading}>
              Vocode Audio
            </ActionButton>
            <EndpointLabel value={VOCODE_AUDIO_URL} />
            <ActionButton onClick={generateAudio} disabled={!embeddingReady || !textPrompt.trim() || isLoading} tone="highlight">
              Generate Audio · All-in-One
            </ActionButton>
            <EndpointLabel value={GENERATE_AUDIO_URL} />
          </Panel>

          <Panel title="03 · Visualizer & Output" delay="180ms">
            <div className="rounded-lg border border-border bg-background/45 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-panel-foreground">Mel spectrogram</span>
                <span className="truncate text-xs text-muted-foreground">{specId || "No spec_id"}</span>
              </div>
              {spectrogramImgUrl ? (
                <img src={spectrogramImgUrl} alt="Generated Mel spectrogram" className="h-56 w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-border bg-muted/50 text-center text-sm text-muted-foreground">
                  Spectrogram image appears after calling {SPECTROGRAM_IMAGE_URL}/&#123;spec_id&#125;
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-background/45 p-3">
              <span className="mb-3 block text-sm font-semibold text-panel-foreground">Output audio</span>
              {outputAudioUrl ? (
                <div className="flex flex-col gap-3">
                  {waveformImgUrl && (
                    <img src={waveformImgUrl} alt="Generated Audio Waveform" className="h-32 w-full rounded-md object-cover border border-border/50 shadow-inner" />
                  )}
                  <audio className="w-full" controls src={outputAudioUrl} />
                  <a className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-bold text-secondary-foreground transition hover:scale-[1.01]" href={outputAudioUrl} download="cloned-voice.wav">
                    Download WAV
                  </a>
                </div>
              ) : (
                <EmptyLine text="Generated .wav playback and download controls will appear here." />
              )}
            </div>
            <Metric label="Loading state" value={isLoading ? loadingStatus : "Idle"} />
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, delay, children }: { title: string; delay: string; children: React.ReactNode }) {
  return (
    <section className="panel-enter flex min-h-[560px] flex-col gap-4 rounded-lg border border-border bg-panel p-5 shadow-panel backdrop-blur-xl" style={{ animationDelay: delay }}>
      <h2 className="font-display text-lg font-black tracking-normal text-panel-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ActionButton({ children, disabled, onClick, tone = "default" }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; tone?: "default" | "primary" | "highlight" }) {
  const toneClass = tone === "highlight" ? "bg-accent text-accent-foreground shadow-action" : tone === "primary" ? "bg-primary text-primary-foreground shadow-action" : "bg-wave text-wave-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${toneClass} inline-flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-black transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0`}
    >
      {children}
    </button>
  );
}

function EndpointLabel({ value }: { value: string }) {
  return <p className="-mt-2 break-all rounded-md bg-muted px-2 py-1 font-mono text-[11px] leading-4 text-muted-foreground">{value}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-auto rounded-md border border-border bg-panel-strong p-3">
      <span className="block text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</span>
      <span className="mt-1 block text-sm font-bold text-panel-foreground">{value}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border bg-muted/45 px-3 py-4 text-sm text-muted-foreground">{text}</div>;
}