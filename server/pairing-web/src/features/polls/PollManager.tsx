import {useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {PollDefinition, PollTemplate} from '../../../../functions/src/utils/polls';
import {parsePollDefinition} from '../../../../functions/src/utils/polls';
import {pollApi} from './pollApi';
import type {PollLibrary, PollRequest, RoundReview, RoundSummary} from './pollApi';
import {PollResults, closingLabel} from './PollResults';
import './polls.css';

const empty: PollDefinition = {question: '', description: '', answerMode: 'choices', options: [{id: 'a', label: ''}, {id: 'b', label: ''}], resultsVisibility: 'after-vote', protection: 'browser', moderate: true, defaultDurationMinutes: 60};
function PollManager({request}: {request: PollRequest}) {
  const [library, setLibrary] = useState<PollLibrary>({templates: [], rounds: [], devices: []});
  const [draft, setDraft] = useState<PollDefinition>(structuredClone(empty)); const [editing, setEditing] = useState<PollTemplate | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('Loading your polls…'); const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(''); const [device, setDevice] = useState(''); const [endsLocal, setEndsLocal] = useState('');
  const [clientTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [review, setReview] = useState<RoundReview | null>(null); const [codes, setCodes] = useState<string[]>([]); const [tab, setTab] = useState<'active' | 'saved' | 'history'>('active');
  const reload = useCallback(async () => {const result = await request<PollLibrary>('polls'); setLibrary(result);
    setSelected((current) => current || result.templates[0]?.id || ''); setDevice((current) => current || result.devices[0]?.id || ''); return result;}, [request]);
  useEffect(() => {let active = true;
    void request<PollLibrary>('polls').then((result) => {if (active) {setLibrary(result); setSelected(result.templates[0]?.id || ''); setDevice(result.devices[0]?.id || ''); setMessage('');}})
      .catch((e) => {if (active) {setMessage(e.message); setFailed(true);}});
    return () => {active = false;};
  }, [request]);
  async function action(work: () => Promise<unknown>, success: string) {
    if (busy) return; setBusy(true); setFailed(false); setMessage('Saving…');
    try {await work(); await reload(); setMessage(success);} catch (e) {setMessage(e instanceof Error ? e.message : 'Could not update poll'); setFailed(true);} finally {setBusy(false);}
  }
  function edit(template: PollTemplate, duplicate = false) {setEditing(duplicate ? null : template); setDraft({...template, options: template.options.map((o) => ({...o}))}); setTab('saved');}
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const definition = parsePollDefinition(draft);
    if (!definition) {setMessage('Enter a question and at least two distinct choices, or use written answers.'); setFailed(true); return;}
    await action(async () => {const result = await request<{template: PollTemplate}>('polls', 'POST', {action: 'saveTemplate', ...(editing ? {id: editing.id, expectedRevision: editing.revision} : {}), definition});
      setEditing(result.template); setSelected(result.template.id);}, 'Saved poll. Start a fresh round whenever you need it.');
  }
  async function reviewRound(round: RoundSummary, after?: string) {
    await action(async () => {const result = await request<RoundReview>(`polls?roundId=${round.id}${after ? `&after=${after}` : ''}`); setReview(result); setCodes([]);}, 'Names and written answers are private to you.');
  }
  async function exportRound(round: RoundSummary) {
    await action(async () => {
      const rows: string[][] = [['Name', 'Answer', 'Received at (UTC)']]; let after: string | null = null; let revision: number | null = null;
      do {
        const page: RoundReview = await request<RoundReview>(`polls?roundId=${round.id}${after ? `&after=${after}` : ''}`);
        if (revision !== null && revision !== page.revision) throw new Error('Votes changed during export. Refresh and try again, or close the round first.');
        revision = page.revision;
        for (const ballot of page.ballots) rows.push([ballot.name, ballot.answer || page.round.options.find((o) => o.id === ballot.optionId)?.label || '', new Date(ballot.receivedAtMs).toISOString()]);
        after = page.next;
      } while (after);
      const csv = rows.map((row) => row.map((value) => `"${(/^[=+@\-\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'})); const link = document.createElement('a');
      link.href = url; link.download = `poll-${round.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'Exported private ballots. Keep the downloaded file private.');
  }
  const selectedDevice = library.devices.find((d) => d.id === device);
  const filtered = library.rounds.filter((r) => tab === 'history' ? r.state !== 'open' : r.state === 'open');
  return <div className="poll-manager">
    <div className="poll-tabs" role="tablist" aria-label="Poll library">{(['active', 'saved', 'history'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === 'active' ? 'Active rounds' : t === 'saved' ? 'Saved polls' : 'History'}</button>)}</div>
    <p className="status" role="status" data-kind={failed ? 'error' : 'success'}>{message}</p>
    <button className="button button-text" disabled={busy} onClick={() => void action(reload, 'Polls refreshed.')}>Refresh polls</button>
    {tab === 'saved' && <div className="poll-owner-grid">
      <section className="poll-panel"><h2>{editing ? 'Edit saved poll' : 'Create a reusable poll'}</h2>
        <form onSubmit={save}><fieldset disabled={busy} className="poll-form-fields">
          <label>Question<input value={draft.question} onChange={(e) => setDraft({...draft, question: e.target.value})} maxLength={160} required placeholder="What should we watch Friday?"/></label>
          <label>Description <span className="field-hint">Optional</span><textarea value={draft.description} onChange={(e) => setDraft({...draft, description: e.target.value})} maxLength={500} rows={2}/></label>
          <label>Answer type<select value={draft.answerMode} onChange={(e) => setDraft({...draft, answerMode: e.target.value as PollDefinition['answerMode'], options: e.target.value === 'written' ? [] : draft.options.length ? draft.options : structuredClone(empty.options)})}>
            <option value="choices">Choose one option</option><option value="mixed">Choose an option or write another</option><option value="written">Write an answer</option></select></label>
          {draft.options.map((o, index) => <div className="poll-option-editor" key={o.id}><label>Choice {index + 1}<input required value={o.label} maxLength={80} onChange={(e) => setDraft({...draft, options: draft.options.map((v) => v.id === o.id ? {...v, label: e.target.value} : v)})}/></label>
            <button type="button" aria-label={`Move choice ${index + 1} up`} disabled={!index} onClick={() => {const options = [...draft.options]; [options[index - 1], options[index]] = [options[index], options[index - 1]]; setDraft({...draft, options});}}>↑</button>
            <button type="button" aria-label={`Remove choice ${index + 1}`} disabled={draft.options.length <= 2} onClick={() => setDraft({...draft, options: draft.options.filter((v) => v.id !== o.id)})}>×</button></div>)}
          {draft.answerMode !== 'written' && <button type="button" className="button button-secondary" disabled={draft.options.length >= 12} onClick={() => setDraft({...draft, options: [...draft.options, {id: crypto.randomUUID(), label: ''}]})}>Add choice</button>}
          <details><summary>Participation, results, and closing defaults</summary><div className="poll-form-fields">
            <label>Voting protection<select value={draft.protection} onChange={(e) => setDraft({...draft, protection: e.target.value as PollDefinition['protection']})}><option value="browser">One vote per browser</option><option value="invitation">One-use invitation codes</option></select></label>
            <p className="field-hint">Browser protection stops ordinary repeat votes. Clearing cookies or using another browser can bypass it. Invitations work across devices; give each person one code.</p>
            <label>Reveal results<select value={draft.resultsVisibility} onChange={(e) => setDraft({...draft, resultsVisibility: e.target.value as PollDefinition['resultsVisibility']})}><option value="live">Live, for everyone</option><option value="after-vote">TV live · phone after voting</option><option value="closed">When voting closes</option></select></label>
            <label className="poll-checkbox"><input type="checkbox" checked={draft.moderate} onChange={(e) => setDraft({...draft, moderate: e.target.checked})}/>Approve written answers before public display</label>
            <label>Default duration in minutes<input type="number" min={1} max={525600} value={draft.defaultDurationMinutes ?? ''} placeholder="No deadline" onChange={(e) => setDraft({...draft, defaultDurationMinutes: e.target.value ? Number(e.target.value) : null})}/></label>
          </div></details>
          <div className="editor-actions"><button className="button button-primary" type="submit">Save poll</button><button type="button" className="button button-text" onClick={() => {setEditing(null); setDraft(structuredClone(empty));}}>New poll</button></div>
          <p className="field-hint">Saving a template leaves every existing voting round unchanged.</p>
        </fieldset></form>
      </section>
      <section className="poll-panel"><h2>Saved polls</h2>{!library.templates.length && <p>Create your first poll to reuse it later.</p>}
        {library.templates.map((t) => <article key={t.id} className="poll-saved"><h3>{t.question}</h3><p className="field-hint">{t.answerMode === 'written' ? 'Written answers' : `${t.options.length} choices`} · Revision {t.revision}</p>
          <div className="editor-actions"><button disabled={busy} onClick={() => edit(t)}>Edit</button><button disabled={busy} onClick={() => edit(t, true)}>Duplicate</button><button disabled={busy} onClick={() => {setSelected(t.id); setTab('active');}}>Use poll</button><button disabled={busy} onClick={() => void action(() => request('polls', 'POST', {action: 'deleteTemplate', id: t.id, expectedRevision: t.revision}), 'Saved poll removed. Its voting history remains.')}>Delete</button></div></article>)}
      </section>
    </div>}
    {tab !== 'saved' && <>
      {tab === 'active' && <section className="poll-panel"><h2>Start a fresh round</h2><fieldset disabled={busy} className="poll-start-grid">
        <label>Saved poll<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a poll</option>{library.templates.map((t) => <option key={t.id} value={t.id}>{t.question}</option>)}</select></label>
        <label>Reference TV<select value={device} onChange={(e) => setDevice(e.target.value)}><option value="">Choose your TV</option>{library.devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Closing date and time <span className="field-hint">Optional override</span><input type="datetime-local" value={endsLocal} onChange={(e) => setEndsLocal(e.target.value)} aria-describedby="poll-closing-clock"/></label>
        <p id="poll-closing-clock" className="field-hint">{selectedDevice?.timeZone ? `Uses ${selectedDevice.name}'s local time (${selectedDevice.timeZone}), detected automatically.` : `Until your TV connects, a specific closing date uses this device's local time (${clientTimeZone}). Saved durations work in any timezone.`}</p>
        <p className="field-hint">Blank uses the poll's default duration. Voting closes on time even when your TV is asleep. All your synced TVs share this round. {selectedDevice && !selectedDevice.pollCapable ? 'Update and open this TV to enable poll widgets.' : ''}</p>
        <button className="button button-primary" disabled={!selected || !device} onClick={() => void action(() => request('polls', 'POST', {action: 'startRound', templateId: selected, referenceDeviceId: device, clientTimeZone, deadlineTimeZone: selectedDevice?.timeZone || clientTimeZone, endsLocal}), 'Round started. Add it in Dashboard Studio, then Save to TV.')}>Start round</button>
      </fieldset><a href="/dashboard" className="guide-link">Add and style polls in Dashboard Studio →</a></section>}
      <div className="poll-round-grid">{filtered.map((r) => <section key={r.id} className="poll-panel"><h2>{r.question}</h2><p className="field-hint">{closingLabel(r)} · {r.displayed ? 'On dashboard' : 'Not displayed'}{!r.linked ? ' · Reference TV disconnected' : ''}</p>
        <PollResults poll={r}/>{r.joinUrl && <a className="guide-link" href={r.joinUrl} target="_blank" rel="noreferrer">Open participant page ↗</a>}
        <div className="editor-actions"><button disabled={busy} onClick={() => void reviewRound(r)}>Review votes</button><button disabled={busy} onClick={() => void exportRound(r)}>Export CSV</button>
          {r.state === 'open' && <><button disabled={busy} onClick={() => void action(() => request('polls', 'POST', {action: 'close', roundId: r.id, expectedRevision: r.revision}), 'Voting closed.')}>Close now</button>
          <button disabled={busy} onClick={() => void action(() => request('polls', 'POST', {action: 'rotateLink', roundId: r.id, expectedRevision: r.revision}), 'Link replaced. Previous QR links no longer work.')}>New voting link</button></>}
          {r.state !== 'archived' && <button disabled={busy} onClick={() => void action(() => request('polls', 'POST', {action: 'archive', roundId: r.id, expectedRevision: r.revision}), 'Archived. Private ballots are removed after 90 days.')}>Archive</button>}
          {r.state !== 'open' && <button disabled={busy} onClick={() => void action(() => request('polls', 'POST', {action: 'deleteRound', roundId: r.id, expectedRevision: r.revision}), 'Round deleted. Remove or replace its dashboard widget.')}>Delete round</button>}
        </div>
        {r.state === 'open' && <details><summary>Extend closing time{r.protection === 'invitation' ? ' / invitations' : ''}</summary><div className="poll-form-fields">
          <label>New closing time on TV<input type="datetime-local" id={`extend-${r.id}`}/></label><button disabled={busy} onClick={() => void action(() => request('polls', 'POST', {action: 'extend', roundId: r.id, expectedRevision: r.revision, endsLocal: (document.getElementById(`extend-${r.id}`) as HTMLInputElement).value}), 'Closing time extended.')}>Extend deadline</button>
          {r.protection === 'invitation' && <button disabled={busy} onClick={() => void action(async () => {const result = await request<{codes: string[]}>('polls', 'POST', {action: 'invitations', roundId: r.id, expectedRevision: r.revision, count: 10}); setCodes(result.codes);}, 'Ten invitations created. Copy them now; each code is shown once.')}>Create ten invitation codes</button>}
        </div></details>}
      </section>)}</div>
      {!filtered.length && <p className="field-hint">{tab === 'history' ? 'Completed rounds will appear here.' : 'No active rounds. Create a saved poll, then start it.'}</p>}
    </>}
    {!!codes.length && <section className="poll-panel"><h2>One-use invitations</h2><textarea readOnly rows={10} value={codes.join('\n')} aria-label="Invitation codes"/><p>Give each participant one code. Copy these before leaving.</p></section>}
    {review && <section className="poll-panel"><h2>Private vote review · {review.round.question}</h2><button onClick={() => setReview(null)}>Close review</button>
      <p className="field-hint">Names stay off the TV and participant results. Up to 100 ballots per page.</p>
      <div className="poll-ballots">{review.ballots.map((b) => <p key={b.id}><strong>{b.name}</strong> · {b.answer || review.round.options.find((o) => o.id === b.optionId)?.label || 'Answer unavailable'}</p>)}</div>
      {review.next && <button disabled={busy} onClick={() => void reviewRound(library.rounds.find((r) => r.id === review.round.id)!, review.next!)}>Next ballots</button>}
      {review.answers.map((a) => <article key={a.id} className="poll-saved"><p>{a.label} · {a.count} votes · {a.status}</p><div className="editor-actions">{(['approved', 'rejected'] as const).map((status) => <button key={status} disabled={busy || a.status === status} onClick={() => void action(async () => {
        await request('polls', 'POST', {action: 'moderate', roundId: review.round.id, expectedRevision: review.revision, answerId: a.id, status}); setReview(await request<RoundReview>(`polls?roundId=${review.round.id}`));
      }, 'Answer display updated. The ballot still counts.')}>{status === 'approved' ? 'Approve' : 'Hide'}</button>)}</div></article>)}
    </section>}
  </div>;
}
export function createPollManager(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>) {
  const reactRoot = createRoot(root); let generation = 0;
  return {async load() {const current = ++generation; const request = pollApi(apiUrl, async () => {const token = await getToken(); if (current !== generation) throw new Error('Account changed.'); return token;}); reactRoot.render(<PollManager key={current} request={request}/>);},
    clear() {generation++; reactRoot.render(null);}};
}
