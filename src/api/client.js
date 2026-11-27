import axios from "axios";

// The careers portal has no login. After an application is created the browser holds its
// access token (lib/pending.js) and sends it as X-Application-Token — see
// yulo_backend/server/controllers/careers.controller.js.

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const client = axios.create({ baseURL: `${API_BASE}/api/careers` });

// A plain Error carrying the API's own message, code and field errors.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    const apiError = new Error(
      data?.message ??
        (err.response ? "Something went wrong. Please try again." : "You seem to be offline. Check your connection and try again."),
    );
    apiError.code = data?.code;
    apiError.status = err.response?.status;
    apiError.fieldErrors = data?.details?.fieldErrors ?? null;
    return Promise.reject(apiError);
  },
);

const withToken = (token) => ({ headers: { "X-Application-Token": token } });

export const careersApi = {
  positions: () => client.get("/positions").then((r) => r.data.data),
  // `form` is FormData: the fields plus an optional `resume` PDF.
  apply: (form) => client.post("/applications", form).then((r) => r.data.data),
  get: (id, token) => client.get(`/applications/${id}`, withToken(token)).then((r) => r.data.data.application),
  pay: (id, token) => client.post(`/applications/${id}/pay`, null, withToken(token)).then((r) => r.data.data),
  verify: (id, token, body) =>
    client.post(`/applications/${id}/verify`, body, withToken(token)).then((r) => r.data.data.application),
  simulate: (id, token) =>
    client.post(`/applications/${id}/simulate-payment`, null, withToken(token)).then((r) => r.data.data.application),
};

// "Choose your business": a shop applying to become a Yulo coupon partner (₹100 form fee).
export const businessApi = {
  form: () => client.get("/partner-form").then((r) => r.data.data),
  apply: (body) => client.post("/partner-applications", body).then((r) => r.data.data),
  get: (id, token) => client.get(`/partner-applications/${id}`, withToken(token)).then((r) => r.data.data.application),
  pay: (id, token) => client.post(`/partner-applications/${id}/pay`, null, withToken(token)).then((r) => r.data.data),
  verify: (id, token, body) =>
    client.post(`/partner-applications/${id}/verify`, body, withToken(token)).then((r) => r.data.data.application),
  simulate: (id, token) =>
    client.post(`/partner-applications/${id}/simulate-payment`, null, withToken(token)).then((r) => r.data.data.application),
};
