import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import type { Dept } from './jewelry';

const SUPPORT_EMAIL = 'hello@davinova.com';
const HIDE_KEY = 'davinova-helper-hidden';
const SEEN_KEY = 'davinova-helper-greeted';

type Topic = 'track' | 'shipping' | 'event' | 'returns' | 'damaged' | 'size' | 'pay' | 'contact' | 'menu';
type Message = { from: 'nova' | 'you'; text: ReactNode; choices?: Topic[] };

const LABELS: Record<Topic, string> = {
  track: 'Where is my order?',
  shipping: 'Shipping & delivery',
  event: 'Will it arrive in time?',
  returns: 'Returns & refunds',
  damaged: 'Damaged or wrong item',
  size: 'Help with my size',
  pay: 'Payment',
  contact: 'Talk to a person',
  menu: 'Something else',
};

const MAIN: Topic[] = ['track', 'shipping', 'returns', 'size', 'contact'];

// Words a shopper might type, mapped to the answer that fits. First match wins.
const KEYWORDS: [RegExp, Topic][] = [
  [/damag|broken|wrong|torn|faulty|missing|defect/i, 'damaged'],
  [/track|where.*(order|parcel|package)|order status|not (arrived|received)|delay/i, 'track'],
  [/wedding|event|in time|by (the )?\d|urgent|date/i, 'event'],
  [/return|refund|exchange|send back|money back/i, 'returns'],
  [/size|fit|measure|small|large|tight|loose|length/i, 'size'],
  [/ship|deliver|post|customs|dut(y|ies)|how long/i, 'shipping'],
  [/pay|card|price|cost|checkout|discount|code|gift/i, 'pay'],
  [/human|person|agent|email|contact|speak|talk|help/i, 'contact'],
];

function Mail() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(SUPPORT_EMAIL); setCopied(true); } catch { setCopied(false); }
  }
  return <span className="helper__mail"><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></span>;
}

function answer(topic: Topic, base: string): Message {
  const page = (path: string, label: string) => <Link to={`${base}${path}`}>{label}</Link>;
  switch (topic) {
    case 'track': return { from: 'nova', text: <>We prepare every order within 1–3 business days. As soon as it leaves the warehouse, we email you a tracking number, and tracking can take a day or two to show its first update. No email after 3 business days? Check your spam folder, then write to us with your order number: <Mail /></>, choices: ['shipping', 'damaged', 'menu'] };
    case 'shipping': return { from: 'nova', text: <>Shipping is free on every order and always tracked. Delivery usually takes 7–15 business days after 1–3 days of preparation. Some countries charge import duties on arrival. More in {page('/shipping', 'Shipping')}.</>, choices: ['event', 'track', 'menu'] };
    case 'event': return { from: 'nova', text: <>To be safe, order at least <b>three weeks</b> before your event. That covers preparation, delivery and time for an exchange if the fit isn't right.</>, choices: ['size', 'shipping', 'menu'] };
    case 'returns': return { from: 'nova', text: <>You have <b>30 days</b> from delivery to return items that are unworn, with tags on. Email <Mail /> with your order number and we'll send the return address. Please wait for our reply before posting anything back. Refunds reach your card 5–10 business days after the return arrives. See {page('/returns', 'Returns')}.</>, choices: ['damaged', 'size', 'menu'] };
    case 'damaged': return { from: 'nova', text: <>Sorry about that! Email us a photo within 7 days of delivery, with your order number, and we'll send a replacement or a full refund, shipping included: <Mail /></>, choices: ['returns', 'menu'] };
    case 'size': return { from: 'nova', text: <>Measure over light clothing and compare with our {page('/size-guide', 'size guide')}. Between two sizes? Take the larger one. Our styles often run small, so the chart beats the size you usually wear.</>, choices: ['returns', 'event', 'menu'] };
    case 'pay': return { from: 'nova', text: <>Prices are in US dollars with free shipping included. Checkout takes major cards through a secure payment provider, and we never see your full card number. Gift cards are on the way.</>, choices: ['shipping', 'menu'] };
    case 'contact': return { from: 'nova', text: <>Write to us any time at <Mail />. We reply within 1–2 business days. For an order, include your order number.</>, choices: ['menu'] };
    case 'menu': return { from: 'nova', text: 'What can I help you with?', choices: [...MAIN, 'event', 'damaged', 'pay'] as Topic[] };
  }
}

function read(key: string): string | null {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
}
function write(store: 'local' | 'session', key: string) {
  try { (store === 'local' ? localStorage : sessionStorage).setItem(key, '1'); } catch { /* storage blocked */ }
}

/** Nova, the shop helper: a greeting with quick choices and answers from our help pages. No AI service, so it costs nothing to run. */
export function SupportHelper({ dept }: { dept: Dept }) {
  const base = dept === 'men' ? '/men' : '';
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [hidden, setHidden] = useState(() => read(HIDE_KEY) === '1');
  const [never, setNever] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ from: 'nova', text: `Hi, I'm Nova from Davinova. How can I help you today?`, choices: MAIN }]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hidden || read(SEEN_KEY)) return;
    const timer = window.setTimeout(() => { setGreeting(true); write('session', SEEN_KEY); }, 7000);
    return () => window.clearTimeout(timer);
  }, [hidden]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, open]);

  function closeGreeting() {
    setGreeting(false);
    if (never) { write('local', HIDE_KEY); setHidden(true); }
  }
  function choose(topic: Topic) {
    setGreeting(false);
    setOpen(true);
    setMessages((list) => [...list, { from: 'you', text: LABELS[topic] }, answer(topic, base)]);
  }
  function ask(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const topic = KEYWORDS.find(([pattern]) => pattern.test(text))?.[1];
    const reply: Message = topic ? answer(topic, base)
      : { from: 'nova', text: <>I'm not sure I can answer that one. A person from our team can: <Mail /></>, choices: ['menu'] };
    setMessages((list) => [...list, { from: 'you', text }, reply]);
  }

  const last = messages[messages.length - 1];
  // Rendered on <body> so the shop's animated (transformed) wrappers can't pin it inside the page.
  return createPortal(<div className={`helper helper--${dept}`}>
    {greeting && !open && <div className="helper__greet" role="dialog" aria-label="Davinova helper">
      <button type="button" className="helper__close" onClick={closeGreeting} aria-label="Close"><X size={16} /></button>
      <p>Hi, I'm <b>Nova</b>. Welcome to Davinova! Looking for the perfect outfit, or need help with an order?</p>
      <div className="helper__choices">
        <button type="button" className="primary" onClick={() => choose('track')}>Where is my order?</button>
        <button type="button" onClick={() => choose('size')}>Help with my size</button>
        <button type="button" onClick={() => choose('returns')}>Returns & refunds</button>
        <button type="button" onClick={closeGreeting}>No, thanks</button>
      </div>
      <label className="helper__never"><input type="checkbox" checked={never} onChange={(event) => setNever(event.target.checked)} /> Don't show this again</label>
    </div>}

    {open && <section className="helper__panel" aria-label="Chat with Nova">
      <header><Avatar /><div><strong>Nova</strong><span>Davinova help · replies instantly</span></div><button type="button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button></header>
      <div className="helper__log">
        {messages.map((message, index) => <div key={index} className={`helper__msg helper__msg--${message.from}`}>{message.text}</div>)}
        {last.choices && <div className="helper__choices helper__choices--chat">{last.choices.map((topic) => <button key={topic} type="button" onClick={() => choose(topic)}>{LABELS[topic]}</button>)}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={ask}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your question…" aria-label="Your question" maxLength={300} /><button type="submit" aria-label="Send"><Send size={16} /></button></form>
    </section>}

    <button type="button" className="helper__launch" onClick={() => { setOpen(!open); setGreeting(false); }} aria-label={open ? 'Close help' : 'Open help'} aria-expanded={open}>
      <Avatar /><span>Nova</span>
    </button>
  </div>, document.body);
}

/** A small drawn portrait of Nova, coloured by the shop through CSS. */
function Avatar() {
  return <svg className="helper__avatar" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="32" className="helper__avatar-bg" />
    <path className="helper__avatar-hair" d="M13 52c-3-8-2-20 2-28 3-8 10-13 17-13s14 5 17 13c4 8 5 20 2 28-3-2-6-3-9-3V30H22v19c-3 0-6 1-9 3Z" />
    <path className="helper__avatar-body" d="M8 64c2-9 9-14 18-15h12c9 1 16 6 18 15Z" />
    <path className="helper__avatar-skin" d="M27 44h10v7c-2 2-8 2-10 0Z" />
    <ellipse cx="32" cy="32" rx="11" ry="13.5" className="helper__avatar-skin" />
    <path className="helper__avatar-hair" d="M20 30c1-9 6-14 13-14 6 0 11 4 12 12-5-1-10-4-13-8-2 5-7 9-12 10Z" />
    <circle cx="20.8" cy="36" r="1.6" className="helper__avatar-earring" /><circle cx="43.2" cy="36" r="1.6" className="helper__avatar-earring" />
    <path d="M25.5 31.5c1.2-1 2.8-1 4 0M34.5 31.5c1.2-1 2.8-1 4 0" className="helper__avatar-smile" />
    <path d="M28.5 39.5c2.2 1.6 4.8 1.6 7 0-1 2.4-6 2.4-7 0Z" className="helper__avatar-lips" />
  </svg>;
}
