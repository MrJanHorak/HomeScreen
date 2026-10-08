import {useRef, useState} from 'react';
import type {PollLibrary} from './pollApi';

export function PollStartPanel({library, templateId, busy, onStart, onCancel}: {
  library: PollLibrary; templateId: string; busy: boolean; onStart: (body: Record<string, unknown>) => Promise<void>; onCancel: () => void;
}) {
  const [selected, setSelected] = useState(templateId);
  const [deviceId, setDeviceId] = useState(library.devices[0]?.id || '');
  const [endsLocal, setEndsLocal] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [clientTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const requestId = useRef(crypto.randomUUID().replaceAll('-', ''));
  const device = library.devices.find((d) => d.id === deviceId);
  const template = library.templates.find((t) => t.id === selected);
  return <section className="poll-panel poll-start" aria-labelledby="poll-start-title">
    <div className="poll-section-heading"><div><p className="field-label">STEP 2 · OPEN VOTING</p><h2 id="poll-start-title">Ready to ask everyone?</h2></div><button className="button button-text" disabled={busy} onClick={onCancel}>Cancel</button></div>
    <fieldset disabled={busy} className="poll-form-fields">
      <div className="poll-start-grid"><label>Saved poll<select aria-label="Saved poll" autoFocus value={selected} onChange={(e) => {setSelected(e.target.value); requestId.current = crypto.randomUUID().replaceAll('-', '');}}><option value="">Choose a poll</option>{library.templates.map((t) => <option key={t.id} value={t.id}>{t.question}</option>)}</select></label>
        <label>TV<select aria-label="TV" value={deviceId} onChange={(e) => {setDeviceId(e.target.value); requestId.current = crypto.randomUUID().replaceAll('-', '');}}><option value="">Choose your TV</option>{library.devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div>
      {!library.devices.length && <p className="field-hint">Connect a TV before starting a poll. <a href="/pair">Connect a TV →</a></p>}
      {device?.pollCapable === false && <p className="field-hint">Update HomeScreen on this TV to display poll cards. You can prepare your poll here now.</p>}
      {template && <div className="poll-question-preview"><strong>{template.question}</strong><div className="poll-choice-chips">{template.options.map((o) => <span key={o.id}>{o.label}</span>)}{template.answerMode !== 'choices' && <span>Written answers</span>}</div></div>}
      <label>Voting closes<select aria-label="Voting closes" value={scheduled ? 'scheduled' : 'default'} onChange={(e) => {setScheduled(e.target.value === 'scheduled'); requestId.current = crypto.randomUUID().replaceAll('-', '');}}><option value="default">{template?.defaultDurationMinutes ? `After ${template.defaultDurationMinutes} minutes` : 'When I close it manually'}</option><option value="scheduled">At a specific date and time</option></select></label>
      {scheduled && <><label>Closing date and time<input type="datetime-local" required value={endsLocal} onChange={(e) => {setEndsLocal(e.target.value); requestId.current = crypto.randomUUID().replaceAll('-', '');}} aria-describedby="poll-closing-clock"/></label><p id="poll-closing-clock" className="field-hint">{device?.timeZone ? `Uses ${device.name}'s local time (${device.timeZone}), detected automatically.` : `Until your TV connects, a specific closing date uses this device's local time (${clientTimeZone}). Saved durations work in any timezone.`}</p></>}
      <p className="field-hint">Voting starts now, with fresh results and a new QR link. It closes on time even when the TV is asleep.</p>
      <div className="editor-actions"><button className="button button-primary" disabled={!selected || !deviceId || scheduled && !endsLocal} onClick={() => void onStart({action: 'startRound', requestId: requestId.current, templateId: selected, referenceDeviceId: deviceId, clientTimeZone, deadlineTimeZone: device?.timeZone || clientTimeZone, endsLocal: scheduled ? endsLocal : ''})}>{busy ? 'Starting…' : 'Start voting'}</button><span className="field-hint">Next: add it to your dashboard.</span></div>
    </fieldset>
  </section>;
}
