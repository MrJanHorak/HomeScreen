import type {PollView} from '../../../../functions/src/utils/polls';

export function closingLabel(poll: Pick<PollView, 'endsAtMs' | 'timeZone' | 'state'>) {
  if (poll.state !== 'open') return poll.state === 'archived' ? 'Archived' : 'Voting closed';
  if (poll.endsAtMs === null) return 'No closing time';
  return `Closes ${new Intl.DateTimeFormat(undefined, {timeZone: poll.timeZone, dateStyle: 'medium', timeStyle: 'short'}).format(poll.endsAtMs)} · ${poll.timeZone}`;
}
export function PollResults({poll}: {poll: PollView}) {
  if (poll.results === null) return <p className="field-hint">{poll.resultsVisibility === 'closed' ? 'Results will be revealed when voting closes.' : 'Results are available after you vote.'}</p>;
  const max = Math.max(0, ...poll.results.map((r) => r.count)); const leaders = poll.results.filter((r) => max > 0 && r.count === max);
  return <div className="poll-results">
    <p className="poll-count">{poll.total} {poll.total === 1 ? 'vote' : 'votes'}{poll.total === 0 ? ' · Waiting for the first vote' : ''}</p>
    {poll.state === 'closed' && poll.answerMode !== 'written' && leaders.length > 0 && <p className="poll-winner">{leaders.length === 1 ? `Winner: ${leaders[0].label}` : `Tie: ${leaders.map((r) => r.label).join(', ')}`}</p>}
    {poll.results.map((r) => {const percent = poll.total ? Math.round(r.count / poll.total * 100) : 0;
      return <div className="poll-result" key={r.id} aria-label={`${r.label}, ${r.count} votes, ${percent} percent`}>
        <div className="poll-result-label"><span>{r.label}</span><strong>{r.count} · {percent}%</strong></div>
        <div className="poll-track"><div style={{width: `${percent}%`}}/></div>
      </div>;
    })}
    {!!poll.pendingCount && <p className="field-hint">{poll.pendingCount} written responses awaiting owner review.</p>}
  </div>;
}
