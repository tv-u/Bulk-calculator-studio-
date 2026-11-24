import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Code2, HelpCircle, Info, Mail, ShieldCheck } from 'lucide-react';
import { CALCULATOR_REGISTRY } from '../engine/calculators';
import { WHITELISTED_MATH_FUNCTIONS } from '../engine/safeMath';
import { DocumentHead } from '../components/seo/DocumentHead';
import { LiquidGlassReveal, MagneticButton } from '../components/motion/MotionLibrary';

export const DeveloperDocsPage: React.FC = () => (
  <div className="space-y-6">
    <DocumentHead
      title="Developer & API Documentation – BULK CALCULATOR STUDIO"
      description="Technical documentation for BULK CALCULATOR STUDIO endpoints, safe formula AST syntax, and calculator registry schema."
    />
    <LiquidGlassReveal className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Code2 className="h-4 w-4 text-emerald-500" />
        <span>Architecture &amp; REST Endpoints</span>
      </div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Developer Center</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        BULK CALCULATOR STUDIO runs a deterministic client-side computation core paired with Express API routes for live currency rates, Gemini AI intent parsing, and admin configuration.
      </p>

      <div className="grid gap-4 md:grid-cols-2 text-xs">
        <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <div className="font-mono font-bold text-emerald-500">GET /api/health</div>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Returns server uptime and AI availability boolean.</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <div className="font-mono font-bold text-emerald-500">GET /api/rates?base=USD</div>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Fetches live or 1h-cached exchange rates with provider attribution.</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <div className="font-mono font-bold text-emerald-500">POST /api/ai/assist</div>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Server-side Gemini 4 Hydrogen intent parser returning calculator ID &amp; extracted numeric inputs.</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
          <div className="font-mono font-bold text-emerald-500">GET /api/config/public</div>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Returns published calculator visibility list and Monetag direct-link configuration.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/70 p-4 text-xs dark:border-slate-800">
        <div className="font-semibold mb-1">Safe Formula Parser Whitelist (Zero eval())</div>
        <div className="font-mono text-slate-500 dark:text-slate-400">
          Functions: {WHITELISTED_MATH_FUNCTIONS.join(', ')} · Registry size: {CALCULATOR_REGISTRY.length} calculators
        </div>
      </div>
    </LiquidGlassReveal>
  </div>
);

export const AboutPage: React.FC = () => (
  <div className="space-y-6">
    <DocumentHead
      title="About Us – BULK CALCULATOR STUDIO"
      description="Learn about BULK CALCULATOR STUDIO, our deterministic calculation accuracy standards, and India-first + global architecture."
    />
    <LiquidGlassReveal className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-4 w-4 text-violet-500" />
        <span>Platform Mission</span>
      </div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">About BULK CALCULATOR STUDIO</h1>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <strong>One Studio. Unlimited Calculations. Real Results.</strong> BULK CALCULATOR STUDIO was engineered to unify everyday calculators, high-volume CSV bulk processing, custom no-code formula creation, and visual node workflows in one fast, installable application.
      </p>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Every published calculator uses deterministic, unit-tested formulas with transparent assumptions, zero hidden shortcuts, and full India-first (INR, Lakhs/Crores, GST, Indian Tax regimes) plus international support.
      </p>
    </LiquidGlassReveal>
  </div>
);

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Contact Us – BULK CALCULATOR STUDIO"
        description="Get in touch with the BULK CALCULATOR STUDIO team for calculator suggestions or technical support."
      />
      <LiquidGlassReveal className="p-6 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Mail className="h-4 w-4 text-teal-500" />
          <span>Feedback &amp; Calculator Requests</span>
        </div>
        <h1 className="font-display text-2xl font-bold">Contact Us</h1>
        {sent ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Thank you, {name || 'there'}. Your feedback has been recorded in this session.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            />
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share feedback or request a new verified calculator..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            />
            <MagneticButton type="submit" variant="primary">Send Message</MagneticButton>
          </form>
        )}
      </LiquidGlassReveal>
    </div>
  );
};

export const HelpCenterPage: React.FC = () => (
  <div className="space-y-6">
    <DocumentHead
      title="Help Center & FAQ – BULK CALCULATOR STUDIO"
      description="Guides for Smart Search, Bulk CSV Studio, Custom Formula safety, PWA installation, and offline capabilities."
    />
    <LiquidGlassReveal className="p-6 space-y-5">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <HelpCircle className="h-4 w-4 text-sky-500" />
        <span>Documentation &amp; FAQs</span>
      </div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Help Center</h1>
      <div className="space-y-4 text-sm">
        {[
          {
            q: 'Which tools work 100% offline vs require internet?',
            a: 'All 60+ calculators, Bulk CSV Studio, Custom Calculator Builder, Workflow Builder, Math Lab, Finance Lab, Data Analysis Studio, and the 13-category Unit Converter run deterministically in your browser and work offline once installed. Only the AI Calculation Assistant and Live Currency Converter require an active internet connection.',
          },
          {
            q: 'How do I install BULK CALCULATOR STUDIO on Android or Desktop?',
            a: 'Click the "Install App" button in the header or footer (on iOS Safari, tap Share → Add to Home Screen).',
          },
          {
            q: 'How are Custom Formulas secured?',
            a: 'Custom formulas and Bulk Studio expressions are parsed by a dedicated recursive-descent AST evaluator with strictly whitelisted math functions. JavaScript eval() and dynamic code execution are never used.',
          },
          {
            q: 'Where is my saved workspace data stored?',
            a: 'Your saved calculations, history, custom calculators, workflows, and Light Control Studio preferences are stored locally in your browser via localStorage.',
          },
        ].map((faq) => (
          <div key={faq.q} className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
            <h2 className="font-display font-semibold">{faq.q}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</p>
          </div>
        ))}
      </div>
    </LiquidGlassReveal>
  </div>
);

export const LegalPage: React.FC<{ kind: 'privacy' | 'terms' | 'disclaimer' }> = ({ kind }) => {
  const titles = {
    privacy: 'Privacy Policy',
    terms: 'Terms and Conditions',
    disclaimer: 'Calculation & Financial/Health Disclaimer',
  };
  return (
    <div className="space-y-6">
      <DocumentHead
        title={`${titles[kind]} – BULK CALCULATOR STUDIO`}
        description={`${titles[kind]} for BULK CALCULATOR STUDIO.`}
      />
      <LiquidGlassReveal className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-teal-500" />
          <span>Legal &amp; Compliance</span>
        </div>
        <h1 className="font-display text-2xl font-bold">{titles[kind]}</h1>
        {kind === 'privacy' && (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Calculations, CSV uploads, and workspace records are processed locally in your browser whenever possible. Live currency lookups and AI Assistant queries only transmit the specific query parameters you submit. Sponsored partner links open safely in a new tab with standard rel=&quot;noopener noreferrer sponsored&quot; isolation.
          </p>
        )}
        {kind === 'terms' && (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            BULK CALCULATOR STUDIO provides deterministic calculation utilities for informational, educational, and productivity workflows. Users remain responsible for verifying statutory tax filings, engineering safety margins, and uploaded CSV data before production decisions.
          </p>
        )}
        {kind === 'disclaimer' && (
          <div className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p><strong>Financial &amp; Tax Tools:</strong> Projections such as SIP, CAGR, and Retirement assume constant user-provided parameters and do not constitute investment advice or guaranteed returns. Indian Income Tax and GST calculators indicate their applicable fiscal year and jurisdiction for reference only.</p>
            <p><strong>Health &amp; Fitness Tools:</strong> BMI, BMR, TDEE, Ideal Weight, Protein, and Water Intake calculators provide informational anthropometric estimates only and are not medical diagnoses.</p>
          </div>
        )}
      </LiquidGlassReveal>
    </div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div className="py-12">
    <DocumentHead
      title="404 Page Not Found – BULK CALCULATOR STUDIO"
      description="The requested page could not be found."
      noIndex
    />
    <LiquidGlassReveal className="mx-auto max-w-lg p-8 text-center space-y-4">
      <div className="font-mono text-5xl font-bold text-purple-500">404</div>
      <h1 className="font-display text-2xl font-bold">Route Not Found</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The requested route does not exist in BULK CALCULATOR STUDIO.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/"><MagneticButton variant="primary">Go Home</MagneticButton></Link>
        <Link to="/calculators"><MagneticButton variant="outline">Browse Calculators</MagneticButton></Link>
      </div>
    </LiquidGlassReveal>
  </div>
);

export const ErrorPage: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'An unexpected application error occurred.',
  onRetry,
}) => (
  <div className="py-12">
    <DocumentHead
      title="Application Error – BULK CALCULATOR STUDIO"
      description="An unexpected error occurred."
      noIndex
    />
    <LiquidGlassReveal className="mx-auto max-w-lg p-8 text-center space-y-4">
      <h1 className="font-display text-2xl font-bold text-rose-500">Something Went Wrong</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      <div className="flex justify-center gap-3">
        {onRetry && <MagneticButton variant="primary" onClick={onRetry}>Try Again</MagneticButton>}
        <Link to="/"><MagneticButton variant="outline">Return Home</MagneticButton></Link>
      </div>
    </LiquidGlassReveal>
  </div>
);
