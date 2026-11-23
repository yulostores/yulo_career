// The careers site's own policy pages (/terms, /privacy, /refund-policy). Written for the job
// application process only — the customer app and restaurant policies live on the main site.
// Facts here must match the application rules (server/config/careers.config.js): ages 16–70,
// résumé optional (PDF, 5 MB), a ₹100 form fee paid through Razorpay after submitting.

import { BUSINESS } from "@/content/business";

const UPDATED = "24 November 2026";

export const POLICIES = {
  terms: {
    path: "/terms",
    title: "Terms & Conditions",
    updated: UPDATED,
    intro: `These terms apply when you apply for a job with ${BUSINESS.legalName} ("Yulo Stores", "we") through this careers website. By submitting an application you agree to them.`,
    sections: [
      {
        heading: "Who can apply",
        body: [
          "You must be between 16 and 70 years old on the day you apply.",
          "Freshers and students can apply. Some roles may need you to be 18 or older at the time of joining.",
        ],
      },
      {
        heading: "Your application",
        body: [
          "The details you give must be true and your own. Applications with false or someone else's information may be rejected at any stage, including after you have joined.",
          "Submitting an application, or paying the application fee, does not guarantee an interview or a job. Every application is reviewed by our hiring team, and we contact only the people whose profile fits an open role.",
          "You may apply for the role that suits you best. Sending the same application many times does not improve your chances.",
        ],
      },
      {
        heading: "Application fee",
        body: [
          "After you submit the form, a one-time application fee is paid through Razorpay to confirm your registration. An application is sent to our hiring team only once this fee is paid.",
          "The fee is not refundable. See the Cancellation & Refund policy.",
        ],
      },
      {
        heading: "Hiring process",
        body: [
          "If your profile is shortlisted, we contact you on the mobile number you gave. Please keep it reachable.",
          "Interviews, trials or document checks may be part of the process for some roles. Salary, joining date and other terms are confirmed only in a written offer from Yulo Stores.",
          "Yulo Stores never asks for money for an interview, a joining kit or a job offer beyond the application fee on this website. If anyone asks you for such payments in our name, do not pay and tell us at " + BUSINESS.supportEmail + ".",
        ],
      },
      {
        heading: "Use of this website",
        body: [
          "Do not upload files that are not your résumé, or that contain harmful content. We may remove such applications.",
          "We may change, pause or close openings at any time.",
        ],
      },
      {
        heading: "Changes and law",
        body: [
          "We may update these terms. The version on this page applies to applications submitted after it was updated.",
          "These terms are governed by the laws of India.",
        ],
      },
    ],
  },

  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    updated: UPDATED,
    intro: "Your data is safe with us. We use the details in your job application only to consider you for a job at Yulo Stores, and we do not sell or share your data with anyone.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "The details you enter in the application form: name, mobile numbers, date of birth, gender, city, the job you want, expected and current salary, joining date, education and work experience.",
          "Your résumé, if you upload one.",
          "Payment status of your application fee. Card, UPI and bank details are entered on Razorpay's secure page and are never seen or stored by us.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To review your application, contact you about it, and — if you join — to begin your onboarding.",
          "We do not use your application to send you marketing messages.",
        ],
      },
      {
        heading: "We don't share your data",
        body: [
          "Your application is seen only by the Yulo Stores hiring team. We do not sell, rent or share your personal data with any other company or person.",
          "The only exceptions are the services that run this website for us (secure hosting and file storage, and Razorpay for the fee payment), which handle data only to provide that service, and a request from a government authority that the law requires us to answer.",
        ],
      },
      {
        heading: "How we keep it safe",
        body: [
          "Your data is stored on secure servers and is sent over encrypted connections. Only authorised members of our hiring team can open applications and résumés.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          `To see, correct or delete your application, email ${BUSINESS.supportEmail} with your name and the mobile number you applied with. We will act on it within 30 days.`,
          "We keep applications only as long as they are useful for hiring, after which they are deleted.",
        ],
      },
    ],
  },

  refund: {
    path: "/refund-policy",
    title: "Cancellation & Refund",
    updated: UPDATED,
    intro: "The application fee is not refundable.",
    sections: [
      {
        heading: "Application fee",
        body: [
          "The one-time application fee you pay to confirm your registration is not refundable once it is paid — including if your application is not shortlisted, if you withdraw it, or if an opening is closed.",
          "Please check your details and the role you choose before you pay.",
        ],
      },
      {
        heading: "Cancelling before you pay",
        body: [
          "You can submit the form and choose not to pay. Nothing is charged, and your application is not sent to our hiring team.",
        ],
      },
      {
        heading: "Charged by mistake",
        body: [
          "If you were charged more than once for the same application, or money was taken but your payment did not complete, we return the extra amount to your original payment method. Refunds usually reach you within 5–7 working days of being sent.",
          `If it has not reached you after that, email ${BUSINESS.supportEmail} with your name, mobile number and the payment reference.`,
        ],
      },
    ],
  },
};
