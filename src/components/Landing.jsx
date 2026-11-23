// The careers landing around the application form: the hero, the role wall (pick your job
// first — tapping a tile or a role fills the form's Position/Role and jumps to it), the three
// steps of applying, and a short FAQ. Every fact here comes from the application rules
// (server/config/careers.config.js) — nothing is promised that the form doesn't do.

import {
  Bike,
  Briefcase,
  ChefHat,
  Code2,
  GraduationCap,
  Handshake,
  Headphones,
  Megaphone,
  Palette,
  Scissors,
  Smartphone,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = {
  marketing: Megaphone,
  social_media: Smartphone,
  designing: Palette,
  sales: Handshake,
  operations: Headphones,
  business_development: Briefcase,
  developer: Code2,
  delivery: Bike,
  restaurant: ChefHat,
  salon: Scissors,
  other: GraduationCap,
};

// What the work is, in a line, for people who know the job by its daily work rather than
// its title. Departments not listed just show their roles.
const BLURBS = {
  delivery: "Ride with Yulo and deliver orders in your area.",
  restaurant: "Cook, serve and help in restaurant kitchens and floors.",
  salon: "Hair, grooming and makeup for salon customers.",
  sales: "Meet shops and restaurants and bring them to Yulo.",
  operations: "Talk to customers and partners on call and chat.",
  other: "No experience yet? Freshers and students can apply.",
  developer: "Build the apps our customers, partners and riders use.",
  designing: "Posters, reels, edits and app screens.",
  social_media: "Run our pages, shoot content, grow the audience.",
  marketing: "Campaigns and relationships that bring people to Yulo.",
  business_development: "Open new cities and partnerships.",
};

// Tile tones cycle so neighbouring departments never look alike.
const TONES = [
  "bg-brand-red text-white",
  "bg-white text-brand-dark ring-1 ring-[#f0dccb]",
  "bg-brand-saffron text-brand-dark",
  "bg-brand-dark text-white",
];
const ROLE_PILL = {
  "bg-brand-red text-white": "bg-white/15 text-white hover:bg-white/25",
  "bg-white text-brand-dark ring-1 ring-[#f0dccb]": "bg-[#fff3ea] text-brand-dark hover:bg-[#ffe4d1]",
  "bg-brand-saffron text-brand-dark": "bg-white/55 text-brand-dark hover:bg-white/80",
  "bg-brand-dark text-white": "bg-white/10 text-white hover:bg-white/20",
};

export function Hero({ onStart, fee }) {
  return (
    <header className="relative overflow-hidden bg-brand-red text-white">
      {/* The brand's diagonal, cut across the block — the one decorative move on the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-0 h-full w-[60%] -skew-x-12 bg-brand-orange/70"
      />
      <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        <a href="/" className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-extrabold text-brand-red">Y</span>
          Yulo Stores
        </a>
        <h1 className="mt-10 max-w-3xl font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          Find your next job with Yulo.
        </h1>
        <p lang="hi" className="mt-3 font-display text-2xl font-medium text-white/85 sm:text-3xl">
          अपनी अगली नौकरी Yulo के साथ।
        </p>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">
          Delivery, kitchens, salons, sales, design, tech — and roles for freshers and students. Pick your job,
          fill one short form, and our hiring team calls you.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="h-12 rounded-full bg-white px-7 font-display text-base font-bold text-brand-red shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] transition hover:bg-[#fff3ea] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            Choose your job
          </button>
          <span className="text-sm text-white/85">Takes about 5 minutes · {fee} application fee</span>
        </div>
      </div>
    </header>
  );
}

// The jobs most people apply for lead the wall; the rest follow in the server's order.
const FIRST = ["delivery", "restaurant", "salon", "sales", "operations", "other"];
const byReach = (a, b) => {
  const ia = FIRST.indexOf(a.key);
  const ib = FIRST.indexOf(b.key);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

export function RoleWall({ departments, selected, onPick }) {
  const ordered = [...departments].sort(byReach);
  return (
    <section id="jobs" aria-labelledby="jobs-title" className="scroll-mt-4">
      <h2 id="jobs-title" className="font-display text-3xl font-extrabold tracking-tight text-brand-dark sm:text-4xl">
        Which job is yours?
      </h2>
      <p className="mt-2 max-w-xl text-[17px] text-[#6b5747]">
        Tap a team, or tap the exact role. We&rsquo;ll fill it into the form for you.
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((d, i) => {
          const Icon = ICONS[d.key] ?? Briefcase;
          const tone = TONES[i % TONES.length];
          const isSelected = selected === d.key;
          return (
            <li key={d.key} className={cn(d.roles.length >= 4 && "lg:row-span-1")}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-3xl p-5 transition",
                  tone,
                  isSelected && "ring-4 ring-brand-orange ring-offset-2 ring-offset-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => onPick(d.key)}
                  className="group flex items-start gap-3 text-left focus:outline-none focus-visible:underline"
                  aria-label={`Apply in ${d.label}`}
                >
                  <Icon className="mt-1 h-7 w-7 shrink-0" strokeWidth={1.8} aria-hidden />
                  <span>
                    <span className="block font-display text-2xl font-bold leading-tight group-hover:underline">
                      {d.label}
                    </span>
                    {BLURBS[d.key] ? <span className="mt-1 block text-[15px] leading-snug opacity-85">{BLURBS[d.key]}</span> : null}
                  </span>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.roles.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => onPick(d.key, r.key)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                        ROLE_PILL[tone],
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// A real sequence, so it is numbered.
export function Steps({ fee }) {
  const steps = [
    { title: "Fill the form", body: "Your details, the job you want and your expected salary. A résumé is optional." },
    { title: `Pay ${fee} to confirm`, body: "One payment through Razorpay confirms your registration." },
    { title: "We call you", body: "Our hiring team reviews every confirmed application and calls if it’s a fit." },
  ];
  return (
    <ol className="grid gap-6 border-y border-[#f0dccb] py-8 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span className="font-display text-4xl font-extrabold leading-none text-brand-orange">{i + 1}</span>
          <span>
            <span className="block font-display text-lg font-bold text-brand-dark">{s.title}</span>
            <span className="mt-1 block text-[15px] leading-snug text-[#6b5747]">{s.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Faq({ fee, minAge = 16, maxAge = 70 }) {
  const items = [
    {
      q: "Who can apply?",
      a: `Anyone aged ${minAge} to ${maxAge}. Freshers and students are welcome — pick “Other” on the job list.`,
    },
    { q: "Do I need a résumé?", a: "No. You can attach one as a PDF if you have it, up to 5 MB." },
    {
      q: `Why is there a ${fee} fee?`,
      a: "It confirms your registration, so our hiring team spends its time on people who really want the job.",
    },
    {
      q: "What happens if I don’t pay right away?",
      a: "Your application is saved, but it reaches the hiring team only once the fee is paid. In the same browser tab, tap “Pay to confirm” — you won’t fill the form again.",
    },
  ];
  return (
    <section aria-labelledby="faq-title" className="mt-14">
      <h2 id="faq-title" className="font-display text-2xl font-extrabold tracking-tight text-brand-dark">
        Questions people ask
      </h2>
      <div className="mt-4 divide-y divide-[#f0dccb] border-y border-[#f0dccb]">
        {items.map((it) => (
          <details key={it.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-brand-dark focus:outline-none focus-visible:underline">
              {it.q}
              <span aria-hidden className="text-2xl font-medium text-brand-orange transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-[#6b5747]">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
