import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createApiClient} from '../../shared/apiClient';
import {googleAuthorizationUrl} from '../../shared/googleAuthorization';
import type {PeopleSettings, PeopleInvitation} from '../../../../../shared/src/people';
import './people.css';

type Request = ReturnType<typeof createApiClient>;
function PeopleManager({request, invite}: {request: Request; invite: string | null}) {
  const [data, setData] = useState<PeopleSettings | null>(null);
  const [target, setTarget] = useState<{dashboardName: string; expiresAtMs: number} | null>(null);
  const [invitation, setInvitation] = useState<PeopleInvitation | null>(null);
  const [name, setName] = useState(''); const [stepGoal, setStepGoal] = useState(10000); const [distanceGoal, setDistanceGoal] = useState(8);
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
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
