import Link from "next/link";
import { HiClock, HiEye, HiOutlinePlus } from "react-icons/hi";
import { HiShieldCheck } from "react-icons/hi2";
import { PiFingerprintDuotone } from "react-icons/pi";

export default function HomePage() {
  return (
    <section className="min-h-[70vh]">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Biometric Auth
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Secure sign-in with face recognition and liveness protection.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sign in */}
        <div
  className="
    rounded-2xl border border-white/20
    bg-gradient-to-br from-white/90 to-white/70
    backdrop-blur-xl shadow-xl
    p-6 md:p-7
  "
>
  {/* heading */}
  <div className="relative inline-block">
    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
      Sign in
    </h2>
    <span className="absolute bottom-0 left-0 h-1 w-14 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500" />
  </div>

  <p className="mt-2 text-sm text-foreground/70">
    Use your face to sign in securely. Fast, password-free, and protected with liveness checks.
  </p>

  <div className="mt-5">
    {/* Face only */}
    <Link
      href="/auth/pin"
      className="
        group inline-flex w-full items-center justify-between
        rounded-xl border border-transparent
        bg-gradient-to-r from-rose-500 to-indigo-500
        px-4 py-3 text-sm font-semibold text-white
        shadow-md transition
        hover:brightness-105 hover:shadow-lg
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-offset-2 focus-visible:ring-rose-400
        active:scale-[0.98]
      "
      aria-label="Continue with Face"
    >
      <div className="flex items-center gap-3">
        <FaceIcon className="h-5 w-5 opacity-95" />
        <div className="text-left">
          <div>Continue with Face</div>
          <div className="text-xs text-white/80">Fastest · Liveness protected</div>
        </div>
      </div>
      <ArrowRightIcon className="h-4 w-4 opacity-90 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  </div>
</div>


        {/* New here */}
        {/* New here card */}
       <aside
  aria-labelledby="newhere-title"
  className="
    relative overflow-hidden
    rounded-2xl border border-white/20
    bg-gradient-to-br from-white/90 to-white/70
    backdrop-blur-xl shadow-xl
    p-6 md:p-7
  "
>
  {/* soft accent bloom */}
  <div className="pointer-events-none absolute right-[-2.5rem] top-[-2.5rem] h-36 w-36 rounded-full bg-primary/15 blur-3xl" />

  {/* heading + underline accent */}
  <div className="relative inline-block">
    <h2
      id="newhere-title"
      className="text-xl font-bold text-foreground flex items-center gap-2"
    >
      <SparkleIcon className="h-10 w-10 text-secondary motion-safe:animate-pulse" />
      New here?
    </h2>
    <span className="absolute bottom-0 left-0 h-1 w-20 rounded-full bg-gradient-to-r from-rose-500 to-indigo-500" />
  </div>

  <p className="mt-2 text-sm text-foreground/70">
    Enroll once, then sign in with your face — no passwords.
  </p>

  {/* highlight pills */}
  <div className="mt-4 flex flex-wrap gap-2">
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700">
      <HiClock className="h-3.5 w-3.5" aria-hidden />
      <span>≈ 1 min</span>
    </span>
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
      <HiEye className="h-3.5 w-3.5" aria-hidden />
      <span>Liveness</span>
    </span>
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
      <HiShieldCheck className="h-3.5 w-3.5" aria-hidden />
      <span>Privacy-first</span>
    </span>
  </div>

  {/* clear, scannable steps */}
  <ul className="mt-5 space-y-3 text-sm">
    <li className="flex items-start gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
        <CheckIcon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-medium text-foreground">Review & consent</div>
        <div className="text-foreground/70">
          Read the data use policy and agree to proceed.
        </div>
      </div>
    </li>

    <li className="flex items-start gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
        <CheckIcon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-medium text-foreground">Capture your face</div>
        <div className="text-foreground/70">
          We’ll guide you — good lighting, face centered, no mask.
        </div>
      </div>
    </li>

    <li className="flex items-start gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
        <CheckIcon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-medium text-foreground">Quick liveness check</div>
        <div className="text-foreground/70">
          Blink and turn your head — about 5 seconds.
        </div>
      </div>
    </li>
  </ul>

  {/* primary CTA */}
  <Link
    href="/consent"
    className="
      mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3
      text-sm font-semibold text-white
      bg-gradient-to-r from-rose-500 to-indigo-500
      shadow-lg ring-0 transition
      hover:brightness-105 hover:shadow-xl
      active:scale-[0.98]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-rose-400 focus-visible:ring-offset-white/70
    "
    aria-label="Enroll Face ID"
  >
    <PiFingerprintDuotone className="h-5 w-5" aria-hidden />
    Enroll Face ID
  </Link>

  {/* small legal */}
  <p className="mt-3 text-xs text-foreground/60">
    We only proceed after consent. You can delete your enrollment anytime in
    Settings.
  </p>
</aside>

      </div>
    </section>
  );
}

/* ---------- inline icons ---------- */
function FaceIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"
      />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="11" r="1" fill="currentColor" />
      <circle cx="14" cy="11" r="1" fill="currentColor" />
      <path
        d="M10 15c.6.4 1.4.6 2 .6s1.4-.2 2-.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 12h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle
        cx="8.5"
        cy="8.5"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13 9h8v3h-2l-1 1h-2l-1 1h-2v-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 6h16v10H7l-3 3V6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="13" cy="11" r="1" fill="currentColor" />
      <circle cx="17" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M20 7L10 17l-6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3l1.5 3.8L17 8.5l-3.5 1.7L12 14l-1.5-3.8L7 8.5l3.5-1.7L12 3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M19 12l.9 2.2L22 15l-2.1 1.1L19 18l-.9-1.9L16 15l2.1-.8L19 12Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
