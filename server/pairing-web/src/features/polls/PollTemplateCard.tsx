import type {PollTemplate} from '../../../../functions/src/utils/polls';

export function PollTemplateCard({template, busy, onStart, onEdit, onDuplicate, onDelete}: {
  template: PollTemplate; busy: boolean; onStart: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return <article className="poll-panel poll-saved">
    <h2>{template.question}</h2>
    <p className="field-hint">{template.answerMode === 'written' ? 'Written answers' : `${template.options.length} choices`} · {template.defaultDurationMinutes ? `${template.defaultDurationMinutes} minute default` : 'Close manually'}</p>
    <div className="poll-choice-chips">{template.options.slice(0, 3).map((option) => <span key={option.id}>{option.label}</span>)}</div>
    <div className="editor-actions"><button className="button button-primary" disabled={busy} onClick={onStart}>Start voting</button><button className="button button-secondary" disabled={busy} onClick={onEdit}>Edit</button></div>
    <details className="poll-options"><summary>More options</summary><div className="editor-actions"><button disabled={busy} onClick={onDuplicate}>Duplicate</button><button disabled={busy} onClick={() => {if (window.confirm('Delete this saved question? Existing votes and voting rounds will remain.')) onDelete();}}>Delete saved poll</button></div></details>
  </article>;
}
