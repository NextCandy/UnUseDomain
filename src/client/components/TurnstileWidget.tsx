import { useEffect, useRef } from "react";

declare global { interface Window { turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string } } }

export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const render = () => { if (active && ref.current && window.turnstile) window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken("") }); };
    if (window.turnstile) render();
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-wanmi-turnstile]');
      if (existing) existing.addEventListener("load", render, { once: true });
      else { const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.defer = true; script.dataset.wanmiTurnstile = "true"; script.addEventListener("load", render, { once: true }); document.head.appendChild(script); }
    }
    return () => { active = false; };
  }, [onToken, siteKey]);
  return <div className="turnstile-widget" ref={ref} />;
}
