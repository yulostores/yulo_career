import { BUSINESS } from "@/content/business";

const POLICIES = [
  { path: "/terms", label: "Terms & Conditions" },
  { path: "/privacy", label: "Privacy Policy" },
  { path: "/refund-policy", label: "Cancellation & Refund" },
  { path: "/contact", label: "Contact Us" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-cream/70 bg-white px-4 py-6 text-xs text-muted-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {POLICIES.map((p) => (
            <a
              key={p.path}
              href={`${BUSINESS.website}${p.path}`}
              className="font-semibold text-[#5a403e] hover:text-brand-orange"
            >
              {p.label}
            </a>
          ))}
        </nav>
        <p className="mt-4">
          Questions about your application?{" "}
          <a href={`mailto:${BUSINESS.supportEmail}`} className="font-medium hover:text-brand-orange">
            {BUSINESS.supportEmail}
          </a>
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} {BUSINESS.legalName}
        </p>
      </div>
    </footer>
  );
}
