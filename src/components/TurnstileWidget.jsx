import React, { useEffect, useRef } from 'react';

// Cloudflare official test site key (always passes with a simulated check in dev)
// Can be overridden by import.meta.env.VITE_TURNSTILE_SITE_KEY in production
const DEFAULT_SITE_KEY = '1x00000000000000000000AA';

const TurnstileWidget = ({
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  className = '',
}) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY;

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Avoid double-rendering
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          callback: (token) => {
            if (isMounted && onVerify) onVerify(token);
          },
          'error-callback': () => {
            if (isMounted && onError) onError();
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
        });
      } catch (err) {
        console.error('Turnstile render error:', err);
      }
    };

    // Check if turnstile script is already present
    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = 'cf-turnstile-script';
      let script = document.getElementById(scriptId);

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} className="cf-turnstile" />
    </div>
  );
};

export default TurnstileWidget;
