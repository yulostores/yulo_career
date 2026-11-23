// One careers policy page (content/policies.js): Terms & Conditions, Privacy Policy, or
// Cancellation & Refund.

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import SiteFooter from "@/components/SiteFooter";
import { POLICIES } from "@/content/policies";
import { BUSINESS } from "@/content/business";

export default function Policy({ which }) {
  const policy = POLICIES[which];
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand-red text-white">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to jobs
          </Link>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{policy.title}</h1>
          <p className="mt-2 text-sm text-white/80">Last updated {policy.updated}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-lg leading-relaxed text-brand-dark">{policy.intro}</p>
        {policy.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="font-display text-xl font-bold text-brand-dark">{section.heading}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-[#5a4a3d]">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-10 border-t border-[#f0dccb] pt-6 text-[15px] text-[#5a4a3d]">
          {BUSINESS.legalName} · Questions:{" "}
          <a href={`mailto:${BUSINESS.supportEmail}`} className="font-semibold text-brand-red hover:underline">
            {BUSINESS.supportEmail}
          </a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
