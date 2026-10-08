import {useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {PollDefinition, PollTemplate, PollView} from '../../../../functions/src/utils/polls';
import {parsePollDefinition} from '../../../../functions/src/utils/polls';
import {pollApi} from './pollApi';
import type {PollLibrary, PollRequest, RoundReview, RoundSummary} from './pollApi';
import {PollTemplateEditor} from './PollTemplateEditor';
import {PollTemplateCard} from './PollTemplateCard';
import {PollStartPanel} from './PollStartPanel';
import {PollRoundCard, pollDashboardLink} from './PollRoundCard';
import './polls.css';

function PollManager({request}: {request: PollRequest}) {
  const [library, setLibrary] = useState<PollLibrary>({templates: [], rounds: [], devices: []});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading your polls…');
  const [failed, setFailed] = useState(false);
  const [editor, setEditor] = useState<{template: PollTemplate | null} | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [review, setReview] = useState<RoundReview | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [tab, setTab] = useState<'active' | 'saved' | 'history'>('active');
  const hasLivePolls = library.rounds.some((round) => round.state === 'open');
  const reload = useCallback(async () => {const result = await request<PollLibrary>('polls'); setLibrary(result); setLoaded(true); return result;}, [request]);
  useEffect(() => {let active = true;
    void request<PollLibrary>('polls').then((result) => {if (active) {setLibrary(result); setLoaded(true); setMessage('');}})
      .catch((e) => {if (active) {setMessage(e.message); setFailed(true);}});
    return () => {active = false;};
  }, [request]);
  useEffect(() => {
    if (!loaded || busy || editor || starting !== null || tab !== 'active' || !hasLivePolls) return;
    let active = true; let inFlight = false;
    const timer = setInterval(() => {
      if (document.hidden || inFlight) return; inFlight = true;
      void request<PollLibrary>('polls').then((result) => {if (active) setLibrary(result);})
        .catch(() => {if (active) setMessage('Results could not refresh. Your last results are still shown.');}).finally(() => {inFlight = false;});
    }, 15000);
    return () => {active = false; clearInterval(timer);};
  }, [request, loaded, busy, editor, starting, tab, hasLivePolls]);

  async function action(work: () => Promise<unknown>, success: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setFailed(false); setMessage('Saving…');
    try {
      await work();
      // The mutation succeeded. A failed library refresh must not invite the
      // owner to submit it again or claim that their saved poll was lost.
      try {await reload(); setMessage(success);} catch {setMessage(`${success} Refresh polls to see the latest results.`);}
      return true;
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Could not update your poll. Your saved questions are safe.'); setFailed(true); return false;}
    finally {setBusy(false);}
  }
  const roundAction = (body: Record<string, unknown>, success: string) => action(() => request('polls', 'POST', body), success);
  function newPoll() {setEditor({template: null}); setStarting(null); setCreated(null); setReview(null); setCodes([]);}
  function startPoll(id: string) {setStarting(id); setEditor(null); setCreated(null); setTab('active'); setReview(null);}
  async function save(definition: PollDefinition) {
    const parsed = parsePollDefinition(definition);
    if (!parsed) {setMessage('Enter a question and at least two distinct choices, or use written answers.'); setFailed(true); return;}
    await action(async () => {
      const result = await request<{template: PollTemplate}>('polls', 'POST', {action: 'saveTemplate', ...(editor?.template?.id ? {id: editor.template.id, expectedRevision: editor.template.revision} : {}), definition: parsed});
      setLibrary((current) => ({...current, templates: [...current.templates.filter((t) => t.id !== result.template.id), result.template]}));
      setEditor(null); setStarting(result.template.id); setTab('active');
    }, 'Poll saved. Choose when voting closes, then start.');
  }
  async function start(body: Record<string, unknown>) {
    await action(async () => {
      const result = await request<{round: PollView}>('polls', 'POST', body);
      setCreated(result.round.id); setStarting(null); setTab('active');
      setLibrary((current) => ({...current, rounds: [{...result.round, templateId: String(body.templateId), referenceDeviceId: String(body.referenceDeviceId), linked: true, displayed: false}, ...current.rounds.filter((r) => r.id !== result.round.id)]}));
    }, 'Voting started. Your poll is ready to add to the dashboard.');
  }
  async function reviewRound(roundId: string, after?: string) {
    await action(async () => {setReview(await request<RoundReview>(`polls?roundId=${roundId}${after ? `&after=${after}` : ''}`)); setCodes([]);}, 'Names and written answers are private to you.');
  }
  async function invitations(round: RoundSummary) {
    await action(async () => {const result = await request<{codes: string[]}>('polls', 'POST', {action: 'invitations', roundId: round.id, expectedRevision: round.revision, count: 10}); setCodes(result.codes);}, 'Ten invitations created. Copy them now; each code is shown once.');
  }
  async function exportRound(round: RoundSummary) {
    await action(async () => {
      const rows: string[][] = [['Name', 'Answer', 'Received at (UTC)']]; let after: string | null = null; let revision: number | null = null;
      do {
        const page: RoundReview = await request<RoundReview>(`polls?roundId=${round.id}${after ? `&after=${after}` : ''}`);
        if (revision !== null && revision !== page.revision) throw new Error('Votes changed during export. Refresh and try again, or close voting first.');
        revision = page.revision;
        for (const ballot of page.ballots) rows.push([ballot.name, ballot.answer || page.round.options.find((o) => o.id === ballot.optionId)?.label || '', new Date(ballot.receivedAtMs).toISOString()]);
        after = page.next;
      } while (after);
      const csv = rows.map((row) => row.map((value) => `"${(/^[=+@\-\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'})); const link = document.createElement('a');
      link.href = url; link.download = `poll-${round.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'Private votes exported.');
  }
  const filtered = library.rounds.filter((r) => tab === 'history' ? r.state !== 'open' : r.state === 'open');
  return <div className="poll-manager">
    <div className="poll-page-toolbar"><div className="poll-flow" aria-label="How polls work"><span><b>1</b> Save a question</span><span><b>2</b> Start voting</span><span><b>3</b> Add to dashboard</span></div>{!editor && starting === null && <div className="editor-actions"><button className="button button-text" disabled={busy} onClick={() => void action(reload, 'Polls refreshed.')}>Refresh polls</button><button className="button button-primary" disabled={busy || !loaded} onClick={newPoll}>New poll</button></div>}</div>
    <p className="status" role="status" data-kind={failed ? 'error' : 'success'}>{message}</p>
    {editor && <PollTemplateEditor key={editor.template ? `${editor.template.id}:${editor.template.updatedAtMs}` : 'new'} template={editor.template} busy={busy} onSave={save} onCancel={() => setEditor(null)}/>}
    {starting !== null && <PollStartPanel key={starting} library={library} templateId={starting} busy={busy} onStart={start} onCancel={() => setStarting(null)}/>}
    {created && <section className="poll-ready" aria-label="Poll ready for your TV"><div><p className="field-label">STEP 3 · ON YOUR TV</p><h2>Voting is open. Give it a home.</h2><p>Place the poll on your dashboard, choose its style, then Save to TV.</p></div><a className="button button-primary" href={pollDashboardLink(created)}>Add to dashboard →</a><button className="button button-text" aria-label="Dismiss next step" onClick={() => setCreated(null)}>×</button></section>}
    {!editor && starting === null && <><div className="poll-tabs" role="tablist" aria-label="Poll library" onKeyDown={(e) => {
      if (busy || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      e.preventDefault(); buttons[next].click(); buttons[next].focus();
    }}>{(['active', 'saved', 'history'] as const).map((value) => <button role="tab" key={value} tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} aria-controls="poll-library-panel" id={`poll-tab-${value}`} disabled={busy} onClick={() => {setTab(value); setReview(null);}}>{value === 'active' ? 'Live polls' : value === 'saved' ? 'Saved polls' : 'History'}{value === 'active' ? ` (${library.rounds.filter((r) => r.state === 'open').length})` : ''}</button>)}</div>
    <section id="poll-library-panel" role="tabpanel" aria-labelledby={`poll-tab-${tab}`}>
      {tab === 'saved' ? <div className="poll-library-grid">{library.templates.map((template) => <PollTemplateCard key={template.id} template={template} busy={busy} onStart={() => startPoll(template.id)} onEdit={() => setEditor({template})} onDuplicate={() => setEditor({template: {...template, id: '', revision: 0}})} onDelete={() => void roundAction({action: 'deleteTemplate', id: template.id, expectedRevision: template.revision}, 'Saved poll deleted.')}/>)}</div> : <div className="poll-round-grid">{filtered.map((round) => <PollRoundCard key={round.id} round={round} busy={busy} onAction={roundAction} onReview={() => void reviewRound(round.id)} onExport={() => void exportRound(round)} onInvitations={() => void invitations(round)}/>)}</div>}
      {loaded && (tab === 'saved' ? !library.templates.length : !filtered.length) && !editor && starting === null && <div className="poll-empty"><span className="poll-empty-icon" aria-hidden="true">◷</span><h2>{tab === 'history' ? 'A place for past decisions' : tab === 'saved' ? 'Your questions, ready to reuse' : 'Bring everyone into the conversation'}</h2><p>{tab === 'history' ? 'Closed polls and their results will appear here.' : library.templates.length ? 'Start a saved poll to open voting with fresh results.' : 'Create a question once. Use it again whenever you need a fresh vote.'}</p>{tab !== 'history' && <button className="button button-primary" disabled={busy} onClick={() => library.templates.length ? startPoll(library.templates[0].id) : newPoll()}>{library.templates.length ? 'Start a saved poll' : 'Create your first poll'}</button>}</div>}
    </section></>}
    {!!codes.length && <section className="poll-panel"><h2>One-use invitations</h2><textarea readOnly rows={10} value={codes.join('\n')} aria-label="Invitation codes"/><p className="field-hint">Give each participant one code. Copy these before leaving; they are only shown once.</p><button className="button button-text" onClick={() => setCodes([])}>Done</button></section>}
    {review && <section className="poll-panel"><div className="poll-section-heading"><h2>Private vote review · {review.round.question}</h2><button className="button button-text" onClick={() => setReview(null)}>Close review</button></div><p className="field-hint">Names stay off the TV and participant results. Up to 100 ballots per page.</p><div className="poll-ballots">{review.ballots.map((b) => <p key={b.id}><strong>{b.name}</strong> · {b.answer || review.round.options.find((o) => o.id === b.optionId)?.label || 'Answer unavailable'}</p>)}</div>{review.next && <button disabled={busy} onClick={() => void reviewRound(review.round.id, review.next!)}>Next ballots</button>}{review.answers.map((answer) => <article key={answer.id} className="poll-saved"><p>{answer.label} · {answer.count} votes · {answer.status}</p><div className="editor-actions">{(['approved', 'rejected'] as const).map((status) => <button key={status} disabled={busy || answer.status === status} onClick={() => void action(async () => {await request('polls', 'POST', {action: 'moderate', roundId: review.round.id, expectedRevision: review.revision, answerId: answer.id, status}); setReview(await request<RoundReview>(`polls?roundId=${review.round.id}`));}, 'Answer display updated. The ballot still counts.')}>{status === 'approved' ? 'Approve' : 'Hide'}</button>)}</div></article>)}</section>}
  </div>;
}
export function createPollManager(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>) {
  const reactRoot = createRoot(root); let generation = 0;
  return {async load() {const current = ++generation; const request = pollApi(apiUrl, async () => {const token = await getToken(); if (current !== generation) throw new Error('Account changed.'); return token;}); reactRoot.render(<PollManager key={current} request={request}/>);}, clear() {generation++; reactRoot.render(null);}};
}
