import { useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages';

interface DocumentHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  hreflangPath?: string; // e.g., "/finance/emi-calculator" (without /{lang})
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const DocumentHead: React.FC<DocumentHeadProps> = ({
  title,
  description,
  keywords,
  canonicalUrl: explicitCanonical,
  noIndex = false,
  hreflangPath,
  jsonLd,
}) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, attr: string, key: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const origin =
      typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? window.location.origin
        : 'https://bulk-calculator-studio.pages.dev';
    const canonicalUrl = explicitCanonical || `${origin}${window.location.pathname}`;
    setMeta('meta[name="description"]', 'name', 'description', description);
    if (keywords) {
      setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    let robots = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    } else {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'index, follow');
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Clear previously injected hreflang tags & re-emit when hreflangPath is present
    document.querySelectorAll('link[data-bcs-hreflang="1"]').forEach((n) => n.remove());
    if (hreflangPath !== undefined) {
      for (const lang of SUPPORTED_LANGUAGES) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang.code);
        link.setAttribute('href', `${origin}/${lang.code}${hreflangPath}`);
        link.setAttribute('data-bcs-hreflang', '1');
        document.head.appendChild(link);
      }
      const xDef = document.createElement('link');
      xDef.setAttribute('rel', 'alternate');
      xDef.setAttribute('hreflang', 'x-default');
      xDef.setAttribute('href', explicitCanonical || `${origin}${hreflangPath}`);
      xDef.setAttribute('data-bcs-hreflang', '1');
      document.head.appendChild(xDef);
    }

    // Schema.org JSON-LD
    document.querySelectorAll('script[data-bcs-jsonld="1"]').forEach((n) => n.remove());
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-bcs-jsonld', '1');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelectorAll('link[data-bcs-hreflang="1"]').forEach((n) => n.remove());
      document.querySelectorAll('script[data-bcs-jsonld="1"]').forEach((n) => n.remove());
    };
  }, [title, description, keywords, explicitCanonical, noIndex, hreflangPath, jsonLd]);

  return null;
};
