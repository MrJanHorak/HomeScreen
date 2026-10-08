import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {readJsonResponse} from '../../../../../shared/src/http';
import {HttpRequestError} from '../../../../../shared/src/http';
import type {PollView} from '../../../../functions/src/utils/polls';
import {PollResults, closingLabel} from './PollResults';
import './polls.css';

interface GuestData {poll: PollView; receipt: {requestId: string; receivedAtMs: number} | null; csrf: string; serverNowMs: number}
function PollParticipant({token}: {token: string}) {
  const [data, setData] = useState<GuestData | null>(null); const [error, setError] = useState('');
  const [name, setName] = useState(''); const [choice, setChoice] = useState(''); const [answer, setAnswer] = useState('');
  const [invitation, setInvitation] = useState(''); const [busy, setBusy] = useState(false); const [uncertain, setUncertain] = useState(false);
  const [clock, setClock] = useState(Date.now()); const requestId = useRef(''); const stopped = useRef(false);
  useEffect(() => {
    stopped.current = false;
    try {requestId.current = sessionStorage.getItem(`poll-request:${token}`) || crypto.randomUUID().replaceAll('-', ''); sessionStorage.setItem(`poll-request:${token}`, requestId.current);} catch {requestId.current = crypto.randomUUID().replaceAll('-', '');}
    let timer: ReturnType<typeof setTimeout>; let pending = false; let terminal = false; let controller: AbortController | undefined;
    async function refresh() {
      if (stopped.current || pending) return;
      if (document.hidden) {timer = setTimeout(() => void refresh(), 3000); return;}
      pending = true; controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(`/api/pollParticipant/read?token=${encodeURIComponent(token)}`, {credentials: 'same-origin', signal: controller.signal, redirect: 'error'});
        const next = await readJsonResponse<GuestData>(response, 'This poll is unavailable.');
        if (!stopped.current) {setData(next); setClock(next.serverNowMs); setError(''); if (next.receipt) setUncertain(false);}
      } catch (e) {if (!stopped.current) {setError(e instanceof Error ? e.message : 'Could not load the poll.');
        if (e instanceof HttpRequestError && [404, 410].includes(e.status)) {terminal = true; setData(null);}}}
      finally {clearTimeout(timeout); pending = false; if (!stopped.current && !terminal) timer = setTimeout(() => void refresh(), 3000);}
    }
    void refresh(); const tick = setInterval(() => setClock((now) => now + 1000), 1000);
    const resume = () => {clearTimeout(timer); if (!terminal) void refresh();}; document.addEventListener('visibilitychange', resume);
    return () => {stopped.current = true; clearTimeout(timer); clearInterval(tick); controller?.abort(); document.removeEventListener('visibilitychange', resume);};
  }, [token]);
  const poll = data?.poll; const closed = poll && (poll.state !== 'open' || poll.endsAtMs !== null && clock >= poll.endsAtMs);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data || busy || closed || data.receipt) return;
    setBusy(true); setError(''); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/pollParticipant/vote', {method: 'POST', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
        headers: {'Content-Type': 'application/json', 'X-Poll-CSRF': data.csrf},
        body: JSON.stringify({token, requestId: requestId.current, name, optionId: choice && choice !== 'other' ? choice : null,
          answer: poll?.answerMode === 'written' || choice === 'other' ? answer : '', invitation})});
      const result = await readJsonResponse<{receipt: GuestData['receipt']}>(response, 'Could not confirm your vote.');
      if (!stopped.current) {setData((previous) => previous ? {...previous, receipt: result.receipt} : previous); setUncertain(false);}
    } catch (e) {if (!stopped.current) {setError(e instanceof Error ? e.message : 'Could not confirm your vote.'); setUncertain(true);}}
    finally {clearTimeout(timeout); if (!stopped.current) setBusy(false);}
  }
  return <main className="poll-participant"><div className="poll-guest-card">
    <div className="poll-brand">HomeScreen <span>HOUSEHOLD POLL</span></div>
    {!poll ? <><h1>{error ? 'Poll unavailable' : 'Loading your poll…'}</h1><p role="status">{error || 'One moment.'}</p></> : <>
      <h1>{poll.question}</h1>{poll.description && <p className="poll-description">{poll.description}</p>}
      <p className="field-hint">{closed ? 'Voting closed' : closingLabel(poll)}</p>
      {data?.receipt ? <div className="poll-receipt" role="status"><strong>Your vote is recorded.</strong><p>Thank you for joining. You have already voted in this round.</p></div> : closed ?
        <p className="poll-receipt">This round has ended. New votes are no longer accepted.</p> : <form onSubmit={submit}>
        <fieldset disabled={busy} className="poll-form-fields">
          <label>Your name<input autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Enter your name"/></label>
          {poll.answerMode !== 'written' && <fieldset className="poll-choices"><legend>Choose one answer</legend>
            {poll.options.map((o) => <label key={o.id} className={`poll-choice ${choice === o.id ? 'selected' : ''}`}><input type="radio" name="vote" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} required/><span>{o.label}</span></label>)}
            {poll.answerMode === 'mixed' && <label className={`poll-choice ${choice === 'other' ? 'selected' : ''}`}><input type="radio" name="vote" checked={choice === 'other'} onChange={() => setChoice('other')} required/><span>Other · write an answer</span></label>}
          </fieldset>}
          {(poll.answerMode === 'written' || choice === 'other') && <label>Your answer<textarea value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={160} required rows={3}/></label>}
          {poll.protection === 'invitation' && <label>One-use invitation code<input value={invitation} onChange={(e) => setInvitation(e.target.value)} required maxLength={16} autoComplete="off" spellCheck={false}/></label>}
          <button className="button button-primary" type="submit">{busy ? 'Recording vote…' : uncertain ? 'Check / retry my vote' : 'Vote'}</button>
        </fieldset><p className="field-hint">Your name is visible to the poll owner. One vote per {poll.protection === 'invitation' ? 'invitation' : 'browser'} in this round.</p>
      </form>}
      {error && <p className="status" data-kind="error" role="alert">{error}{uncertain ? ' Retrying will not record a second ballot.' : ''}</p>}
      <PollResults poll={poll}/>
    </>}
  </div></main>;
}
export function mountPollParticipant(root: HTMLElement, token: string) {
  document.title = 'Vote · HomeScreen';
  createRoot(root).render(<PollParticipant token={token}/>);
}
