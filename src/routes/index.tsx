import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoiceForge — Clone Any Voice in Real-Time" },
      { name: "description", content: "GPU-accelerated text-to-speech engine. Extract mathematical vocal identities and synthesize high-fidelity waveforms instantly." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            <span className="font-display text-lg font-bold tracking-tight">VoiceForge</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#tech" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">Technology</a>
            <a href="#features" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">Features</a>
            <a href="#docs" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">Docs</a>
          </nav>
          <Link
            to="/dashboard"
            className="hidden items-center gap-2 border border-primary bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 md:inline-flex"
          >
            Launch Dashboard →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-32">
          <div className="lg:col-span-8">
            <p className="mb-6 inline-flex items-center gap-2 border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> v1.0 · Production
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Clone Any Voice<br />
              <span className="text-primary">In Real-Time.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
              GPU-accelerated text-to-speech engine. Extract mathematical vocal identities
              and synthesize high-fidelity waveforms instantly.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
              >
                Launch Dashboard →
              </Link>
              <a
                href="#docs"
                className="inline-flex items-center gap-2 border border-border bg-transparent px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary"
              >
                Read The Docs
              </a>
            </div>
          </div>
          <div className="hidden lg:col-span-4 lg:block">
            <div className="border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">status</span>
                <span className="inline-flex items-center gap-2 bg-[#09af58] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#ddffdc]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ddffdc]" /> Active
                </span>
              </div>
              <div className="space-y-3 font-mono text-xs">
                <Row k="GPU" v="T4 · 80GB" />
                <Row k="Sample Rate" v="22.05 kHz" />
                <Row k="Embed Dim" v="256 floats" />
                <Row k="Backend" v="Modal · PyTorch" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="tech" className="border-b border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-16 flex items-end justify-between border-b border-border pb-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              The Architecture
            </h2>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-on-surface-variant sm:inline">
              4-stage pipeline
            </span>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <Step n="01" t="Setup Models" d="Initialize optimized transformer architectures on dedicated high-memory GPU instances." />
            <Step n="02" t="Extract Embedding" d="Process reference audio to isolate the speaker's mathematical vocal identity vector." />
            <Step n="03" t="Synthesize Spectrogram" d="Generate intermediate visual representations of audio frequencies based on input text and embeddings." />
            <Step n="04" t="Generate Audio" d="Vocoder models translate spectrograms into pristine, high-fidelity audio waveforms." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="font-display text-lg font-bold tracking-tight">VoiceForge</div>
            <p className="mt-1 font-mono text-xs text-on-surface-variant">© 2024 VoiceForge. Powered by Modal GPUs &amp; PyTorch.</p>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs uppercase tracking-wider text-on-surface-variant">
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Terms</a>
            <a href="#" className="hover:text-primary">Github</a>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Status
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="uppercase tracking-wider text-on-surface-variant">{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="group relative bg-background p-8 transition hover:bg-card">
      <div className="mb-6 font-mono text-xs uppercase tracking-widest text-primary">{n}</div>
      <h3 className="mb-3 font-display text-xl font-semibold tracking-tight">{t}</h3>
      <p className="text-sm leading-relaxed text-on-surface-variant">{d}</p>
      <div className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
    </div>
  );
}
