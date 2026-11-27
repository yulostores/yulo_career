// Shown once the form fee is paid. The application comes in the navigation state; opened any
// other way (a bookmark, a refresh after the state is gone) it just points back to the form.

import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import SiteFooter from "@/components/SiteFooter";
import { BusinessSubmitted } from "@/screens/Business";

export default function Submitted() {
  const application = useLocation().state?.application ?? null;
  const isBusiness = Boolean(application?.businessName);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        {application ? (
          <>
            {isBusiness ? (
              <BusinessSubmitted application={application} />
            ) : (
              <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f4e8]">
              <CheckCircle2 className="h-9 w-9 text-brand-green" aria-hidden />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold">Application submitted</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Thank you, {application.fullName}. Your application for{" "}
              <span className="font-semibold text-foreground">{application.roleLabel}</span> (
              {application.departmentLabel}) has reached our hiring team. We&rsquo;ll call you if your profile is a
              good fit.
            </p>
              </>
            )}
            {application.applicationNumber ? (
              <div className="mt-6 w-full rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Application number</p>
                <p className="mt-1 text-2xl font-extrabold tracking-wide text-brand-red">{application.applicationNumber}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Keep this number for any questions about your application. Fee paid: ₹
                  {Math.round((application.feePaise ?? 10000) / 100)}.
                </p>
              </div>
            ) : null}
            <Link
              to="/"
              className="mt-6 text-sm font-semibold text-brand-orange hover:text-brand-red"
            >
              {isBusiness ? "Back to Yulo Stores careers" : "Apply for another role"}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">Careers at Yulo Stores</h1>
            <p className="mt-2 text-muted-foreground">Looking to apply? Start your application here.</p>
            <Link to="/" className="mt-6 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-semibold text-white">
              Go to the application form
            </Link>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
