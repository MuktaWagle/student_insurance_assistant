'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import type { GuidanceRequest, Result } from '../lib/contracts';

const initial: GuidanceRequest = {
  mode: 'care',
  profile: {
    university: 'National University of Singapore',
    year: 2026,
    level: 'unknown',
    residency: 'unknown',
    attendance: 'unknown',
    status: 'unknown',
    fees: 'unknown',
  },
  concern: '',
  date: '',
  setting: 'unknown',
  log: 'unknown',
  consent: true,
};

function FieldHint({ id, text }: { id: string; text: string }) {
  return (
    <span className="field-hint" tabIndex={0} aria-label="Field help" aria-describedby={id}>
      ⓘ
      <span id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}

export default function Home() {
  const [form, setForm] = useState(initial),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [consent, setConsent] = useState(false),
    [checked, setChecked] = useState<string[]>([]);
  const revision = useRef(0);
  const output = useRef<HTMLElement>(null);

  function update(next: GuidanceRequest) {
    revision.current++;
    setForm(next);
    setResult(null);
    setChecked([]);
    setError('');
  }

  function profile(key: string, value: string | number) {
    update({ ...form, profile: { ...form.profile, [key]: value } });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const version = revision.current;

    try {
      const res = await fetch('/api/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent }),
      });

      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      if (version === revision.current) {
        setResult(data);
        setChecked([]);
        setTimeout(() => output.current?.focus(), 0);
      }
    } catch (e) {
      if (version === revision.current)
        setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const select = (label: string, key: keyof GuidanceRequest['profile'], options: string[]) => (
    <label>
      {label}
      {key === 'fees' && (
        <FieldHint id="fees-hint" text="Health scheme fee on your NUS Student Bill." />
      )}
      <select
        aria-label={label}
        value={form.profile[key]}
        onChange={(e) => profile(key, e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'unknown' ? 'Not sure' : o.replaceAll('-', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
  
  return (
    <>
      <header>
        <Link className="brand" href="/">
          ✳ <span>StudentCare</span>
        </Link>
        <span className="tag">NUS · Prototype</span>
        <button
          className="quiet"
          onClick={() => {
            revision.current++;
            setForm(initial);
            setResult(null);
            setChecked([]);
            setConsent(false);
            setError('');
          }}
        >
          Start over ↺
        </button>
      </header>
      <main>
        <section className="intro">
          <div className="eyebrow">A LITTLE CLARITY, EVERY STEP</div>
          <h1>
            Care comes first.
            <br />
            <span>We’ll help with the next steps.</span>
          </h1>
          <p>
            Understand where to seek care, what your university policy says,
            <br className="desktop" /> and what to prepare for a claim.
          </p>
          <div className="journey">
            <span>01 &nbsp; Your profile</span>
            <i>—</i>
            <span>02 &nbsp; Your concern</span>
            <i>—</i>
            <span>03 &nbsp; Your next steps</span>
          </div>
        </section>
        <form onSubmit={submit}>
          <div className="workspace">
            <aside className="card">
              <div className="section-title">
                <span className="number">01</span>
                <h2>A little about you</h2>
              </div>
              <p className="muted">Helps us find the relevant policy details.</p>
              <label>
                University
                <input readOnly value="National University of Singapore" />
              </label>
              <label>
                Enrolment year
                <input
                  required
                  type="number"
                  min="1960"
                  max="2100"
                  value={form.profile.year}
                  onChange={(e) => profile('year', Number(e.target.value))}
                />
              </label>
              {select('Study level', 'level', ['unknown', 'undergraduate', 'graduate'])}
              {select('Residency', 'residency', ['unknown', 'local', 'international'])}
              {select('Attendance', 'attendance', ['unknown', 'full-time', 'part-time'])}
              <details>
                <summary>Enrolment & fee details</summary>
                {select('Student status', 'status', ['unknown', 'active', 'leave', 'other'])}
                {select('Health Service Fees', 'fees', ['unknown', 'paid', 'unpaid'])}
                <p className="muted">
                  Local includes Singapore citizens and permanent residents. Special enrolment cases
                  need individual confirmation.
                </p>
              </details>
              <div className="privacy">
                ♧ &nbsp; Only in this tab.
                <br />
                <small>Your profile clears when you refresh.</small>
              </div>
            </aside>
            <section className="card concern">
              <div className="section-title">
                <span className="number">02</span>
                <h2>How can we help?</h2>
              </div>
              <div className="modes">
                {(['care', 'claim'] as const).map((mode) => (
                  <button
                    type="button"
                    aria-pressed={form.mode === mode}
                    className={form.mode === mode ? 'mode active' : 'mode'}
                    key={mode}
                    onClick={() => update({ ...form, mode })}
                  >
                    <span>{mode === 'care' ? '✚' : '☷'}</span>
                    <strong>Help with {mode}</strong>
                    <small>
                      {mode === 'care'
                        ? 'Find your next care steps'
                        : 'Prepare your claim documents'}
                    </small>
                  </button>
                ))}
              </div>
              <label htmlFor="concern">
                {form.mode === 'care'
                  ? 'What would you like help with?'
                  : 'Tell us about your claim'}
              </label>
              <textarea
                id="concern"
                required
                minLength={3}
                maxLength={3000}
                placeholder={
                  form.mode === 'care'
                    ? 'For example: I have a specialist referral. Where can I go and what should I bring?'
                    : 'For example: I visited a specialist and need help preparing my claim.'
                }
                value={form.concern}
                onChange={(e) => update({ ...form, concern: e.target.value })}
              />
              <p className="muted">
                Please leave out names, student IDs, and detailed medical records.
              </p>
              <div className="two">
                <label>
                  Care or claim type
                  <FieldHint id="care-type-hint" text="Your care or claim category." />
                  <select
                    aria-label="Care or claim type"
                    value={form.setting}
                    onChange={(e) =>
                      update({ ...form, setting: e.target.value as GuidanceRequest['setting'] })
                    }
                  >
                    {[
                      ['unknown', 'Not sure yet'],
                      ['uhc', 'UHC scheme'],
                      ['specialist', 'Outpatient specialist'],
                      ['hospital', 'Hospitalisation / surgery'],
                      ['accident', 'Personal accident'],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {form.mode === 'care'
                    ? 'Planned care date (optional)'
                    : 'Treatment / incident date'}
                  <input
                    type="date"
                    required={form.mode === 'claim'}
                    value={form.date}
                    onChange={(e) => update({ ...form, date: e.target.value })}
                  />
                </label>
              </div>
              {form.setting === 'hospital' && (
                <label>
                  Letter of Guarantee (LOG)
                  <select
                    value={form.log}
                    onChange={(e) =>
                      update({ ...form, log: e.target.value as GuidanceRequest['log'] })
                    }
                  >
                    <option value="unknown">Not sure</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
              )}
              <label className="consent">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I understand my concern and relevant profile details may be sent to Google Gemini.
                  Use fictional data for this prototype.
                </span>
              </label>
              <button className="primary" disabled={busy || !consent}>
                {busy ? 'Reading the policy documents…' : 'Find my next steps'} <span>↗</span>
              </button>
              <p className="caption">
                Grounded in supplied NUS references · Administrative guidance only
              </p>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
            </section>
          </div>
        </form>
        {result && (
          <section ref={output} tabIndex={-1} className="card results" aria-live="polite">
            <div className="section-title">
              <span className="number">03</span>
              <h2>Your next steps</h2>
              <span className="tag">
                {result.engine === 'gemini'
                  ? 'Gemini + references'
                  : result.engine === 'safety'
                    ? 'Immediate help'
                    : 'Request status'}
              </span>
            </div>
            <p>{result.message}</p>
            {result.limitations.map((l) => (
              <p className="notice" key={l}>
                {l}
              </p>
            ))}
            {(['overview', 'care', 'next_steps', 'documents'] as const).map((section) => {
              const items = result.items.filter((item) => item.section === section);
              if (!items.length) return null;
              return (
                <section key={section} aria-label={section.replaceAll('_', ' ')}>
                  <h3 className="answer-section">
                    {
                      {
                        overview: 'Your situation',
                        care: 'Where to seek care',
                        next_steps: 'What to do next',
                        documents: 'Documents to prepare',
                      }[section]
                    }
                  </h3>
                  {items.map((item) => (
                    <article key={item.id}>
                      <h4>
                        {section === 'documents' ? (
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={checked.includes(item.id)}
                              onChange={(e) =>
                                setChecked(
                                  e.target.checked
                                    ? [...checked, item.id]
                                    : checked.filter((id) => id !== item.id),
                                )
                              }
                            />
                            {item.title}
                          </label>
                        ) : (
                          item.title
                        )}
                      </h4>
                      <p className="answer-text">{item.text}</p>
                      {section === 'documents' && item.requirement !== 'not_applicable' && (
                        <p>
                          <span className="tag">{item.requirement}</span> {item.condition}
                        </p>
                      )}
                      {item.citations.map((citation, index) => (
                        <details key={`${citation.sourceId}-${citation.page}-${index}`}>
                          <summary>
                            Source · {citation.sourceId.replaceAll('_', ' ')} · p. {citation.page}
                          </summary>
                          <blockquote>{citation.quote}</blockquote>
                          <a
                            href={`/sources/${encodeURIComponent(citation.sourceId)}#page=${citation.page}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open original PDF ↗
                          </a>
                        </details>
                      ))}
                    </article>
                  ))}
                </section>
              );
            })}
            {form.mode === 'care' && (
              <button
                className="primary"
                onClick={() => {
                  update({ ...form, mode: 'claim', date: '', concern: '' });
                  document.getElementById('concern')?.focus();
                }}
              >
                Continue to claim →
              </button>
            )}
          </section>
        )}
        <footer>
          <strong>A guide, not a diagnosis.</strong> StudentCare cannot assess symptoms, recommend
          treatment, or confirm coverage.
          <br />
          If you need immediate help, seek professional or local emergency assistance. Not an
          official NUS or insurer service.
        </footer>
      </main>
    </>
  );
}
