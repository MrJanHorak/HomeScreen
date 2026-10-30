import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createApiClient} from '../../shared/apiClient';
import {googleAuthorizationUrl} from '../../shared/googleAuthorization';
import type {PeopleSettings, PeopleInvitation} from '../../../../../shared/src/people';
import './people.css';

type Request = ReturnType<typeof createApiClient>;
type HealthTestResult = {status: 'ok'; refreshVerified?: boolean; coverage: Record<string, {available: number; missing: number; unavailable: number; today: string}>} |
  {status: 'not_connected' | 'reconnect' | 'unavailable'};
type Difference = {status: 'compared'; percent: number} | {status: 'health_missing' | 'health_unavailable' | 'fit_zero_or_missing' | 'fit_missing'};
type HealthComparison = {status: 'ok'; days: {date: string; steps: Difference; distance: Difference; calories: Difference; googleCalories: Difference; wearableCalories: Difference}[]} |
  {status: 'fit_not_connected' | 'health_not_connected' | 'fit_unavailable' | 'health_reconnect' | 'health_unavailable'};
type SourceDifference = {status: 'compared'; percent: number} | {status: 'missing' | 'unavailable' | 'baseline_missing' | 'baseline_unavailable' | 'baseline_zero'};
type CalorieSources = {status: 'ok'; days: {date: string; google: SourceDifference; wearables: SourceDifference}[]} |
  {status: 'not_connected' | 'reconnect' | 'unavailable'};
function sourceDifferenceText(value: SourceDifference): string {
  if (value.status === 'compared') return `${value.percent > 0 ? '+' : ''}${value.percent}%`;
  return value.status.replaceAll('_', ' ');
}
function differenceText(value: Difference): string {
  if (value.status === 'compared') return `${value.percent > 0 ? '+' : ''}${value.percent}%`;
  if (value.status === 'fit_zero_or_missing') return 'Fit zero or missing';
  if (value.status === 'fit_missing') return 'Fit unavailable';
  return value.status === 'health_missing' ? 'Health missing' : 'Health unavailable';
}
function PeopleManager({request, invite}: {request: Request; invite: string | null}) {
  const [data, setData] = useState<PeopleSettings | null>(null);
  const [target, setTarget] = useState<{dashboardName: string; expiresAtMs: number} | null>(null);
  const [invitation, setInvitation] = useState<PeopleInvitation | null>(null);
  const [name, setName] = useState(''); const [stepGoal, setStepGoal] = useState(10000); const [distanceGoal, setDistanceGoal] = useState(8);
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [healthConsent, setHealthConsent] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthTestResult | null>(null);
  const [comparison, setComparison] = useState<HealthComparison | null>(null);
  const [calorieSources, setCalorieSources] = useState<CalorieSources | null>(null);
  const [confirm, setConfirm] = useState('');
  const mounted = useRef(true);
  async function load() {
    const next = await request<PeopleSettings>('people');
    if (!mounted.current) return;
    setData(next); setName(next.connection?.name || ''); setStepGoal(next.connection?.stepGoal || 10000); setDistanceGoal(next.connection?.distanceGoal || 8);
    if (invite) {
      const preview = await request<{dashboardName: string; expiresAtMs: number}>(`people?invite=${encodeURIComponent(invite)}`);
      if (mounted.current) setTarget(preview);
    }
  }
  useEffect(() => {mounted.current = true; void load().catch((e) => {if (mounted.current) setMessage(e.message);});
    return () => {mounted.current = false;};}, [request]);
  useEffect(() => {
    const expiry = invitation?.expiresAtMs || target?.expiresAtMs;
    if (!expiry) return;
    const timer = setTimeout(() => {setInvitation(null); setTarget(null); setConsent(false); setMessage('Invitation expired. Ask for or create a new invitation.');}, Math.max(0, expiry - Date.now()));
    return () => clearTimeout(timer);
  }, [invitation, target]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try {await action();} catch (error) {if (mounted.current) setMessage(error instanceof Error ? error.message : 'Could not update people.');}
    finally {if (mounted.current) setBusy(false);}
  }
  const profile = {name: name.trim(), stepGoal, distanceGoal, consent, ...(invite ? {invite} : {})};
  const connect = () => void run(async () => {
    const result = await request('beginGoogleActivity', 'POST', profile);
    if (mounted.current) window.location.assign(googleAuthorizationUrl(result, 'Could not start activity consent.'));
  });
  const ConnectionPanel = invite ? 'section' : 'details';
  return <div className="people-manager">
    <p className="field-hint">Sign in with your own Google account to share or stop sharing your activity. The dashboard owner keeps control of its layout.</p>
    {invite && <section className="people-panel">
      <h2>{target ? `Share with ${target.dashboardName}` : 'Activity invitation'}</h2>
      <p>{target ? 'Your name, steps, distance, calories, move minutes, goals, and seven-day activity history will be visible on every TV linked to this dashboard, including to anyone watching the screen.' : 'Sign in to review this invitation. If you are already signed in, check the message below.'}</p>
      {target && <p className="field-hint">This invitation expires at {new Date(target.expiresAtMs).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}. You can stop sharing from this page later.</p>}
    </section>}
    {data && (!invite || target) && <ConnectionPanel className="people-panel">
      {invite ? <h2>Your activity on this dashboard</h2> : <summary>Your activity connection and goals</summary>}
      <form onSubmit={(e) => {e.preventDefault(); connect();}}>
        <fieldset disabled={busy}><div className="people-fields">
          <label>Name on the dashboard<input required maxLength={40} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)}/></label>
          <label>Daily step goal<input required type="number" min={100} max={100000} step={1} value={stepGoal} onChange={(e) => setStepGoal(Number(e.target.value))}/></label>
          <label>Daily distance goal (km)<input required type="number" min={.1} max={200} step={.1} value={distanceGoal} onChange={(e) => setDistanceGoal(Number(e.target.value))}/></label>
        </div>
        <label className="people-consent"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)}/>
          {invite ? 'I agree to share this activity on the dashboard and its linked TVs.' : 'I agree to connect my activity for the dashboards I choose to share with.'}</label>
        <p className="field-hint">Google will ask for activity access. Calendar, Tasks, and Photos permissions are not required to join.</p>
        <button className="button button-primary" type="submit" disabled={!consent || !name.trim()}>{invite ? 'Approve sharing & connect activity' : data.connection?.connected ? 'Reconnect activity' : 'Connect activity'}</button>
        </fieldset>
      </form>
      {!invite && data.connection?.connected && <div className="people-actions">
        <button className="button button-secondary" disabled={busy} onClick={() => void run(async () => {await request('people', 'POST', {action: 'goals', stepGoal, distanceGoal}); await load(); setMessage('Activity goals saved.');})}>Save goals</button>
        <button className="button button-text" disabled={busy} onClick={() => {
          if (confirm !== 'disconnect') {setConfirm('disconnect'); return;}
          void run(async () => {await request('people', 'POST', {action: 'disconnect'}); await load(); setConfirm(''); setMessage('Activity disconnected and all your activity sharing stopped.');});
        }}>{confirm === 'disconnect' ? 'Confirm disconnect & stop all sharing' : 'Disconnect activity'}</button>
      </div>}
    </ConnectionPanel>}
    {!invite && data && <>
      {(data.healthTest?.available || data.healthTest?.connected) && <section className="people-panel">
        <h2>Google Health test connection</h2>
        <p>Connect your own Google Health account for testing. Your dashboard and shared activity will continue to use Google Fit.</p>
        <p className="field-hint">{data.healthTest.connected ? 'A test connection is saved.' : 'No test connection is saved.'} Google Health must already be linked to your Google account.</p>
        {data.healthTest.available && <form onSubmit={(e) => {e.preventDefault(); void run(async () => {
          const result = await request('beginGoogleHealth', 'POST', {consent: healthConsent});
          if (mounted.current) window.location.assign(googleAuthorizationUrl(result, 'Could not start Google Health consent.'));
        });}}>
          <label className="people-consent"><input type="checkbox" required checked={healthConsent} onChange={(e) => setHealthConsent(e.target.checked)}/>
            I agree to connect my Google Health activity data for testing.</label>
          <button className="button button-primary" type="submit" disabled={busy || !healthConsent}>{data.healthTest.connected ? 'Reconnect Google Health test' : 'Connect Google Health test'}</button>
        </form>}
        {data.healthTest.available && data.healthTest.connected && <div className="people-actions">{[false, true].map((forceRefresh) => <button key={String(forceRefresh)} className="button button-secondary" disabled={busy} onClick={() => void run(async () => {
          setHealthResult(null);
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const result = await request<HealthTestResult>('googleHealthTest', 'POST', {timeZone, forceRefresh});
          if (mounted.current) setHealthResult(result);
        })}>{forceRefresh ? 'Check token refresh' : 'Check test data'}</button>)}</div>}
        {healthResult?.status === 'ok' && <div role="status"><p>Coverage for seven days, including today. No activity values are shown.</p>
          {healthResult.refreshVerified !== undefined && <p>{healthResult.refreshVerified ? 'Token refresh succeeded.' : 'Token refresh could not be verified. Try again later.'}</p>}
          {([['steps', 'Steps'], ['distanceKm', 'Distance'], ['calories', 'Calories'], ['activeMinutesByLevel', 'Activity levels']] as const).map(([key, label]) => {
            const value = healthResult.coverage[key];
            return <p key={key}>{label}: {value.available} days with data, {value.missing} missing, {value.unavailable} unavailable. Today: {value.today}.</p>;
          })}</div>}
        {healthResult?.status === 'reconnect' && <p role="status">Google Health access has expired or was revoked. Reconnect the test account.</p>}
        {healthResult?.status === 'not_connected' && <p role="status">No Google Health test connection is saved. Connect it first.</p>}
        {healthResult?.status === 'unavailable' && <p role="status">Google Health could not be checked right now. Try again later.</p>}
        {data.healthTest.available && data.healthTest.connected && <button className="button button-secondary" disabled={busy} onClick={() => void run(async () => {
          setComparison(null);
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const result = await request<HealthComparison>('googleHealthComparison', 'POST', {timeZone});
          if (mounted.current) setComparison(result);
        })}>Compare completed days with Fit</button>}
        {comparison?.status === 'ok' && <div role="status"><p>Health compared with Fit for completed days: positive means Health is higher. Percentages are shown without raw activity values.</p>
          <p className="field-hint">Fit can report zero when data is missing. Distance is rounded in Fit; calories and activity sources can differ. Travel and time-zone changes may affect day boundaries.</p>
          {comparison.days.map((day) => <div key={day.date}><p>{day.date}: Steps {differenceText(day.steps)}; distance {differenceText(day.distance)}; all-source calories {differenceText(day.calories)}.</p>
            <p>Google-source calories {differenceText(day.googleCalories)}; wearable calories {differenceText(day.wearableCalories)}.</p></div>)}
          <p className="field-hint">Each Health source group is reconciled separately and compared with the same Fit total. Matching percentages don’t prove matching records.</p>
          <p className="field-hint">Activity levels are not compared with Fit Move Minutes because their meanings are not yet established.</p></div>}
        {comparison && comparison.status !== 'ok' && <p role="status">The comparison could not run ({comparison.status.replaceAll('_', ' ')}). Check both account connections and try again.</p>}
        {data.healthTest.available && data.healthTest.connected && <button className="button button-secondary" disabled={busy} onClick={() => void run(async () => {
          setCalorieSources(null);
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const result = await request<CalorieSources>('googleHealthCalorieSources', 'POST', {timeZone});
          if (mounted.current) setCalorieSources(result);
        })}>Compare Health calorie sources</button>}
        {calorieSources?.status === 'ok' && <div role="status"><p>Health calorie source groups compared with Health’s all-sources total for completed days. A negative percentage means the filtered group is lower.</p>
          <p className="field-hint">Google sources can include wearables, Health Connect and manual entries. Wearables excludes phone and manual data. Empty or unavailable results do not prove the cause of the Fit difference; source groups are reconciled separately and should not be added together.</p>
          {calorieSources.days.map((day) => <p key={day.date}>{day.date}: Google sources {sourceDifferenceText(day.google)}; wearables {sourceDifferenceText(day.wearables)}.</p>)}</div>}
        {calorieSources && calorieSources.status !== 'ok' && <p role="status">The source comparison could not run ({calorieSources.status.replaceAll('_', ' ')}). Check the test connection and try again.</p>}
        {data.healthTest.connected && <button className="button button-text" disabled={busy} onClick={() => {
          if (confirm !== 'disconnect-health') {setConfirm('disconnect-health'); return;}
          void run(async () => {await request('people', 'POST', {action: 'disconnectHealthTest'}); await load(); setConfirm(''); setHealthConsent(false); setHealthResult(null); setComparison(null); setCalorieSources(null); setMessage('Google Health test connection removed.');});
        }}>{confirm === 'disconnect-health' ? 'Confirm remove Google Health test' : 'Remove Google Health test connection'}</button>}
      </section>}
      <section className="people-panel"><h2>People on your dashboard</h2><p>Add a roommate, partner, or family member. Each person connects their own account. Joining makes their activity widget available in Dashboard Studio.</p>
        <button className="button button-primary" disabled={busy} onClick={() => void run(async () => {
          if (invitation) await request('people', 'POST', {action: 'cancelInvitation', id: invitation.id});
          const next = await request<PeopleInvitation>('people', 'POST', {action: 'invite'});
          if (mounted.current) setInvitation(next);
        })}>Add person</button>
        {invitation && <div className="people-invitation"><label>Send this invitation to one person<input readOnly value={invitation.url} onFocus={(e) => e.currentTarget.select()}/></label>
          <p className="field-hint">Anyone with this link can accept it. It expires at {new Date(invitation.expiresAtMs).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.</p>
          <div className="people-actions"><button className="button button-secondary" onClick={() => void run(async () => {await navigator.clipboard.writeText(invitation.url); setMessage('Invitation copied.');})}>Copy invitation</button>
            <button className="button button-text" disabled={busy} onClick={() => void run(async () => {await request('people', 'POST', {action: 'cancelInvitation', id: invitation.id}); setInvitation(null);})}>Cancel invitation</button></div>
        </div>}
        {!data.people.length && <p className="field-hint">No other people are sharing activity yet.</p>}
        {data.people.map((person) => <article className="people-row" key={person.id}><div><h3>{person.name}</h3><a href="/dashboard">Add or arrange their activity widget →</a></div>
          <button className="button button-text" disabled={busy} onClick={() => {
            if (confirm !== person.id) {setConfirm(person.id); return;}
            void run(async () => {await request('people', 'POST', {action: 'remove', id: person.id}); await load(); setConfirm(''); setMessage('Person removed. Their shared activity clears from updated TVs within 45 seconds.');});
          }}>{confirm === person.id ? 'Confirm removal' : 'Remove person'}</button>
        </article>)}
        <button className="button button-secondary" disabled={busy} onClick={() => void run(load)}>Refresh people</button>
      </section>
      <section className="people-panel"><h2>Where you share activity</h2><p>Stopping sharing removes your activity from that dashboard. Your other connections stay available.</p>
        {!data.sharing.length && <p className="field-hint">You are not sharing activity with another dashboard.</p>}
        {data.sharing.map((share) => <article className="people-row" key={share.id}><div><h3>{share.dashboardName}</h3><p>Shown as {share.name}</p></div>
          <button className="button button-secondary" disabled={busy} onClick={() => void run(async () => {await request('people', 'POST', {action: 'remove', id: share.id}); await load(); setMessage('Sharing stopped. Your activity clears from updated TVs within 45 seconds.');})}>Stop sharing</button>
        </article>)}
      </section>
    </>}
    {confirm && <button className="button button-text" disabled={busy} onClick={() => setConfirm('')}>Cancel removal</button>}
    <p className="status" role="status" aria-live="polite">{message}</p>
    <p className="field-hint">Activity currently connects through Google Fit. Available metrics depend on the connected account and device.</p>
  </div>;
}

export function createPeopleManager(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>, params: URLSearchParams) {
  root.innerHTML = '<p class="field-hint">Sign in to manage People or review your activity invitation.</p>';
  const reactRoot = createRoot(root); let generation = 0;
  const request = createApiClient(apiUrl, getToken, {signIn: 'Sign in with your own Google account.', failure: 'Could not update activity sharing.'});
  return {load() {reactRoot.render(<PeopleManager key={generation} request={request} invite={params.get('invite')}/>);},
    clear() {generation++; reactRoot.render(<p className="field-hint">Sign in to manage People or review your activity invitation.</p>);}};
}
