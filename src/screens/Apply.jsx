// The careers application form. One page: personal details, position and role, salary, the
// optional section (joining date, education, experience, PDF resume), then "Submit application".
//
// Submitting saves the application on the server (unpaid) and opens a "Confirm your registration"
// popup: paying the ₹100 fee there (Razorpay) is what confirms it. "Pay later", or closing the
// payment sheet, leaves the details saved — the banner reopens the popup to pay without filling
// the form twice (POST /applications/:id/pay).

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeIndianRupee,
  Briefcase,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { careersApi } from "@/api/client";
import { Faq, Hero, RoleWall, Steps } from "@/components/Landing";
import { ConfirmPayDialog, Field, Section, digitsOnly, formatRupees, inputClass, isMobile, tenDigits } from "@/components/FormParts";
import SiteFooter from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { ageFrom, today, yearsAgo } from "@/lib/dates";
import { clearPending, readPending, savePending } from "@/lib/pending";
import { openRazorpayCheckout, RazorpayCancelledError } from "@/lib/razorpay";

const RESUME_MAX_MB = 5;

// Most roles one application may name (server: MAX_ROLES_PER_APPLICATION).
const MAX_ROLES = 3;

const EMPTY = {
  fullName: "",
  phone: "",
  alternatePhone: "",
  dateOfBirth: "",
  gender: "",
  city: "",
  department: "",
  // Up to MAX_ROLES roles, all in the chosen position.
  roles: [],
  expectedSalaryMin: "",
  expectedSalaryMax: "",
  currentSalary: "",
  availableFrom: "",
  education: "",
  experienceYears: "",
  experience: "",
};

const GENDERS = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

// The same rules the server applies (controllers/careers.controller.js), so most mistakes are
// caught before anything is sent. The server stays the authority.
function validate(form, catalogue) {
  const e = {};
  if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
  if (!isMobile(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
  if (form.alternatePhone.trim()) {
    if (!isMobile(form.alternatePhone)) e.alternatePhone = "Enter a valid 10-digit mobile number";
    else if (tenDigits(form.alternatePhone) === tenDigits(form.phone))
      e.alternatePhone = "Use a different number from your mobile number";
  }
  const age = ageFrom(form.dateOfBirth);
  if (age === null) e.dateOfBirth = "Select your date of birth";
  else if (age < catalogue.minAge || age > catalogue.maxAge)
    e.dateOfBirth = `You must be between ${catalogue.minAge} and ${catalogue.maxAge} years old`;
  if (!form.gender) e.gender = "Select your gender";
  if (form.city.trim().length < 2) e.city = "Enter your city";
  if (!form.department) e.department = "Select a position";
  if (!form.roles?.length) e.role = "Select at least one role";
  const min = Number(form.expectedSalaryMin);
  const max = Number(form.expectedSalaryMax);
  if (form.expectedSalaryMin === "") e.expectedSalaryMin = "Enter the minimum";
  if (form.expectedSalaryMax === "") e.expectedSalaryMax = "Enter the maximum";
  else if (form.expectedSalaryMin !== "" && max < min) e.expectedSalaryMax = "Maximum must be at least the minimum";
  if (form.availableFrom && form.availableFrom < today()) e.availableFrom = "Pick today or a later date";
  return e;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Apply() {
  const navigate = useNavigate();
  const positions = useQuery({ queryKey: ["careers", "positions"], queryFn: careersApi.positions });
  const catalogue = positions.data;

  const [form, setForm] = useState(EMPTY);
  const [resume, setResume] = useState(null);
  const [resumeError, setResumeError] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null); // null | "saving" | "paying" | "verifying"
  const [formError, setFormError] = useState(null);
  // The saved-but-unpaid application ({ id, token, name, role }) — payment was not completed.
  const [unpaid, setUnpaid] = useState(null);
  const [simulated, setSimulated] = useState(false);
  // The "pay to confirm your registration" popup, and the Razorpay order made with the
  // application (used once; a later attempt asks the server for a fresh one).
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [freshOrder, setFreshOrder] = useState(null);
  const fileRef = useRef(null);

  // A reload during payment: pick the saved application back up.
  useEffect(() => {
    const pending = readPending();
    if (!pending) return;
    careersApi
      .get(pending.id, pending.token)
      .then((app) => {
        if (app.paid) {
          clearPending();
          navigate("/submitted", { replace: true, state: { application: app } });
        } else {
          setUnpaid({ ...pending, name: app.fullName, role: app.roleLabel });
        }
      })
      .catch(() => clearPending());
  }, [navigate]);

  const department = useMemo(
    () => catalogue?.departments.find((d) => d.key === form.department) ?? null,
    [catalogue, form.department],
  );
  const age = ageFrom(form.dateOfBirth);
  const fee = catalogue?.feeRupees ?? 100;

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value, ...(key === "department" ? { roles: [] } : null) }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  function pickResume(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setResumeError(null);
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setResumeError("Upload your resume as a PDF file");
      return;
    }
    if (file.size > RESUME_MAX_MB * 1024 * 1024) {
      setResumeError(`The PDF must be ${RESUME_MAX_MB} MB or smaller`);
      return;
    }
    setResume(file);
  }

  // Razorpay for a saved application; on success, the confirmation page.
  async function pay({ id, token, razorpayOrder, name, role, phone }) {
    if (!razorpayOrder) {
      // Local development with simulated payments: no gateway to open.
      setSimulated(true);
      setUnpaid({ id, token, name, role, phone });
      setBusy(null);
      return;
    }
    setBusy("paying");
    try {
      const response = await openRazorpayCheckout(razorpayOrder, {
        name: "Yulo Stores",
        description: `Job application fee — ${role}`,
        prefill: { name, contact: phone },
      });
      setBusy("verifying");
      const application = await careersApi.verify(id, token, response);
      clearPending();
      navigate("/submitted", { state: { application } });
    } catch (err) {
      setUnpaid({ id, token, name, role, phone });
      if (err instanceof RazorpayCancelledError) {
        setFormError(
          err.failureReason
            ? `Payment failed: ${err.failureReason}. Your details are saved — you can try paying again.`
            : null,
        );
      } else if (err.code === "ALREADY_PAID") {
        clearPending();
        setFormError(err.message);
      } else {
        setFormError(err.message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!catalogue || busy) return;
    setFormError(null);
    const found = validate(form, catalogue);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(first)?.focus();
      return;
    }

    const body = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (key === "roles") continue;
      const v = typeof value === "string" ? value.trim() : value;
      if (v !== "") body.append(key, v);
    }
    // Several roles go as one comma-separated field (the server splits it).
    body.append("roles", form.roles.join(","));
    if (resume) body.append("resume", resume, resume.name);

    setBusy("saving");
    let created;
    try {
      created = await careersApi.apply(body);
    } catch (err) {
      setBusy(null);
      if (err.fieldErrors) {
        const mapped = Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v?.[0]]));
        setErrors(mapped);
        const first = Object.keys(mapped)[0];
        if (first) document.getElementById(first)?.focus();
      }
      if (err.code === "INVALID_FILE_TYPE") setResumeError(err.message);
      setFormError(err.message);
      return;
    }
    const { application, accessToken, razorpayOrder } = created;
    savePending({ id: application.id, token: accessToken });
    // Saved — now the popup asks them to pay the fee to confirm the registration.
    setUnpaid({
      id: application.id,
      token: accessToken,
      name: application.fullName,
      role: application.roleLabel,
      // The number typed on this form (the server's applicant view doesn't echo it back).
      phone: tenDigits(form.phone),
    });
    setSimulated(!razorpayOrder);
    setFreshOrder(razorpayOrder ?? null);
    setBusy(null);
    setConfirmOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // "Pay ₹100" in the popup: the order made with the application if it is still unused, else a
  // fresh one (payAgain). Local development without a gateway simulates it instead.
  async function confirmAndPay() {
    if (!unpaid || busy) return;
    setFormError(null);
    if (simulated) {
      setConfirmOpen(false);
      await simulate();
      return;
    }
    const order = freshOrder;
    setFreshOrder(null);
    setConfirmOpen(false);
    if (order) await pay({ ...unpaid, razorpayOrder: order });
    else await payAgain();
  }

  async function payAgain() {
    if (!unpaid || busy) return;
    setFormError(null);
    setBusy("paying");
    try {
      const { razorpayOrder } = await careersApi.pay(unpaid.id, unpaid.token);
      await pay({ ...unpaid, razorpayOrder });
    } catch (err) {
      setBusy(null);
      if (err.code === "ALREADY_PAID") {
        const app = await careersApi.get(unpaid.id, unpaid.token).catch(() => null);
        clearPending();
        if (app) navigate("/submitted", { state: { application: app } });
        return;
      }
      setFormError(err.message);
    }
  }

  async function simulate() {
    setBusy("verifying");
    try {
      const application = await careersApi.simulate(unpaid.id, unpaid.token);
      clearPending();
      navigate("/submitted", { state: { application } });
    } catch (err) {
      setFormError(err.message);
      setBusy(null);
    }
  }

  function startOver() {
    clearPending();
    setUnpaid(null);
    setSimulated(false);
    setFormError(null);
  }

  // A tile or role on the role wall: fill Position (and Role) and go to the form.
  function pickJob(departmentKey, roleKey = "") {
    setForm((f) => ({ ...f, department: departmentKey, roles: roleKey ? [roleKey] : [] }));
    setErrors((e) => ({ ...e, department: undefined, role: undefined }));
    requestAnimationFrame(() => {
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
      document.getElementById(roleKey ? "fullName" : "role")?.focus({ preventScroll: true });
    });
  }

  const submitLabel =
    busy === "saving"
      ? "Saving your details…"
      : busy === "paying"
        ? "Opening payment…"
        : busy === "verifying"
          ? "Confirming payment…"
          : "Submit application";

  return (
    <div className="flex min-h-screen flex-col">
      <Hero onStart={() => document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" })} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        {positions.isError ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-brand-cream bg-white p-6 text-center shadow-sm">
            <p className="font-semibold">We couldn&rsquo;t load the application form.</p>
            <p className="mt-1 text-sm text-muted-foreground">{positions.error.message}</p>
            <button
              type="button"
              onClick={() => positions.refetch()}
              className="mt-4 rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : !catalogue ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand-cream bg-white p-10 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the application form…
          </div>
        ) : unpaid ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-brand-cream bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-brand-orange" aria-hidden />
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Registration not confirmed yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {unpaid.name ? `${unpaid.name}, your` : "Your"} application
                  {unpaid.role ? ` for ${unpaid.role}` : ""} is saved. It is sent to our hiring team once the{" "}
                  {formatRupees(fee)} application fee is paid.
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
          <>
          <RoleWall departments={catalogue.departments} selected={form.department} onPick={pickJob} />
          <div className="mt-12">
            <Steps />
          </div>
          {/* The form column: centred under the full-width role wall. */}
          <div className="mx-auto max-w-3xl">
          <h2 id="apply" className="mt-12 scroll-mt-4 font-display text-3xl font-extrabold tracking-tight text-brand-dark sm:text-4xl">
            Your application
          </h2>
          <p className="mb-5 mt-2 text-[17px] text-[#6b5747]">
            {department
              ? `Applying for ${
                  form.roles.length
                    ? form.roles.map((k) => department.roles.find((r) => r.key === k)?.label ?? k).join(", ")
                    : department.label
                }. Fill in the rest below.`
              : "Fill in your details — fields marked * are needed."}
          </p>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Section icon={UserRound} title="Personal details">
              <Field id="fullName" label="Full name" required error={errors.fullName} className="sm:col-span-2">
                <input
                  id="fullName"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={set("fullName")}
                  maxLength={100}
                  className={inputClass(errors.fullName)}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                />
              </Field>
              <Field id="phone" label="Mobile number" required error={errors.phone}>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={set("phone")}
                  maxLength={15}
                  className={inputClass(errors.phone)}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
              </Field>
              <Field id="alternatePhone" label="Alternate mobile number" optional error={errors.alternatePhone}>
                <input
                  id="alternatePhone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={form.alternatePhone}
                  onChange={set("alternatePhone")}
                  maxLength={15}
                  className={inputClass(errors.alternatePhone)}
                  aria-invalid={!!errors.alternatePhone}
                  aria-describedby={errors.alternatePhone ? "alternatePhone-error" : undefined}
                />
              </Field>
              <Field
                id="dateOfBirth"
                label="Date of birth"
                required
                error={errors.dateOfBirth}
                hint={age !== null && age >= 0 ? `Age: ${age} years` : undefined}
              >
                <input
                  id="dateOfBirth"
                  type="date"
                  autoComplete="bday"
                  min={yearsAgo(catalogue.maxAge + 1)}
                  max={yearsAgo(catalogue.minAge)}
                  value={form.dateOfBirth}
                  onChange={set("dateOfBirth")}
                  className={inputClass(errors.dateOfBirth)}
                  aria-invalid={!!errors.dateOfBirth}
                  aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
                />
              </Field>
              <Field id="gender" label="Gender" required error={errors.gender}>
                <div id="gender" role="radiogroup" aria-label="Gender" tabIndex={-1} className="grid grid-cols-3 gap-2">
                  {GENDERS.map((g) => (
                    <label
                      key={g.key}
                      className={cn(
                        "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition",
                        form.gender === g.key
                          ? "border-brand-orange bg-brand-orange/10 text-brand-red"
                          : errors.gender
                            ? "border-brand-maroon text-[#5a403e]"
                            : "border-[#e8d3c3] text-[#5a403e] hover:border-brand-orange/60",
                      )}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g.key}
                        checked={form.gender === g.key}
                        onChange={set("gender")}
                        className="sr-only"
                      />
                      {g.label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field id="city" label="City" required error={errors.city} className="sm:col-span-2">
                <input
                  id="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={set("city")}
                  maxLength={80}
                  className={inputClass(errors.city)}
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? "city-error" : undefined}
                />
              </Field>
            </Section>

            <Section icon={Briefcase} title="Position" hint="Pick the area you want to work in, then the role.">
              <Field id="department" label="Position" required error={errors.department}>
                <select
                  id="department"
                  value={form.department}
                  onChange={set("department")}
                  className={inputClass(errors.department)}
                  aria-invalid={!!errors.department}
                >
                  <option value="">Select a position</option>
                  {catalogue.departments.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="role"
                label={`Role — up to ${MAX_ROLES}`}
                required
                error={errors.role}
                className="sm:col-span-2"
              >
                {department ? (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Roles">
                    {department.roles.map((r, i) => {
                      const on = form.roles.includes(r.key);
                      const full = !on && form.roles.length >= MAX_ROLES;
                      return (
                        <button
                          key={r.key}
                          id={i === 0 ? "role" : undefined}
                          type="button"
                          aria-pressed={on}
                          disabled={full}
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              roles: on ? f.roles.filter((k) => k !== r.key) : [...f.roles, r.key],
                            }));
                            setErrors((e) => ({ ...e, role: undefined }));
                          }}
                          className={
                            on
                              ? "rounded-full border-2 border-brand-red bg-brand-red px-3.5 py-1.5 text-sm font-semibold text-white"
                              : "rounded-full border border-[#e4d3c4] bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-dark hover:border-brand-red disabled:opacity-40"
                          }
                        >
                          {on ? "✓ " : ""}
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p id="role" tabIndex={-1} className="text-sm text-[#6b5747]">Select a position first.</p>
                )}
                {department ? (
                  <p className="mt-2 text-xs text-[#6b5747]">
                    Pick the role you want — or up to {MAX_ROLES} if more than one suits you. One application, one fee.
                  </p>
                ) : null}
              </Field>
            </Section>

            <Section icon={BadgeIndianRupee} title="Salary" hint="Monthly, in rupees.">
              <Field id="expectedSalaryMin" label="Expected salary — from" required error={errors.expectedSalaryMin}>
                <input
                  id="expectedSalaryMin"
                  inputMode="numeric"
                  placeholder="e.g. 15000"
                  value={form.expectedSalaryMin}
                  onChange={(e) => set("expectedSalaryMin")({ target: { value: digitsOnly(e.target.value).slice(0, 7) } })}
                  className={inputClass(errors.expectedSalaryMin)}
                  aria-invalid={!!errors.expectedSalaryMin}
                />
              </Field>
              <Field id="expectedSalaryMax" label="Expected salary — to" required error={errors.expectedSalaryMax}>
                <input
                  id="expectedSalaryMax"
                  inputMode="numeric"
                  placeholder="e.g. 25000"
                  value={form.expectedSalaryMax}
                  onChange={(e) => set("expectedSalaryMax")({ target: { value: digitsOnly(e.target.value).slice(0, 7) } })}
                  className={inputClass(errors.expectedSalaryMax)}
                  aria-invalid={!!errors.expectedSalaryMax}
                />
              </Field>
              <Field
                id="currentSalary"
                label="Current salary"
                optional
                hint="Only if you are working now."
                error={errors.currentSalary}
                className="sm:col-span-2"
              >
                <input
                  id="currentSalary"
                  inputMode="numeric"
                  value={form.currentSalary}
                  onChange={(e) => set("currentSalary")({ target: { value: digitsOnly(e.target.value).slice(0, 7) } })}
                  className={cn(inputClass(errors.currentSalary), "sm:max-w-[calc(50%-0.5rem)]")}
                />
              </Field>
            </Section>

            <Section icon={FileText} title="More about you" hint="Optional, but it helps our team get back to you faster.">
              <Field id="availableFrom" label="Available joining date" optional error={errors.availableFrom}>
                <input
                  id="availableFrom"
                  type="date"
                  min={today()}
                  value={form.availableFrom}
                  onChange={set("availableFrom")}
                  className={inputClass(errors.availableFrom)}
                />
              </Field>
              <Field id="education" label="Education qualification" optional error={errors.education}>
                <select id="education" value={form.education} onChange={set("education")} className={inputClass(errors.education)}>
                  <option value="">Select</option>
                  {catalogue.educationLevels.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="experienceYears" label="Work experience (years)" optional error={errors.experienceYears}>
                <input
                  id="experienceYears"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={50}
                  step={0.5}
                  placeholder="0 if you're a fresher"
                  value={form.experienceYears}
                  onChange={set("experienceYears")}
                  className={inputClass(errors.experienceYears)}
                />
              </Field>
              <Field
                id="experience"
                label="Work experience details"
                optional
                error={errors.experience}
                className="sm:col-span-2"
                hint={`${form.experience.length}/1000`}
              >
                <textarea
                  id="experience"
                  rows={4}
                  maxLength={1000}
                  placeholder="Where have you worked, and what did you do there?"
                  value={form.experience}
                  onChange={set("experience")}
                  className={cn(inputClass(errors.experience), "h-auto py-2.5")}
                />
              </Field>
              <Field id="resume" label="Resume / CV" optional error={resumeError} hint={`PDF only, up to ${RESUME_MAX_MB} MB.`} className="sm:col-span-2">
                {resume ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#e8d3c3] bg-brand-page px-3 py-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-brand-red" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{resume.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resume.size < 1024 * 1024
                          ? `${Math.max(1, Math.round(resume.size / 1024))} KB`
                          : `${(resume.size / 1024 / 1024).toFixed(1)} MB`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResume(null)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-brand-cream/60 hover:text-brand-maroon"
                      aria-label="Remove resume"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="resume"
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition hover:border-brand-orange hover:bg-brand-page",
                      resumeError ? "border-brand-maroon" : "border-[#e8d3c3]",
                    )}
                  >
                    <Upload className="h-5 w-5 text-brand-orange" aria-hidden />
                    <span className="font-semibold text-[#3d2c22]">Upload your resume</span>
                    <span className="text-xs text-muted-foreground">PDF, up to {RESUME_MAX_MB} MB</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={pickResume}
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden
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
                Your details are only shared with the Yulo Stores hiring team.
              </p>
            </section>
          </form>
          <Faq />
          </div>
          </>
        )}
      </main>

      {confirmOpen && unpaid ? (
        <ConfirmPayDialog
          name={unpaid.name}
          role={unpaid.role}
          fee={formatRupees(fee)}
          simulated={simulated}
          busy={!!busy}
          onPay={confirmAndPay}
          onLater={() => setConfirmOpen(false)}
        />
      ) : null}

      <SiteFooter />
    </div>
  );
}
