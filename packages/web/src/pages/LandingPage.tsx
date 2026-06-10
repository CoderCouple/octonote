import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Mic,
  PenLine,
  ClipboardList,
  Github,
  ArrowRight,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import './landing.css';

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <TopNav />
      <Hero />

      <FeatureSection
        icon={FileText}
        eyebrow="Notes"
        title="Write notes. Or have an agent write them for you."
        tagline="The block editor every modern note app has — plus a structured way for your AI agent to drop notes into the same vault."
        human={{
          heading: 'You',
          body: 'Notion-style blocks: headings, todos, code, callouts, [[wikilinks]], tables. Markdown both ways.',
        }}
        agent={{
          heading: 'Agent',
          body: '`octonote new` or the REST API. Claude reads your vault, drafts new notes, tags them with provenance.',
        }}
        visual={<NoteMockAnimated />}
      />

      <FeatureSection
        reverse
        icon={ClipboardList}
        eyebrow="Plans"
        title="Plans humans approve. Plans agents remember."
        tagline="Capture the plan once. Every agent session afterwards starts from the same source of truth."
        human={{
          heading: 'You',
          body: 'Write the plan inline or paste from a doc. Edit, tag, link to projects.',
        }}
        agent={{
          heading: 'Claude Code',
          body: 'Every ExitPlanMode automatically saves the approved plan into the project brain — recoverable next session.',
        }}
        visual={<PlanMockAnimated />}
      />

      <FeatureSection
        icon={Mic}
        eyebrow="Meetings"
        title="Record. Transcribe. Summarise. Done."
        tagline="One click captures mic + system audio. The vault stores the raw transcript, the AI summary, and a structured action-item list."
        human={{
          heading: 'You',
          body: 'Hit record. Stop when the call ends. Edit the summary if you want — the transcript is always there.',
        }}
        agent={{
          heading: 'Agent',
          body: 'Speaker-attributed transcript via ElevenLabs / Whisper. Claude writes the structured summary + action items.',
        }}
        visual={<MeetingMockAnimated />}
      />

      <FeatureSection
        reverse
        icon={PenLine}
        eyebrow="Diagrams"
        title="Sketch on a real canvas — that lives next to your notes."
        tagline="A full tldraw canvas, persisted to Postgres. Agents can read the JSON snapshot to reason about your diagrams."
        human={{
          heading: 'You',
          body: 'Draw with shapes, arrows, freehand. Pan / zoom canvas auto-saved every couple of seconds.',
        }}
        agent={{
          heading: 'Agent',
          body: 'The tldraw snapshot is plain JSON in the same DB. Agents append shapes or reason over the diagram.',
        }}
        visual={<DiagramMockAnimated />}
      />

      <Waitlist />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────

/** Adds `.lp-in` to the element once it enters the viewport. Once-only. */
function useInViewClass<T extends Element>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-in');
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/** Types a string into state, one character at a time, on a fixed cadence. */
function useTypewriter(full: string, speedMs = 35, startDelayMs = 0) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const start = setTimeout(() => {
      const tick = () => {
        if (cancelled) return;
        if (i <= full.length) {
          setShown(full.slice(0, i));
          i += 1;
          setTimeout(tick, speedMs);
        }
      };
      tick();
    }, startDelayMs);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [full, speedMs, startDelayMs]);
  return shown;
}

// ─────────────────────────────────────────────────────────────────────
// Top nav
// ─────────────────────────────────────────────────────────────────────

function TopNav() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </div>
          <span className="text-base font-semibold">OctoNote</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/CoderCouple/octonote"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            <Github className="size-4" /> GitHub
          </a>
          <Button asChild>
            <Link to="/">
              Open app <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hero — large headline + animated 4-card collage that demos each surface
// ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft radial gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3" /> Closed beta — joining now
        </span>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          <span className="block">Collaborative AI workspace</span>
          <span className="mt-3 flex items-center justify-center gap-3 text-3xl sm:mt-4 sm:gap-4 sm:text-5xl">
            <span className="relative inline-flex items-center gap-2">
              <User className="size-7 text-primary sm:size-9" />
              <span>Human</span>
              <span className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-sm bg-primary/15 sm:h-4" />
            </span>
            <span className="text-foreground/40">+</span>
            <span className="relative inline-flex items-center gap-2">
              <Bot className="size-7 text-primary sm:size-9" />
              <span>Agents</span>
              <span className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-sm bg-primary/15 sm:h-4" />
            </span>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          One vault for the notes you write, the meetings you record, the
          diagrams you sketch — and the plans, decisions, and gotchas your AI
          coding agents drop in between sessions.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="#waitlist">
              Join the waitlist <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Open the app</Link>
          </Button>
        </div>

        {/* Animated collage */}
        <HeroCollage />
      </div>
    </section>
  );
}

function HeroCollage() {
  return (
    <div className="relative mx-auto mt-16 grid h-[420px] max-w-5xl grid-cols-12 grid-rows-6 gap-4">
      <div
        className="lp-float col-span-12 col-start-1 row-span-3 row-start-1 sm:col-span-5 sm:col-start-1"
        style={{ ['--lp-delay' as never]: '0s', ['--lp-rot' as never]: '-1.5deg' }}
      >
        <HeroCard icon={FileText} title="Project Plan" badge="You">
          <HeroLineTyping />
        </HeroCard>
      </div>
      <div
        className="lp-float col-span-12 col-start-1 row-span-3 row-start-4 sm:col-span-4 sm:col-start-6 sm:row-start-2"
        style={{ ['--lp-delay' as never]: '1.2s', ['--lp-rot' as never]: '1deg' }}
      >
        <HeroCard icon={Mic} title="Meeting — May 16" badge="Agent">
          <HeroWaveform />
        </HeroCard>
      </div>
      <div
        className="lp-float col-span-6 col-start-1 row-span-3 sm:col-span-4 sm:col-start-3 sm:row-start-4"
        style={{ ['--lp-delay' as never]: '2.4s', ['--lp-rot' as never]: '1.5deg' }}
      >
        <HeroCard icon={ClipboardList} title="Brain · plan" badge="Claude Code">
          <HeroCheckList />
        </HeroCard>
      </div>
      <div
        className="lp-float col-span-6 col-start-7 row-span-3 sm:col-span-4 sm:col-start-9 sm:row-start-3"
        style={{ ['--lp-delay' as never]: '0.6s', ['--lp-rot' as never]: '-1deg' }}
      >
        <HeroCard icon={PenLine} title="System diagram" badge="You">
          <HeroMiniDiagram />
        </HeroCard>
      </div>
    </div>
  );
}

interface HeroCardProps {
  icon: typeof FileText;
  title: string;
  badge: string;
  children: ReactNode;
}

function HeroCard({ icon: Icon, title, badge, children }: HeroCardProps) {
  return (
    <div className="relative h-full rounded-xl border border-border bg-card p-4 text-left shadow-md transition-transform">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </div>
          <p className="truncate text-xs font-semibold">{title}</p>
        </div>
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {badge}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function HeroLineTyping() {
  const txt = useTypewriter('## Goals\n- 20% lift in activation\n- < 60s to first note', 30);
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-foreground/80">
      {txt}
      <span className="lp-caret" />
    </pre>
  );
}

function HeroWaveform() {
  // 14 bars with varying delays for a believable waveform
  const bars = Array.from({ length: 14 });
  return (
    <div className="flex items-center justify-center text-primary" style={{ height: 56 }}>
      {bars.map((_, i) => (
        <span
          key={i}
          className="lp-wave-bar"
          style={{
            height: `${22 + (i % 4) * 8}px`,
            animationDelay: `${(i % 7) * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

function HeroCheckList() {
  return (
    <div className="space-y-1.5 text-[11px]">
      <CheckRow label="Add node-pg-migrate" delay={400} />
      <CheckRow label="Migration: projects table" delay={900} />
      <CheckRow label="CLI: octonote project create" delay={1400} />
    </div>
  );
}

function CheckRow({ label, delay }: { label: string; delay: number }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setChecked(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return (
    <div className="flex items-center gap-2 text-foreground/80">
      {checked ? (
        <CheckCircle2 className="size-3.5 text-primary lp-pop" />
      ) : (
        <Circle className="size-3.5 text-muted-foreground" />
      )}
      <span className={checked ? 'line-through opacity-60' : ''}>{label}</span>
    </div>
  );
}

function HeroMiniDiagram() {
  const ref = useInViewClass<SVGSVGElement>();
  return (
    <svg
      ref={ref}
      viewBox="0 0 240 110"
      className="lp-draw h-[80px] w-full text-foreground"
    >
      <rect
        x="10"
        y="40"
        width="60"
        height="32"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="95"
        y="10"
        width="60"
        height="32"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="95"
        y="70"
        width="60"
        height="32"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="180"
        y="40"
        width="48"
        height="32"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="70"
        y1="56"
        x2="95"
        y2="26"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="70"
        y1="56"
        x2="95"
        y2="86"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="155"
        y1="26"
        x2="180"
        y2="56"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="155"
        y1="86"
        x2="180"
        y2="56"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FeatureSection
// ─────────────────────────────────────────────────────────────────────

interface FeatureSectionProps {
  icon: typeof FileText;
  eyebrow: string;
  title: string;
  tagline: string;
  human: { heading: string; body: string };
  agent: { heading: string; body: string };
  visual: ReactNode;
  reverse?: boolean;
}

function FeatureSection({
  icon: Icon,
  eyebrow,
  title,
  tagline,
  human,
  agent,
  visual,
  reverse,
}: FeatureSectionProps) {
  const ref = useInViewClass<HTMLDivElement>();
  return (
    <section className="border-t border-border">
      <div
        ref={ref}
        className="lp-enter mx-auto max-w-6xl px-6 py-24"
      >
        <div
          className={`grid items-center gap-12 lg:grid-cols-2 ${
            reverse ? 'lg:[&>*:first-child]:order-2' : ''
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              <Icon className="size-3.5" /> {eyebrow}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-muted-foreground">{tagline}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Pillar icon={User} heading={human.heading} body={human.body} />
              <Pillar icon={Bot} heading={agent.heading} body={agent.body} />
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 -z-10 rounded-2xl lp-shimmer-bg opacity-60"
            />
            <div className="rounded-xl border border-border bg-card p-2 shadow-md">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-background">
                {visual}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pillar({
  icon: Icon,
  heading,
  body,
}: {
  icon: typeof FileText;
  heading: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
        <Icon className="size-3.5" /> {heading}
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Animated feature mocks (one per section)
// ─────────────────────────────────────────────────────────────────────

function NoteMockAnimated() {
  const ref = useInViewClass<HTMLDivElement>();
  return (
    <div ref={ref} className="lp-enter h-full w-full p-5 text-left">
      <p className="text-xs text-muted-foreground">Notes / Project Plan</p>
      <h4 className="mt-1 text-base font-semibold">Project Plan</h4>
      <NoteTypingBody />
    </div>
  );
}

function NoteTypingBody() {
  const body = useTypewriter(
    '## Overview\nWe are rebuilding the onboarding flow this quarter. See [[Q2 Roadmap]] for context.\n\n## Goals\n- 20% lift in activation\n- < 60s to first note',
    25,
    400,
  );
  // colour the [[wikilink]] when it has fully appeared
  const linkOpen = body.indexOf('[[');
  const linkClose = body.indexOf(']]', linkOpen + 2);
  if (linkOpen >= 0 && linkClose > linkOpen) {
    const before = body.slice(0, linkOpen);
    const link = body.slice(linkOpen, linkClose + 2);
    const after = body.slice(linkClose + 2);
    return (
      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/80">
        {before}
        <span className="font-medium text-primary">{link}</span>
        {after}
        <span className="lp-caret text-foreground" />
      </pre>
    );
  }
  return (
    <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/80">
      {body}
      <span className="lp-caret text-foreground" />
    </pre>
  );
}

function PlanMockAnimated() {
  const ref = useInViewClass<HTMLDivElement>();
  const body = useTypewriter(
    '# First-class Projects\n\n## Context\nNotes are flat today. Goal: make Project a first-class entity.\n\n## Plan\n1. Add node-pg-migrate\n2. Migration: projects table\n3. CLI: octonote project create',
    20,
    400,
  );
  const [savedBadge, setSavedBadge] = useState(false);
  useEffect(() => {
    if (body.length >= 200) setSavedBadge(true);
  }, [body]);
  return (
    <div ref={ref} className="lp-enter h-full w-full p-5 text-left font-mono text-xs">
      <pre className="whitespace-pre-wrap break-words text-foreground/85">
        {body}
        <span className="lp-caret" />
      </pre>
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary transition-opacity ${
            savedBadge ? 'opacity-100 lp-pop' : 'opacity-0'
          }`}
        >
          <Bot className="size-3" /> Saved by claude-code
        </span>
      </div>
    </div>
  );
}

function MeetingMockAnimated() {
  const ref = useInViewClass<HTMLDivElement>();
  const [seconds, setSeconds] = useState(0);
  const [items, setItems] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s + 1) % 60), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const seq = [
      [1200, 1],
      [2200, 2],
      [3200, 3],
    ] as const;
    const ids = seq.map(([d, n]) => setTimeout(() => setItems(n), d));
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <div ref={ref} className="lp-enter h-full w-full p-5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Meeting — May 16, 9:30 AM
          </p>
          <h4 className="mt-1 text-base font-semibold">Q2 planning sync</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/80" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
          <span className="font-mono text-xs text-foreground/80">
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center rounded-md border border-border bg-background py-3 text-primary">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="lp-wave-bar"
            style={{
              height: `${14 + (i % 5) * 6}px`,
              animationDelay: `${(i % 9) * 0.08}s`,
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Action items
      </p>
      <div className="mt-2 space-y-1.5 text-sm">
        {items >= 1 && (
          <div className="flex items-center gap-2 lp-pop">
            <Circle className="size-3.5 text-muted-foreground" />
            <span>Lock the launch date — Sunil</span>
          </div>
        )}
        {items >= 2 && (
          <div className="flex items-center gap-2 lp-pop">
            <Circle className="size-3.5 text-muted-foreground" />
            <span>Draft pricing page — Maya</span>
          </div>
        )}
        {items >= 3 && (
          <div className="flex items-center gap-2 lp-pop">
            <Circle className="size-3.5 text-muted-foreground" />
            <span>Schedule design review</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagramMockAnimated() {
  const ref = useInViewClass<SVGSVGElement>();
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <svg
        ref={ref}
        viewBox="0 0 320 200"
        className="lp-draw h-full w-full text-foreground"
      >
        <rect
          x="20"
          y="70"
          width="80"
          height="50"
          rx="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="130"
          y="20"
          width="80"
          height="50"
          rx="6"
          fill="color-mix(in oklch, var(--primary) 12%, transparent)"
          stroke="var(--primary)"
          strokeWidth="1.5"
        />
        <rect
          x="130"
          y="130"
          width="80"
          height="50"
          rx="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="240"
          y="70"
          width="60"
          height="50"
          rx="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1="100"
          y1="85"
          x2="130"
          y2="45"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1="100"
          y1="105"
          x2="130"
          y2="155"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1="210"
          y1="45"
          x2="240"
          y2="85"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1="210"
          y1="155"
          x2="240"
          y2="105"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <text
          x="60"
          y="100"
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          fontFamily="ui-sans-serif"
        >
          User
        </text>
        <text
          x="170"
          y="50"
          textAnchor="middle"
          fontSize="11"
          fill="var(--primary)"
          fontFamily="ui-sans-serif"
          fontWeight="600"
        >
          OctoNote
        </text>
        <text
          x="170"
          y="160"
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          fontFamily="ui-sans-serif"
        >
          Agent
        </text>
        <text
          x="270"
          y="100"
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          fontFamily="ui-sans-serif"
        >
          Vault
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Waitlist
// ─────────────────────────────────────────────────────────────────────

function Waitlist() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `request failed: ${res.status}`);
      }
      setPhase('done');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  return (
    <section id="waitlist" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3" /> Closed beta — joining now
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Get on the waitlist.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We're rolling access out in waves. Drop your email and we'll reach
          out when your vault is ready.
        </p>

        {phase === 'done' ? (
          <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground lp-pop">
            <CheckCircle2 className="size-4 text-primary" />
            You're on the list — we'll be in touch.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row"
          >
            <Input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 flex-1"
              disabled={phase === 'submitting'}
            />
            <Button
              type="submit"
              size="lg"
              disabled={phase === 'submitting' || !email.trim()}
            >
              {phase === 'submitting' ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Join waitlist <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Final CTA + Footer
// ─────────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <div className="rounded-2xl border border-border bg-card p-10">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Want to try the app right now?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          The CLI + early web app is live. Open it directly — no sign-up
          needed during preview.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/">
              Open OctoNote <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a
              href="https://github.com/CoderCouple/octonote"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="size-4" /> View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} OctoNote</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/CoderCouple/octonote"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="size-4" /> GitHub
          </a>
          <a href="#waitlist" className="transition-colors hover:text-foreground">
            Waitlist
          </a>
          <Link to="/" className="transition-colors hover:text-foreground">
            Open app
          </Link>
        </div>
      </div>
    </footer>
  );
}
