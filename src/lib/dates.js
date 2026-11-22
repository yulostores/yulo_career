// Calendar dates as "YYYY-MM-DD" strings in the visitor's local time — what <input type="date">
// reads and writes, and what the API expects.

const pad = (n) => String(n).padStart(2, "0");

export function isoLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today() {
  return isoLocal(new Date());
}

/** The date `years` years before today. */
export function yearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return isoLocal(d);
}

/** Whole years from a "YYYY-MM-DD" birth date to today, or null. */
export function ageFrom(dob) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob ?? "");
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  const month = now.getMonth() + 1;
  if (month < Number(m[2]) || (month === Number(m[2]) && now.getDate() < Number(m[3]))) age -= 1;
  return age;
}
