import { Navigate, Route, Routes } from "react-router-dom";

import Apply from "./screens/Apply";
import Submitted from "./screens/Submitted";
import Policy from "./screens/Policy";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Apply />} />
      <Route path="/submitted" element={<Submitted />} />
      <Route path="/terms" element={<Policy which="terms" />} />
      <Route path="/privacy" element={<Policy which="privacy" />} />
      <Route path="/refund-policy" element={<Policy which="refund" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
