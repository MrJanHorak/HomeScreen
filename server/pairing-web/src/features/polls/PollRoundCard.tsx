import {useState} from 'react';
import type {RoundSummary} from './pollApi';
import {PollResults, closingLabel} from './PollResults';

export const pollDashboardLink = (id: string) => `/dashboard?poll=${encodeURIComponent(id)}`;
export function PollRoundCard({round, busy, onAction, onReview, onExport, onInvitations}: {
  round: RoundSummary; busy: boolean; onAction: (body: Record<string, unknown>, success: string) => Promise<boolean>;
  onReview: () => void; onExport: () => void; onInvitations: () => void;
}) {
  const [endsLocal, setEndsLocal] = useState('');
  const action = (name: string, success: string, extra = {}) => void onAction({action: name, roundId: round.id, expectedRevision: round.revision, ...extra}, success);
  return <section className="poll-panel poll-round-card">
    <div className="poll-section-heading"><span className={`poll-badge ${round.state === 'open' ? 'is-live' : ''}`}>{round.state === 'open' ? 'Voting open' : round.state === 'closed' ? 'Voting closed' : 'Archived'}</span><span className="field-hint">{round.displayed ? 'On your TV' : 'Not on dashboard yet'}</span></div>
    <h2>{round.question}</h2><p className="field-hint">{closingLabel(round)}{!round.linked ? ' · TV disconnected' : ''}</p>
    <PollResults poll={round}/>
    {round.state === 'open' && round.protection === 'invitation' && <div className="poll-invitations-note"><p className="field-hint">Everyone voting needs a one-use invitation code.</p><button className="button button-secondary" disabled={busy} onClick={onInvitations}>Create ten invitation codes</button></div>}
    <div className="editor-actions">{round.state !== 'archived' && <a className="button button-primary" href={pollDashboardLink(round.id)}>{round.displayed ? 'Edit on dashboard' : 'Add to dashboard'}</a>}<button className="button button-secondary" disabled={busy} onClick={onReview}>Review votes{round.pendingCount ? ` (${round.pendingCount} pending)` : ''}</button></div>
    <details className="poll-options"><summary>Manage this voting round</summary><div className="poll-form-fields">
      {round.joinUrl && <a className="guide-link" href={round.joinUrl} target="_blank" rel="noreferrer">Preview the participant page ↗</a>}
      <div className="editor-actions"><button disabled={busy} onClick={onExport}>Export CSV</button>
        {round.state === 'open' && <><button disabled={busy} onClick={() => action('close', 'Voting closed.')}>Close now</button><button disabled={busy} onClick={() => action('rotateLink', 'Link replaced. Previous QR links no longer work.')}>New voting link</button></>}
        {round.state !== 'archived' && <button disabled={busy} onClick={() => action('archive', 'Archived. Private ballots are removed after 90 days.')}>Archive</button>}
        {round.state !== 'open' && <button disabled={busy} onClick={() => {if (window.confirm('Delete this voting round and its results? Your saved poll will remain.')) action('deleteRound', 'Voting round deleted.');}}>Delete round</button>}
      </div>
      {round.state === 'open' && <><label>New closing time<input type="datetime-local" value={endsLocal} onChange={(e) => setEndsLocal(e.target.value)}/><span className="field-hint">Uses the clock saved for this round ({round.timeZone}).</span></label><button disabled={busy || !endsLocal} onClick={() => action('extend', 'Closing time extended.', {endsLocal})}>Extend deadline</button></>}
    </div></details>
  </section>;
}
