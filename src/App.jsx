import { Navigate, Route, Routes } from "react-router-dom";

import Apply from "./screens/Apply";
import Submitted from "./screens/Submitted";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Apply />} />
      <Route path="/submitted" element={<Submitted />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
