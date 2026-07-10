import { AdminApp } from "./pages/admin/AdminApp";
import { PublicPage } from "./pages/public/PublicPage";

export function App() {
  return window.location.pathname.startsWith("/admin") ? <AdminApp /> : <PublicPage />;
}
