// "Choose your business": a shop applying to become a Yulo coupon partner — the businesses whose
// coupons Yulo customers get. Business details, owner contact, any questions, then the ₹100 form
// fee — the same save-then-pay flow as the job application (screens/Apply.jsx): submitting saves
// it unpaid and opens the pay popup; "Pay later" keeps it saved for this tab.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MessageCircleQuestion, ShieldCheck, Store, UserRound } from "lucide-react";

import { businessApi } from "@/api/client";
import { ConfirmPayDialog, Field, Section, digitsOnly, formatRupees, inputClass, isMobile, tenDigits } from "@/components/FormParts";
import SiteFooter from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { clearPending, readPending, savePending } from "@/lib/pending";
import { openRazorpayCheckout, RazorpayCancelledError } from "@/lib/razorpay";

const PENDING = "business";

const EMPTY = {
  businessName: "",
  category: "",
  otherCategory: "",
  address: "",
  city: "",
  hasGst: null, // true | false once chosen
  employees: "",
  ownerName: "",
  phone: "",
  alternatePhone: "",
  questions: "",
};

// The server's rules (controllers/careers.controller.js — partnerSchema), checked here first.
function validate(form) {
  const e = {};
  if (form.businessName.trim().length < 2) e.businessName = "Enter the business name";
  if (!form.category) e.category = "Choose a business category";
  if (form.category === "other" && form.otherCategory.trim().length < 2) e.otherCategory = "Tell us what kind of store it is";
  if (form.address.trim().length < 5) e.address = "Enter the address";
  if (form.city.trim().length < 2) e.city = "Enter the city";
  if (form.hasGst === null) e.hasGst = "Choose Yes or No";
  if (form.employees === "" || !/^\d+$/.test(String(form.employees))) e.employees = "Enter the number of employees";
  if (form.ownerName.trim().length < 2) e.ownerName = "Enter the owner's name";
  if (!isMobile(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
  if (form.alternatePhone.trim()) {
    if (!isMobile(form.alternatePhone)) e.alternatePhone = "Enter a valid 10-digit mobile number";
    else if (tenDigits(form.alternatePhone) === tenDigits(form.phone)) e.alternatePhone = "Use a different number";
  }
  return e;
}

export default function Business() {
  const navigate = useNavigate();
  const info = useQuery({ queryKey: ["careers", "partner-form"], queryFn: businessApi.form });
  const categories = info.data?.categories ?? [];
  const fee = info.data?.feeRupees ?? 100;

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null); // null | "saving" | "paying" | "verifying"
  const [formError, setFormError] = useState(null);
  const [unpaid, setUnpaid] = useState(null); // { id, token, name, business, phone }
  const [simulated, setSimulated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [freshOrder, setFreshOrder] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const pending = readPending(PENDING);
    if (!pending) return;
    businessApi
      .get(pending.id, pending.token)
      .then((app) => {
        if (app.paid) {
          clearPending(PENDING);
          navigate("/business/submitted", { replace: true, state: { application: app } });
        } else {
          setUnpaid({ ...pending, name: app.ownerName, business: app.businessName });
        }
      })
      .catch(() => clearPending(PENDING));
  }, [navigate]);

  const setValue = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };
  const set = (key) => (e) => setValue(key, e.target.value);

  async function pay({ id, token, razorpayOrder, name, business, phone }) {
    if (!razorpayOrder) {
      setSimulated(true);
      setUnpaid({ id, token, name, business, phone });
      setBusy(null);
      return;
    }
    setBusy("paying");
    try {
      const response = await openRazorpayCheckout(razorpayOrder, {
        name: "Yulo Stores",
        description: `Business application fee — ${business}`,
        prefill: { name, contact: phone },
      });
      setBusy("verifying");
      const application = await businessApi.verify(id, token, response);
      clearPending(PENDING);
      navigate("/business/submitted", { state: { application } });
    } catch (err) {
      setUnpaid({ id, token, name, business, phone });
      if (err instanceof RazorpayCancelledError) {
        setFormError(err.failureReason ? `Payment failed: ${err.failureReason}. Your details are saved — you can try paying again.` : null);
      } else {
        if (err.code === "ALREADY_PAID") clearPending(PENDING);
        setFormError(err.message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    const body = {
      businessName: form.businessName.trim(),
      category: form.category,
      ...(form.category === "other" ? { otherCategory: form.otherCategory.trim() } : {}),
      address: form.address.trim(),
      city: form.city.trim(),
      hasGst: form.hasGst,
      employees: Number(form.employees),
      ownerName: form.ownerName.trim(),
      phone: tenDigits(form.phone),
      ...(form.alternatePhone.trim() ? { alternatePhone: tenDigits(form.alternatePhone) } : {}),
      ...(form.questions.trim() ? { questions: form.questions.trim() } : {}),
    };

    setBusy("saving");
    let created;
    try {
      created = await businessApi.apply(body);
    } catch (err) {
      setBusy(null);
      if (err.fieldErrors) {
        const mapped = Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v?.[0]]));
        setErrors(mapped);
        const first = Object.keys(mapped)[0];
        if (first) document.getElementById(first)?.focus();
      }
      setFormError(err.message);
      return;
    }
    const { application, accessToken, razorpayOrder } = created;
    savePending({ id: application.id, token: accessToken }, PENDING);
    setUnpaid({ id: application.id, token: accessToken, name: application.ownerName, business: application.businessName, phone: body.phone });
    setSimulated(!razorpayOrder);
    setFreshOrder(razorpayOrder ?? null);
    setBusy(null);
    setConfirmOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmAndPay() {
    if (!unpaid || busy) return;
    setFormError(null);
    setConfirmOpen(false);
    if (simulated) {
      setBusy("verifying");
      try {
        const application = await businessApi.simulate(unpaid.id, unpaid.token);
        clearPending(PENDING);
        navigate("/business/submitted", { state: { application } });
      } catch (err) {
        setFormError(err.message);
        setBusy(null);
      }
      return;
    }
    const order = freshOrder;
    setFreshOrder(null);
    if (order) {
      await pay({ ...unpaid, razorpayOrder: order });
      return;
    }
    setBusy("paying");
    try {
      const { razorpayOrder } = await businessApi.pay(unpaid.id, unpaid.token);
      await pay({ ...unpaid, razorpayOrder });
    } catch (err) {
      setBusy(null);
      if (err.code === "ALREADY_PAID") {
        const app = await businessApi.get(unpaid.id, unpaid.token).catch(() => null);
        clearPending(PENDING);
        if (app) navigate("/business/submitted", { state: { application: app } });
        return;
      }
      setFormError(err.message);
    }
  }

  function startOver() {
    clearPending(PENDING);
    setUnpaid(null);
    setSimulated(false);
    setFormError(null);
  }

  const submitLabel =
    busy === "saving" ? "Saving your details…" : busy === "paying" ? "Opening payment…" : busy === "verifying" ? "Confirming payment…" : "Submit application";

  const choice = (on) =>
    cn(
      "h-11 rounded-xl border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40",
      on ? "border-brand-red bg-brand-red text-white" : "border-[#e8d3c3] bg-white text-[#3d2c22] hover:border-brand-orange",
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden bg-brand-dark text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-full w-[55%] -skew-x-12 bg-brand-red/80" />
        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Yulo Stores careers
          </Link>
          <h1 className="mt-8 max-w-3xl font-display text-[2.4rem] font-extrabold leading-[1.04] tracking-tight sm:text-5xl">
            Bring your business to Yulo.
          </h1>
          <p lang="hi" className="mt-3 font-display text-xl font-medium text-white/85 sm:text-2xl">
            अपने बिज़नेस को Yulo से जोड़ें।
          </p>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">
            Salons, grocery and clothes stores: become a Yulo partner and your coupons reach people ordering food
            near you. Fill in this form and our partnerships team will call you.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        {info.isError ? (
          <div className="rounded-2xl border border-brand-cream bg-white p-6 text-center shadow-sm">
            <p className="font-semibold">We couldn&rsquo;t load the form.</p>
            <p className="mt-1 text-sm text-muted-foreground">{info.error.message}</p>
            <button type="button" onClick={() => info.refetch()} className="mt-4 rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white">
              Try again
            </button>
          </div>
        ) : !info.data ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand-cream bg-white p-10 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the form…
          </div>
        ) : unpaid ? (
          <div className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-brand-orange" aria-hidden />
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Registration not confirmed yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {unpaid.name ? `${unpaid.name}, the` : "The"} application for{" "}
                  <span className="font-semibold text-foreground">{unpaid.business}</span> is saved. It reaches our
                  partnerships team once the {formatRupees(fee)} form fee is paid.
                </p>
              </div>
            </div>
            {formError ? (
              <p role="alert" className="mt-4 rounded-xl bg-[#fdecec] px-3 py-2 text-sm text-brand-maroon">
                {formError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!!busy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-red px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {busy ? submitLabel : `Pay ${formatRupees(fee)} to confirm`}
              </button>
              <button
                type="button"
                onClick={startOver}
                disabled={!!busy}
                className="h-11 rounded-xl border border-[#e8d3c3] px-5 text-sm font-semibold text-[#5a403e] disabled:opacity-60"
              >
                Start a new application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Section icon={Store} title="Business details">
              <Field id="businessName" label="Business name" required error={errors.businessName} className="sm:col-span-2">
                <input id="businessName" value={form.businessName} onChange={set("businessName")} maxLength={120} className={inputClass(errors.businessName)} />
              </Field>
              <Field id="category" label="Business category" required error={errors.category} className="sm:col-span-2">
                <div id="category" tabIndex={-1} className="flex flex-wrap gap-2 outline-none" role="radiogroup" aria-label="Business category">
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      role="radio"
                      aria-checked={form.category === c.key}
                      onClick={() => setValue("category", c.key)}
                      className={choice(form.category === c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>
              {form.category === "other" ? (
                <Field id="otherCategory" label="What kind of store is it?" required error={errors.otherCategory} className="sm:col-span-2">
                  <input
                    id="otherCategory"
                    autoFocus
                    placeholder="e.g. Mobile shop, Gym, Bakery"
                    value={form.otherCategory}
                    onChange={set("otherCategory")}
                    maxLength={80}
                    className={inputClass(errors.otherCategory)}
                  />
                </Field>
              ) : null}
              <Field id="address" label="Address" required error={errors.address} className="sm:col-span-2">
                <textarea
                  id="address"
                  rows={2}
                  maxLength={300}
                  placeholder="Shop number, street, area"
                  value={form.address}
                  onChange={set("address")}
                  className={cn(inputClass(errors.address), "h-auto py-2.5")}
                />
              </Field>
              <Field id="city" label="City" required error={errors.city}>
                <input id="city" value={form.city} onChange={set("city")} maxLength={80} className={inputClass(errors.city)} />
              </Field>
              <Field id="employees" label="Number of employees" required error={errors.employees}>
                <input
                  id="employees"
                  inputMode="numeric"
                  placeholder="e.g. 5"
                  value={form.employees}
                  onChange={(e) => setValue("employees", digitsOnly(e.target.value).slice(0, 6))}
                  className={inputClass(errors.employees)}
                />
              </Field>
              <Field id="hasGst" label="Do you have a GST number?" required error={errors.hasGst} className="sm:col-span-2">
                <div id="hasGst" tabIndex={-1} className="flex gap-2 outline-none" role="radiogroup" aria-label="Do you have a GST number?">
                  {[
                    [true, "Yes"],
                    [false, "No"],
                  ].map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={form.hasGst === value}
                      onClick={() => setValue("hasGst", value)}
                      className={cn(choice(form.hasGst === value), "w-24")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section icon={UserRound} title="Owner details">
              <Field id="ownerName" label="Owner name" required error={errors.ownerName} className="sm:col-span-2">
                <input id="ownerName" value={form.ownerName} onChange={set("ownerName")} maxLength={100} className={inputClass(errors.ownerName)} />
              </Field>
              <Field id="phone" label="Owner contact number" required error={errors.phone}>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={set("phone")}
                  className={inputClass(errors.phone)}
                />
              </Field>
              <Field id="alternatePhone" label="Alternate contact number" optional error={errors.alternatePhone}>
                <input
                  id="alternatePhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="10-digit mobile number"
                  value={form.alternatePhone}
                  onChange={set("alternatePhone")}
                  className={inputClass(errors.alternatePhone)}
                />
              </Field>
            </Section>

            <Section icon={MessageCircleQuestion} title="Do you have any questions on your mind?">
              <Field id="questions" label="Your questions" optional className="sm:col-span-2" hint={`${form.questions.length}/1000`}>
                <textarea
                  id="questions"
                  rows={4}
                  maxLength={1000}
                  placeholder="Ask us anything about partnering with Yulo — we'll answer when we call."
                  value={form.questions}
                  onChange={set("questions")}
                  className={cn(inputClass(false), "h-auto py-2.5")}
                />
              </Field>
            </Section>

            <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm sm:p-6">
              {formError ? (
                <p role="alert" className="mb-4 rounded-xl bg-[#fdecec] px-3 py-2 text-sm text-brand-maroon">
                  {formError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={!!busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-[15px] font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                {submitLabel}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Your details are only shared with the Yulo Stores partnerships team.
              </p>
            </section>
          </form>
        )}
      </main>

      {confirmOpen && unpaid ? (
        <ConfirmPayDialog
          name={unpaid.name}
          role={unpaid.business}
          fee={formatRupees(fee)}
          simulated={simulated}
          busy={!!busy}
          onPay={confirmAndPay}
          onLater={() => setConfirmOpen(false)}
          team="our partnerships team"
          feeLabel="form fee"
        />
      ) : null}

      <SiteFooter />
    </div>
  );
}

export function BusinessSubmitted({ application }) {
  return (
    <>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f4e8]">
        <CheckCircle2 className="h-9 w-9 text-brand-green" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold">Application submitted</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Thank you, {application.ownerName}. The application for{" "}
        <span className="font-semibold text-foreground">{application.businessName}</span> has reached our partnerships
        team. We&rsquo;ll call you soon.
      </p>
    </>
  );
}
