"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

// Rate & Review Sprint 1, Sec 3. Self-contained: writes the verification
// token straight into a hidden input by name, so a parent <form> just
// drops this in and reads formData.get(name) in its Server Action like
// any other field — no lifted state, no extra wiring at the call site.
export function TurnstileWidget({ name = "turnstileToken" }: { name?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;

    function render() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
        callback: (token) => {
          if (inputRef.current) inputRef.current.value = token;
        },
      });
    }

    const scriptId = "cf-turnstile-script";
    if (window.turnstile) {
      render();
    } else {
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} />
      <input ref={inputRef} type="hidden" name={name} />
    </div>
  );
}
