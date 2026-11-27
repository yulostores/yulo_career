// Pieces the two careers forms share: the job application (screens/Apply.jsx) and
// "Choose your business" (screens/Business.jsx).

import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export const digitsOnly = (v) => v.replace(/\D/g, "");
export const tenDigits = (v) => {
  let d = digitsOnly(v);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
};
export const isMobile = (v) => /^[6-9]\d{9}$/.test(tenDigits(v));
export const formatRupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;


// ── Small building blocks ─────────────────────────────────────────────────────

export function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cream/60 text-brand-red">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({ id, label, required, optional, error, hint, className, children }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-[#3d2c22]">
        {label}
        {required ? <span className="text-brand-red"> *</span> : null}
        {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-xs font-medium text-brand-maroon">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass = (error) =>
  cn(
    "h-11 w-full rounded-xl border bg-white px-3 text-[15px] text-foreground outline-none transition placeholder:text-[#b9a597]",
    "focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 disabled:bg-brand-page disabled:text-muted-foreground",
    error ? "border-brand-maroon" : "border-[#e8d3c3]",
  );

// ── "Pay to confirm your registration" popup ───────────────────────────────────

export function ConfirmPayDialog({ name, role, fee, simulated, busy, onPay, onLater, team = "our hiring team", feeLabel = "application fee" }) {
  const payRef = useRef(null);
  useEffect(() => {
    payRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onLater]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={() => !busy && onLater()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-pay-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-orange" aria-hidden />
          <div>
            <h2 id="confirm-pay-title" className="text-lg font-bold">Confirm your registration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {name ? `${name}, your` : "Your"} application{role ? ` for ${role}` : ""} is saved. Pay the {fee}{" "}
              {feeLabel} to confirm your registration — it reaches {team} as soon as it&rsquo;s paid.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-[#fff6ef] px-4 py-3">
          <span className="text-sm font-semibold text-[#3d2c22] first-letter:uppercase">{feeLabel}</span>
          <span className="text-xl font-extrabold text-brand-red">{fee}</span>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={payRef}
            type="button"
            onClick={onPay}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-gradient text-[15px] font-bold text-white disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            {simulated ? "Simulate payment (local only)" : `Pay ${fee} & confirm`}
          </button>
          <button
            type="button"
            onClick={onLater}
            disabled={busy}
            className="h-11 rounded-xl border border-[#e8d3c3] text-sm font-semibold text-[#5a403e] disabled:opacity-60"
          >
            Pay later
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Payments are secured by Razorpay.</p>
      </div>
    </div>
  );
}
