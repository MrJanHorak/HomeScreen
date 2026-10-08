import {useState} from 'react';
import type {PollDefinition, PollTemplate} from '../../../../functions/src/utils/polls';

const empty: PollDefinition = {question: '', description: '', answerMode: 'choices', options: [{id: 'a', label: ''}, {id: 'b', label: ''}], resultsVisibility: 'after-vote', protection: 'browser', moderate: true, defaultDurationMinutes: 60};

export function PollTemplateEditor({template, busy, onSave, onCancel}: {
  template: PollTemplate | null; busy: boolean; onSave: (draft: PollDefinition) => Promise<void>; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PollDefinition>(() => structuredClone(template || empty));
  return <section className="poll-panel poll-editor" aria-labelledby="poll-editor-title">
    <div className="poll-section-heading"><div><p className="field-label">STEP 1 · THE QUESTION</p><h2 id="poll-editor-title">{template?.id ? 'Edit your saved poll' : 'What would you like to ask?'}</h2></div><button type="button" className="button button-text" disabled={busy} onClick={onCancel}>Cancel</button></div>
    <form onSubmit={(e) => {e.preventDefault(); void onSave(draft);}}><fieldset disabled={busy} className="poll-form-fields">
      <label>Question<input autoFocus value={draft.question} onChange={(e) => setDraft({...draft, question: e.target.value})} maxLength={160} required placeholder="What should we watch Friday?"/></label>
      <label>Description <span className="field-hint">Optional</span><textarea value={draft.description} onChange={(e) => setDraft({...draft, description: e.target.value})} maxLength={500} rows={2} placeholder="A little context for everyone voting"/></label>
      <label>Answer type<select value={draft.answerMode} onChange={(e) => setDraft({...draft, answerMode: e.target.value as PollDefinition['answerMode'], options: e.target.value === 'written' ? [] : draft.options.length ? draft.options : structuredClone(empty.options)})}>
        <option value="choices">Choose one option</option><option value="mixed">Choose an option or write another</option><option value="written">Write an answer</option></select></label>
      <div className="poll-form-fields">{draft.options.map((option, index) => <div className="poll-option-editor" key={option.id}>
        <label>Choice {index + 1}<input required value={option.label} maxLength={80} onChange={(e) => setDraft({...draft, options: draft.options.map((o) => o.id === option.id ? {...o, label: e.target.value} : o)})}/></label>
        <button type="button" aria-label={`Move choice ${index + 1} up`} disabled={!index} onClick={() => {const options = [...draft.options]; [options[index - 1], options[index]] = [options[index], options[index - 1]]; setDraft({...draft, options});}}>↑</button>
        <button type="button" aria-label={`Remove choice ${index + 1}`} disabled={draft.options.length <= 2} onClick={() => setDraft({...draft, options: draft.options.filter((o) => o.id !== option.id)})}>×</button>
      </div>)}</div>
      {draft.answerMode !== 'written' && <button type="button" className="button button-secondary" disabled={draft.options.length >= 12} onClick={() => setDraft({...draft, options: [...draft.options, {id: crypto.randomUUID(), label: ''}]})}>Add choice</button>}
      <label>Default duration in minutes<input type="number" min={1} max={525600} value={draft.defaultDurationMinutes ?? ''} placeholder="Leave blank to close manually" onChange={(e) => setDraft({...draft, defaultDurationMinutes: e.target.value ? Number(e.target.value) : null})}/><span className="field-hint">You can choose a specific closing time each time you use this poll.</span></label>
      <details className="poll-options"><summary>Voting & privacy settings</summary><div className="poll-form-fields">
        <label>Voting protection<select value={draft.protection} onChange={(e) => setDraft({...draft, protection: e.target.value as PollDefinition['protection']})}><option value="browser">One vote per browser</option><option value="invitation">One-use invitation codes</option></select></label>
        <p className="field-hint">Browser protection prevents ordinary repeat votes. For more control, give each person a one-use invitation code. Clearing cookies or using a different browser can bypass browser protection.</p>
        <label>Reveal results<select value={draft.resultsVisibility} onChange={(e) => setDraft({...draft, resultsVisibility: e.target.value as PollDefinition['resultsVisibility']})}><option value="live">Live, for everyone</option><option value="after-vote">TV live · phone after voting</option><option value="closed">When voting closes</option></select></label>
        {draft.answerMode !== 'choices' && <label className="poll-checkbox"><input type="checkbox" checked={draft.moderate} onChange={(e) => setDraft({...draft, moderate: e.target.checked})}/>Approve written answers before public display</label>}
      </div></details>
      <div className="editor-actions"><button className="button button-primary" type="submit">{busy ? 'Saving…' : 'Save poll'}</button><span className="field-hint">Next: choose when to start voting.</span></div>
      {template?.id && <p className="field-hint">Changes apply the next time you use this poll. Current votes stay as they are.</p>}
    </fieldset></form>
  </section>;
}
