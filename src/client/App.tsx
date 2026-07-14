import { AdminApp } from "./pages/admin/AdminApp";
import { DomainDetailPage } from "./pages/public/DomainDetailPage";
import { DomainsPage } from "./pages/public/DomainsPage";
import { HomePage } from "./pages/public/HomePage";

/** 旧版首页即域名列表，分享链接形如 /?q=xxx&tld=org。
 *  首页改为资产总览后，这类带筛选参数的旧链接要原样转到 /domains，不能丢参数。 */
const LEGACY_LIST_PARAMS = ["q", "tld", "category", "group", "sort", "page"];

export function App() {
  const path = window.location.pathname;

  if (path.startsWith("/admin")) return <AdminApp />;

  if (path.startsWith("/d/")) {
    const name = decodeURIComponent(path.slice(3)).trim().toLowerCase();
    if (name) return <DomainDetailPage name={name} />;
  }

  if (path === "/domains") return <DomainsPage />;

  if (path === "/") {
    const params = new URLSearchParams(window.location.search);
    if (LEGACY_LIST_PARAMS.some((key) => params.has(key))) {
      window.history.replaceState(null, "", `/domains${window.location.search}`);
      return <DomainsPage />;
    }
    return <HomePage />;
  }

  return <HomePage />;
}
