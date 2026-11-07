import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgePercent, BarChart3, CalendarCheck, Coins, Copy, Gift, HelpCircle, LayoutDashboard, Link2, Menu, PlayCircle, Share2, ShoppingBag, Sparkles, Users, Wallet, X,
} from 'lucide-react';
import { useAccount } from '../../store/account';
import {
  BLOCK_CENTS, CHECKIN_POINTS, LEVELS, POINTS_PER_BLOCK, POINTS_PER_DOLLAR, TOPUP_AMOUNTS_CENTS, checkinPoints, levelFor, type RewardEntry, type Rewards,
} from '../../lib/rewards';
import { REFERRAL } from '../../lib/giftCards';
import { SignIn } from './AccountPage';

type Dept = 'women' | 'men';
const base = (dept: Dept) => (dept === 'men' ? '/men' : '');
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const when = (value: string) => new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

let cached: Rewards | null = null;
const listeners = new Set<(rewards: Rewards | null) => void>();
function publish(rewards: Rewards | null) { cached = rewards; listeners.forEach((listener) => listener(rewards)); }

async function call(method: 'GET' | 'POST', body?: unknown): Promise<{ rewards?: Rewards | null; error?: string; checkin?: { ok: boolean; points: number; day: number }; convertedCents?: number }> {
  const response = await fetch('/api/account/rewards', {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({})) as Awaited<ReturnType<typeof call>>;
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  if (data.rewards !== undefined) publish(data.rewards);
  return data;
}

/** The signed-in member's Club numbers, shared by every Club page. */
export function useRewards() {
  const account = useAccount((state) => state.account);
  const [rewards, setRewards] = useState<Rewards | null>(cached);
  useEffect(() => {
    listeners.add(setRewards);
    if (account) void call('GET').catch(() => undefined);
    else publish(null);
    return () => { listeners.delete(setRewards); };
  }, [account]);
  return { rewards, action: (action: 'checkin' | 'convert' | 'invite') => call('POST', { action }) };
}

const MENU = [
  { to: 'account', label: 'Dashboard', icon: LayoutDashboard },
  { to: 'account/check-in', label: 'Check-in', icon: CalendarCheck },
  { to: 'account/invite', label: 'Invitation', icon: Link2 },
  { to: 'account/rates', label: 'Evaluation', icon: BadgePercent },
  { to: 'account/team', label: 'Team', icon: Users },
  { to: 'account/earnings', label: 'Earnings', icon: Coins },
  { to: 'account/level', label: 'Level', icon: BarChart3 },
  { to: 'account/how-it-works', label: 'Tutorial', icon: PlayCircle },
  { to: 'account/club-faq', label: 'FAQ', icon: HelpCircle },
] as const;

/** Glass bottom sheet with every Club page. */
export function ClubMenu({ dept }: { dept: Dept }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  return <>
    <button type="button" className="club__menubtn" onClick={() => setOpen(true)} aria-haspopup="dialog"><Menu size={18} /> Menu</button>
    {open && <div className="club__sheetwrap" onClick={() => setOpen(false)}>
      <div className="club__sheet" role="dialog" aria-label="Account menu" onClick={(event) => event.stopPropagation()}>
        <header><strong>Menu</strong><button type="button" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button></header>
        <nav>{MENU.map(({ to, label, icon: Icon }) => <Link key={to} to={`${base(dept)}/${to}`} onClick={() => setOpen(false)}><i><Icon size={24} /></i><span>{label}</span></Link>)}</nav>
      </div>
    </div>}
  </>;
}

/** Page frame for the Club pages: heading, menu, and sign-in when needed. */
function ClubShell({ dept, kicker, title, intro, children }: { dept: Dept; kicker: string; title: string; intro: string; children: (rewards: Rewards) => ReactNode }) {
  const { account, ready, load } = useAccount();
  const { rewards } = useRewards();
  useEffect(() => { if (!ready) void load(); }, [ready, load]);
  return <section className={`jw jw--${dept} help acct club`}>
    <header className="jw__head club__head">
      <div><span className="jw__kicker">Davinova Club · {kicker}</span><h1>{title}</h1><p>{intro}</p></div>
      {account && <ClubMenu dept={dept} />}
    </header>
    {!ready && <p className="acct__note">Loading…</p>}
    {ready && !account && <SignIn />}
    {account && !rewards && <p className="acct__note">Loading your rewards…</p>}
    {account && rewards && <div className="acct__grid club__grid">{children(rewards)}</div>}
  </section>;
}

/** Balance, points and level: the top of the account dashboard. */
export function ClubDashboard({ dept }: { dept: Dept }) {
  const { rewards, action } = useRewards();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [topup, setTopup] = useState(false);
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  if (!rewards) return null;
  const { level, next } = levelFor(rewards.lifetimePoints);
  const progress = next ? Math.min(100, ((rewards.lifetimePoints - level.min) / (next.min - level.min)) * 100) : 100;

  async function convert() {
    setBusy('convert'); setNote('');
    try { const data = await action('convert'); setNote(`${money(data.convertedCents ?? 0)} added to your balance.`); }
    catch (reason) { setNote(reason instanceof Error ? reason.message : 'Not converted.'); }
    finally { setBusy(''); }
  }
  async function recharge(amountCents: number) {
    setBusy(String(amountCents)); setNote('');
    try {
      const response = await fetch('/api/account/topup', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ amountCents, dept }) });
      const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'Secure checkout could not be created.');
      window.location.assign(data.url);
    } catch (reason) { setNote(reason instanceof Error ? reason.message : 'Top-up failed.'); setBusy(''); }
  }
  function spend() {
    if (!rewards?.walletCode) return;
    try { sessionStorage.setItem('davinova-gift', rewards.walletCode); } catch { /* private mode */ }
    navigate(`${base(dept)}/bag`);
  }

  return <>
    <section className="club__level">
      <div><Sparkles size={18} /><strong>{level.name}</strong></div>
      <span>{next ? `${(next.min - rewards.lifetimePoints).toLocaleString()} pts to ${next.name}` : 'Top level reached'}</span>
      <i style={{ ['--p' as string]: `${progress}%` }} />
      <Link to={`${base(dept)}/account/level`} aria-label="See levels">{rewards.lifetimePoints.toLocaleString()} / {(next?.min ?? rewards.lifetimePoints).toLocaleString()} pts</Link>
    </section>
    <section className="club__wallet">
      <div className="club__stats">
        <div><span>Balance (USD)</span><strong>{money(rewards.balanceCents)}</strong><Link to={`${base(dept)}/account/earnings`}>History</Link></div>
        <div><span>Points</span><strong>{rewards.points.toLocaleString()}</strong><Link to={`${base(dept)}/account/check-in`}>Earn more</Link></div>
        <div><span>Friends</span><strong>{rewards.friends.ordered}</strong><Link to={`${base(dept)}/account/team`}>Team</Link></div>
      </div>
      {params.get('topup') === '1' && <p className="club__ok">Thank you! Your top-up appears here as soon as the payment is confirmed (usually a few seconds).</p>}
      <div className="club__actions">
        <button type="button" className="club__primary" onClick={() => setTopup(!topup)} aria-expanded={topup}><Wallet size={16} /> Recharge</button>
        <button type="button" className="club__ghost" onClick={spend} disabled={!rewards.balanceCents}><ShoppingBag size={16} /> Use in bag</button>
        <button type="button" className="club__ghost" onClick={() => void convert()} disabled={rewards.points < POINTS_PER_BLOCK || busy === 'convert'}><Coins size={16} /> Points → {money(Math.floor(rewards.points / POINTS_PER_BLOCK) * BLOCK_CENTS)}</button>
      </div>
      {topup && <div className="club__amounts">
        {TOPUP_AMOUNTS_CENTS.map((cents) => <button key={cents} type="button" onClick={() => void recharge(cents)} disabled={Boolean(busy)}>{busy === String(cents) ? '…' : money(cents)}</button>)}
        <p className="acct__note">Add money once, then pay for anything on Davinova with your balance. Secure payment by Stripe. Balance is store credit and can't be withdrawn as cash.</p>
      </div>}
      {note && <p className="acct__note" role="status">{note}</p>}
    </section>
    {!rewards.checkedInToday && <Link to={`${base(dept)}/account/check-in`} className="club__nudge"><CalendarCheck size={18} /> Your daily check-in is waiting: +{checkinPoints(rewards.streak + 1 > 7 ? 1 : rewards.streak + 1, level.boost)} points today</Link>}
    <nav className="club__tiles" aria-label="Davinova Club">
      {MENU.slice(1).map(({ to, label, icon: Icon }) => <Link key={to} to={`${base(dept)}/${to}`}><i><Icon size={22} /></i><span>{label}</span></Link>)}
    </nav>
  </>;
}

export function CheckInPage({ dept }: { dept: Dept }) {
  const { action } = useRewards();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  return <ClubShell dept={dept} kicker="Check-in" title="Daily check-in" intro="Check in every day to claim bigger and bigger rewards. Day 7 is a gift, then the week starts again.">
    {(rewards) => {
      const { level } = levelFor(rewards.lifetimePoints);
      const streak = rewards.streak;
      const nextDay = rewards.checkedInToday ? streak : (streak % 7) + 1;
      async function claim() {
        setBusy(true); setNote('');
        try { const data = await action('checkin'); setNote(data.checkin?.ok ? `+${data.checkin.points} points. See you tomorrow!` : 'Already checked in today.'); }
        catch (reason) { setNote(reason instanceof Error ? reason.message : 'Check-in failed.'); }
        finally { setBusy(false); }
      }
      return <>
        <section className="acct__card club__streak">
          <span>Current streak</span>
          <div><strong>{streak}</strong> / 7 days<em>{streak} {streak === 1 ? 'day' : 'days'}</em></div>
          <i style={{ ['--p' as string]: `${(streak / 7) * 100}%` }} />
        </section>
        <section className="acct__card">
          <h2>Your progress</h2>
          <ol className="club__days">{CHECKIN_POINTS.map((_, index) => {
            const dayNo = index + 1;
            const done = dayNo <= streak && (rewards.checkedInToday || dayNo < nextDay);
            const today = !rewards.checkedInToday && dayNo === nextDay;
            return <li key={dayNo} className={`${done ? 'done' : ''} ${today ? 'today' : ''} ${dayNo === 7 ? 'gift' : ''}`}>
              <span>Day {dayNo}</span><small>×{level.boost}</small>
              <b>{dayNo === 7 ? <Gift size={22} /> : done ? '✓' : '$'}</b>
              <strong>+{checkinPoints(dayNo, level.boost)}</strong>
            </li>;
          })}</ol>
          {rewards.checkedInToday
            ? <p className="club__ok">✓ Come back tomorrow!</p>
            : <button type="button" className="club__primary club__wide" onClick={() => void claim()} disabled={busy}>{busy ? 'Checking in…' : `Check in today · +${checkinPoints(nextDay, level.boost)} points`}</button>}
          {note && <p className="acct__note" role="status">{note}</p>}
          <p className="acct__note">{POINTS_PER_BLOCK} points = {money(BLOCK_CENTS)} of balance. Turn them into balance from your <Link to={`${base(dept)}/account`}>dashboard</Link>. Missing a day starts the streak again at day 1.</p>
        </section>
      </>;
    }}
  </ClubShell>;
}

export function InvitePage({ dept }: { dept: Dept }) {
  const { action } = useRewards();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  return <ClubShell dept={dept} kicker="Invitation" title="Invite friends" intro={`Your friend gets ${money(REFERRAL.friendCents)} off a first order of ${money(REFERRAL.minimumCents)} or more. You get ${money(REFERRAL.rewardCents)} when it ships, then credit on every order they place.`}>
    {(rewards) => {
      const link = rewards.referralCode ? `${window.location.origin}${base(dept)}/?ref=${encodeURIComponent(rewards.referralCode)}` : '';
      const copy = (value: string, what: string) => { void navigator.clipboard?.writeText(value).then(() => setCopied(what)).catch(() => undefined); };
      return rewards.referralCode
        ? <section className="acct__card club__invite">
          <span>Your invite code</span>
          <strong>{rewards.referralCode}</strong>
          <div className="club__actions">
            <button type="button" className="club__primary" onClick={() => copy(rewards.referralCode!, 'code')}><Copy size={16} /> {copied === 'code' ? 'Copied' : 'Copy code'}</button>
            <button type="button" className="club__ghost" onClick={() => copy(link, 'link')}><Link2 size={16} /> {copied === 'link' ? 'Copied' : 'Copy link'}</button>
            {typeof navigator !== 'undefined' && 'share' in navigator && <button type="button" className="club__ghost" onClick={() => void navigator.share({ title: 'Davinova', text: `${money(REFERRAL.friendCents)} off your first Davinova order`, url: link }).catch(() => undefined)}><Share2 size={16} /> Share</button>}
          </div>
          <p className="acct__note">{link}</p>
        </section>
        : <button type="button" className="acct__card club__generate" onClick={() => { setBusy(true); void action('invite').finally(() => setBusy(false)); }} disabled={busy}>
          <i>+</i><strong>{busy ? 'Creating…' : 'Generate invite link & code'}</strong>
        </button>;
    }}
  </ClubShell>;
}

function Records({ entries, empty }: { entries: RewardEntry[]; empty: string }) {
  if (!entries.length) return <p className="acct__note club__empty">{empty}</p>;
  return <ul className="club__records">{entries.map((entry, index) => <li key={index}>
    <span>{entry.note}<small>{when(entry.at)}</small></span>
    <strong className={entry.cents < 0 || entry.points < 0 ? 'minus' : ''}>{entry.cents ? `${entry.cents > 0 ? '+' : '−'}${money(Math.abs(entry.cents))}` : `${entry.points > 0 ? '+' : ''}${entry.points} pts`}</strong>
  </li>)}</ul>;
}

export function RatesPage({ dept }: { dept: Dept }) {
  const [tab, setTab] = useState<'friend' | 'order' | 'checkin'>('friend');
  return <ClubShell dept={dept} kicker="Evaluation" title="Your rates" intro="What you earn at your level. Level up to raise them.">
    {(rewards) => {
      const { level } = levelFor(rewards.lifetimePoints);
      return <>
        <section className="acct__card club__rates">
          <div><i><Users size={22} /></i><span><b>Friend commission</b><small>Credit on every shipped order of a friend you invited</small></span><strong>{level.friendPercent}%</strong></div>
          <div><i><Gift size={22} /></i><span><b>Welcome reward</b><small>When a friend's first order ships</small></span><strong>{money(REFERRAL.rewardCents)}</strong></div>
          <div><i><CalendarCheck size={22} /></i><span><b>Check-in boost</b><small>Multiplies your daily check-in points</small></span><strong>×{level.boost}</strong></div>
          <div><i><ShoppingBag size={22} /></i><span><b>Shopping points</b><small>Points for every dollar of your own orders</small></span><strong>{POINTS_PER_DOLLAR}/$</strong></div>
        </section>
        <section className="acct__card">
          <h2>Records</h2>
          <div className="club__chips">{([['friend', 'Friends'], ['order', 'Purchases'], ['checkin', 'Check-ins']] as const).map(([key, label]) => <button key={key} type="button" className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
          <Records entries={rewards.history.filter((entry) => entry.kind === tab)} empty="Nothing here yet." />
        </section>
      </>;
    }}
  </ClubShell>;
}

export function TeamPage({ dept }: { dept: Dept }) {
  return <ClubShell dept={dept} kicker="Team" title="Your team" intro="Friends who used your invite code.">
    {(rewards) => {
      const rate = rewards.friends.joined ? Math.round((rewards.friends.ordered / rewards.friends.joined) * 100) : 0;
      return <section className="acct__card club__team">
        <div className="club__teamhead"><strong>Friends</strong><span>{rate}% ordered</span></div>
        <i style={{ ['--p' as string]: `${rate}%` }} />
        <div className="club__stats">
          <div><span>Used your code</span><strong>{rewards.friends.joined}</strong></div>
          <div><span>Ordered</span><strong>{rewards.friends.ordered}</strong></div>
          <div><span>Earned from friends</span><strong>{money(rewards.earnedCents.friends)}</strong></div>
        </div>
        <Link to={`${base(dept)}/account/invite`} className="club__primary">Invite more friends</Link>
      </section>;
    }}
  </ClubShell>;
}

export function EarningsPage({ dept }: { dept: Dept }) {
  const [period, setPeriod] = useState<'total' | 'today' | 'week' | 'month'>('total');
  return <ClubShell dept={dept} kicker="Earnings" title="Your earnings" intro="Credit you earned from friends and points, and how you spent your balance.">
    {(rewards) => <>
      <section className="club__hero"><span>My earnings</span><strong>{money(rewards.earnedCents[period])}</strong><small>Balance now: {money(rewards.balanceCents)}</small></section>
      <div className="club__chips">{([['total', 'All'], ['today', 'Today'], ['week', 'Week'], ['month', 'Month']] as const).map(([key, label]) => <button key={key} type="button" className={period === key ? 'on' : ''} onClick={() => setPeriod(key)}>{label}</button>)}</div>
      <section className="acct__card">
        <div className="club__stats">
          <div><span>From friends</span><strong>{money(rewards.earnedCents.friends)}</strong></div>
          <div><span>From points</span><strong>{money(rewards.earnedCents.points)}</strong></div>
        </div>
        <h2>History</h2>
        <Records entries={rewards.history} empty="No activity yet. Check in today to start." />
      </section>
    </>}
  </ClubShell>;
}

export function LevelPage({ dept }: { dept: Dept }) {
  return <ClubShell dept={dept} kicker="Level" title="Levels" intro="Earn points with check-ins and orders. Points you turn into balance still count toward your level.">
    {(rewards) => {
      const { level } = levelFor(rewards.lifetimePoints);
      return <section className="acct__card">
        <table className="club__table">
          <thead><tr><th>Level</th><th>Points</th><th>Friends</th><th>Check-in</th></tr></thead>
          <tbody>{LEVELS.map((row, index) => <tr key={row.key} className={row.key === level.key ? 'me' : ''}>
            <td><b>{index + 1}</b> {row.name}{row.key === level.key && <em>You</em>}</td>
            <td>{row.min.toLocaleString()}+</td><td>{row.friendPercent}%</td><td>×{row.boost}</td>
          </tr>)}</tbody>
        </table>
        <p className="acct__note">You have {rewards.lifetimePoints.toLocaleString()} level points.</p>
      </section>;
    }}
  </ClubShell>;
}

export function HowItWorksPage({ dept }: { dept: Dept }) {
  const steps = [
    ['Check in every day', `Tap Check-in once a day. Points grow from ${CHECKIN_POINTS[0]} to ${CHECKIN_POINTS[6]} across 7 days.`],
    ['Turn points into balance', `${POINTS_PER_BLOCK} points = ${money(BLOCK_CENTS)}. Convert them on your dashboard.`],
    ['Recharge your balance', 'Add $25 to $200 by card, then pay with your balance whenever you shop.'],
    ['Invite friends', `Share your code: they get ${money(REFERRAL.friendCents)} off, you get ${money(REFERRAL.rewardCents)} plus credit on every order they place.`],
    ['Level up', 'Points from check-ins and orders raise your level, which raises your rates.'],
    ['Spend it', 'In your bag, tap "Use in bag" from your dashboard or type your balance code.'],
  ];
  return <ClubShell dept={dept} kicker="Tutorial" title="How the Club works" intro="Six steps to get the most from your account.">
    {() => <ol className="club__steps">{steps.map(([title, text], index) => <li key={title} className="acct__card"><b>{index + 1}</b><span><strong>{title}</strong>{text}</span></li>)}</ol>}
  </ClubShell>;
}

export function ClubFaqPage({ dept }: { dept: Dept }) {
  const faq = [
    ['Can I withdraw my balance as cash?', 'No. Balance, points and friend credit are store credit for davinova.com. They never expire and can pay for anything in both shops.'],
    ['When do I get credit for a friend?', `When their order ships: ${money(REFERRAL.rewardCents)} for their first order, then your level's percentage of every later order.`],
    ['I missed a day. What happens?', 'Your streak starts again at day 1. Points you already have stay.'],
    ['How do I pay with my balance?', 'Open your dashboard and tap "Use in bag". The balance is taken off your total at checkout.'],
    ['Is a top-up refundable?', 'If you change your mind about a top-up you have not used, write to us and we refund it to the card you paid with.'],
    ['Do points expire?', 'No, as long as your account is open.'],
  ];
  return <ClubShell dept={dept} kicker="FAQ" title="Club questions" intro="Everything about balance, points and friends.">
    {() => <section className="acct__card club__faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>}
  </ClubShell>;
}
