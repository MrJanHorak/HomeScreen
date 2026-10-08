import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {addPersonWidget, freeWidgetSpace, validWidgetLayout, widgetGridFromRows, widgetsFromLegacy, legacyWidgetProjection} from '../../../../functions/src/utils/widgets';
import type {PeopleSettings} from '../../../../../shared/src/people';
import type {Widget, WidgetLayout} from '../../../../functions/src/utils/widgets';
import {CARD_LABELS} from '../dashboard/appearanceModel';
import type {Appearance} from '../dashboard/appearanceModel';
import {WidgetCanvas} from '../dashboard/grid/WidgetCanvas';
import {pollApi} from './pollApi';
import type {PollRequest, PollLibrary, RoundSummary} from './pollApi';
import './polls.css';

function WidgetStudio({appearance, busy, request, update, previewRoot, addRoot}: {appearance: Appearance; busy: boolean; request: PollRequest; update: (layout: WidgetLayout) => void; previewRoot: HTMLElement; addRoot: HTMLElement}) {
  const layout = appearance.widgetLayout;
  const [rounds, setRounds] = useState<RoundSummary[]>([]); const [roundId, setRoundId] = useState(''); const [selected, setSelected] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); const [refresh, setRefresh] = useState(0);
  const [people, setPeople] = useState<PeopleSettings['people']>([]);
  const [personId, setPersonId] = useState(''); const [peopleLoading, setPeopleLoading] = useState(true);
  useEffect(() => {
    let active = true; setPeopleLoading(true);
    void request<PeopleSettings>('people').then((data) => {
      if (active) {setPeople(data.people); setPersonId((id) => data.people.some((p) => p.id === id) ? id : data.people[0]?.id || '');}
    }).catch(() => {if (active) setMessage('People could not load. Refresh to try again.');})
      .finally(() => {if (active) setPeopleLoading(false);});
    return () => {active = false;};
  }, [request, refresh]);
  useEffect(() => {let active = true; setLoading(true);
    void request<PollLibrary>('polls').then((library) => {if (active) {
      const available = library.rounds.filter((r) => r.state !== 'archived'); setRounds(available);
      const requested = new URLSearchParams(window.location.search).get('poll');
      setRoundId((current) => available.some((r) => r.id === current) ? current : available.find((r) => r.id === requested)?.id || available.find((r) => r.state === 'open')?.id || available[0]?.id || '');
      setMessage(requested && !available.some((r) => r.id === requested) ? 'That poll is no longer available. Choose another voting round below.' : '');
    }}).catch((e) => {if (active) setMessage(e.message);}).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};}, [request, refresh]);
  const label = (widget: Widget) => widget.kind === 'poll' ? rounds.find((r) => r.id === widget.roundId)?.question || 'Poll' :
    widget.personId ? `Activity · ${people.find((p) => p.id === widget.personId)?.name || 'Person unavailable'}` : CARD_LABELS[widget.kind];
  function addActivity() {
    if (!personId || !people.some((p) => p.id === personId)) return;
    try {
      const current = layout || widgetsFromLegacy(appearance.cards, appearance.grid, appearance.cardStyles);
      const next = addPersonWidget(current, personId);
      commit(next); setSelected(`activity_${personId}`);
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Could not add activity widget.');}
  }
  function commit(next: WidgetLayout) {if (!validWidgetLayout(next)) {setMessage('Keep at least one widget visible, up to eight in rows, or twelve fitting the free canvas. Widgets cannot overlap.'); return;} setMessage(''); update(next);}
  function change(id: string, changes: Partial<Widget>) {if (layout) commit({...layout, widgets: layout.widgets.map((w) => w.id === id ? {...w, ...changes} : w)});}
  function visibility(widget: Widget, visible: boolean) {
    if (!layout) return;
    let grid = layout.grid;
    if (grid) {
      if (visible) {const space = freeWidgetSpace(grid, widget.id); if (!space) {setMessage('Make space on the canvas before showing another widget.'); return;} grid = {...grid, items: [...grid.items, space]};}
      else grid = {...grid, items: grid.items.filter((i) => i.id !== widget.id)};
    }
    commit({...layout, grid, widgets: layout.widgets.map((w) => w.id === widget.id ? {...w, visible} : w)});
  }
  function addPoll() {
    if (!roundId) return;
    const current = layout || widgetsFromLegacy(appearance.cards, appearance.grid, appearance.cardStyles);
    const widget: Widget = {id: `poll_${crypto.randomUUID().replaceAll('-', '')}`, kind: 'poll', roundId, visible: true, size: 'standard', presentation: 'auto'};
    let grid = current.grid;
    if (grid) {const space = freeWidgetSpace(grid, widget.id); if (!space) {setMessage('The canvas is full. Shrink or hide a widget first.'); return;} grid = {...grid, items: [...grid.items, space]};}
    const next = {...current, grid, widgets: [...current.widgets, widget]};
    if (!validWidgetLayout(next)) {setMessage('Your automatic rows are full. Hide a card or switch to Free layout before adding another poll.'); return;}
    commit(next); setSelected(widget.id);
  }
  return <section className="widget-studio" aria-label="Widgets and arrangement">
    {createPortal(<section className="studio-add-poll" aria-labelledby="studio-add-activity-title">
      <div className="poll-section-heading"><div><h2 id="studio-add-activity-title">Add a person’s activity</h2><p className="field-hint">Each person has an independent card. Joining does not change your layout.</p></div><a className="guide-link" href="/people">Manage People →</a></div>
      <div className="widget-add-controls"><select aria-label="Person’s activity to add" disabled={busy || peopleLoading || !people.length} value={personId} onChange={(e) => setPersonId(e.target.value)}>
        <option value="">{peopleLoading ? 'Loading people…' : 'Choose a person'}</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}{layout?.widgets.some((w) => w.personId === person.id) ? ' · Already added' : ''}</option>)}</select>
        <button type="button" className="button button-primary" disabled={busy || peopleLoading || !personId || layout?.widgets.some((w) => w.personId === personId)} onClick={addActivity}>Add activity</button>
        <button type="button" className="button button-text" disabled={busy || peopleLoading} onClick={() => setRefresh((n) => n + 1)}>Refresh people</button>
      </div>{!peopleLoading && !people.length && <p className="field-hint"><a href="/people">Invite someone to share their activity →</a></p>}
    </section>, addRoot)}
    {createPortal(<section className="studio-add-poll" aria-labelledby="studio-add-poll-title"><div className="poll-section-heading"><div><h2 id="studio-add-poll-title">Add a poll to your dashboard</h2><p className="field-hint">Choose a voting round, then arrange and style its card in the preview.</p></div><a className="guide-link" href="/polls">Manage polls →</a></div>
      <div className="widget-add-controls"><select aria-label="Poll round to add" disabled={busy || loading || !rounds.length} value={roundId} onChange={(e) => setRoundId(e.target.value)}><option value="">{loading ? 'Loading polls…' : 'Choose a voting round'}</option>{rounds.map((r) => <option key={r.id} value={r.id}>{r.question} · {r.state === 'open' ? 'Voting open' : 'Results'}</option>)}</select><button type="button" className="button button-primary" disabled={busy || loading || !roundId} onClick={addPoll}>Add poll</button><button type="button" className="button button-text" disabled={busy || loading} onClick={() => setRefresh((n) => n + 1)}>Refresh</button></div>
      {!loading && !rounds.length && <p className="field-hint">No voting rounds yet. <a href="/polls">Create a poll and start voting →</a></p>}
      {!layout && <p role="status" className="status" data-kind="error">{message}</p>}
    </section>, addRoot)}
    {!layout ? null : <>
      <label>Arrangement<select disabled={busy} value={layout.grid ? 'grid' : 'rows'} onChange={(e) => commit({...layout, grid: e.target.value === 'grid' ? widgetGridFromRows(layout.widgets) : null})}><option value="rows">Automatic rows</option><option value="grid">Free layout · all 50 sizes</option></select></label>
      {createPortal(<WidgetCanvas appearance={appearance} layout={layout} busy={busy} selected={selected} select={setSelected} label={label} votes={(widget) => rounds.find((r) => r.id === widget.roundId)?.total ?? 0} commit={commit} report={setMessage}/>, previewRoot)}
      <p id="widget-layout-help" className="widget-note">{layout.grid ? 'Drag widgets to move them. Drop onto another widget to swap their places and sizes. Drag the bottom-right corner to resize.' : 'Drag a widget onto another to reorder. Choose Free layout to move and resize widgets.'} Select a widget to style it below. You can also use arrow keys on a widget or its resize handle. Changes stay in your draft until Save to TV.</p>
      <p role="status" className="status" data-kind="error">{message}</p>
      {layout.widgets.map((widget, index) => <article className={`widget-row ${selected === widget.id ? 'is-selected' : ''}`} key={widget.id}>
        <div className="widget-toolbar widget-heading"><h3>{label(widget)}</h3><button type="button" className="button button-secondary" aria-expanded={selected === widget.id} disabled={busy} onClick={() => setSelected(selected === widget.id ? '' : widget.id)}>{selected === widget.id ? 'Hide controls' : 'Edit widget'}</button></div>
        <div className="widget-toolbar"><label><input type="checkbox" disabled={busy} checked={widget.visible} onChange={(e) => visibility(widget, e.target.checked)}/>Visible</label>
          {!layout.grid && <><button type="button" className="button button-secondary" aria-label={`Move ${label(widget)} earlier`} disabled={busy || index === 0} onClick={() => {const widgets = [...layout.widgets]; [widgets[index - 1], widgets[index]] = [widgets[index], widgets[index - 1]]; commit({...layout, widgets});}}>↑</button><button type="button" className="button button-secondary" aria-label={`Move ${label(widget)} later`} disabled={busy || index === layout.widgets.length - 1} onClick={() => {const widgets = [...layout.widgets]; [widgets[index], widgets[index + 1]] = [widgets[index + 1], widgets[index]]; commit({...layout, widgets});}}>↓</button></>}
          {(widget.kind === 'poll' || widget.personId) && <button type="button" className="button button-text" disabled={busy} onClick={() => commit({...layout, widgets: layout.widgets.filter((w) => w.id !== widget.id), grid: layout.grid ? {...layout.grid, items: layout.grid.items.filter((i) => i.id !== widget.id)} : null})}>Remove widget</button>}
        </div>
        {selected === widget.id && <fieldset disabled={busy} className="poll-form-fields">
          <div className="widget-fields"><label>Surface preset<select value={widget.style?.useThemeSurface !== false ? 'theme' : 'custom'} onChange={(e) => change(widget.id, {style: e.target.value === 'theme' ? undefined : {backgroundColor: '#142338', opacity: .95, useThemeSurface: false, borderWidth: 1, borderRadius: 20}})}><option value="theme">Follow dashboard theme</option><option value="custom">Custom color</option></select></label>
            {!layout.grid && <label>Row width<select value={widget.size} onChange={(e) => change(widget.id, {size: e.target.value as Widget['size']})}><option value="standard">Standard</option><option value="wide">Wide where space permits</option></select></label>}
            {widget.style && !widget.style.useThemeSurface && <>
              <label>Background color<input type="color" value={widget.style.backgroundColor} onChange={(e) => change(widget.id, {style: {...widget.style!, backgroundColor: e.target.value}})}/></label>
              <label>Opacity <output>{Math.round(widget.style.opacity * 100)}%</output><input aria-label="Opacity" type="range" min={0} max={1} step={.01} value={widget.style.opacity} onChange={(e) => change(widget.id, {style: {...widget.style!, opacity: Number(e.target.value)}})}/></label>
              <label>Border width <output>{widget.style.borderWidth ?? 1}px</output><input aria-label="Border width" type="range" min={0} max={4} step={.5} value={widget.style.borderWidth ?? 1} onChange={(e) => change(widget.id, {style: {...widget.style!, borderWidth: Number(e.target.value)}})}/></label>
              <label>Corner radius <output>{widget.style.borderRadius ?? 20}px</output><input aria-label="Corner radius" type="range" min={0} max={32} step={1} value={widget.style.borderRadius ?? 20} onChange={(e) => change(widget.id, {style: {...widget.style!, borderRadius: Number(e.target.value)}})}/></label>
            </>}
            {widget.kind === 'poll' && <><label>Result accent<input type="color" value={widget.accent || appearance.customAccent} onChange={(e) => change(widget.id, {accent: e.target.value})}/></label><label>Presentation<select value={widget.presentation || 'auto'} onChange={(e) => change(widget.id, {presentation: e.target.value as Widget['presentation']})}><option value="auto">Automatic</option><option value="results">Results first</option><option value="join">Join first</option></select></label><label>Voting round<select value={widget.roundId} onChange={(e) => change(widget.id, {roundId: e.target.value})}>{rounds.map((r) => <option key={r.id} value={r.id}>{r.question}</option>)}</select></label></>}
          </div><button type="button" className="button button-text widget-reset" onClick={() => change(widget.id, {style: undefined, accent: undefined, presentation: 'auto'})}>Reset this widget style</button>
        </fieldset>}
      </article>)}
    </>}
  </section>;
}
export function createWidgetStudio(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>, update: (layout: WidgetLayout) => void, previewRoot: HTMLElement, addRoot: HTMLElement) {
  const reactRoot = createRoot(root); let generation = 0;
  const request = pollApi(apiUrl, async () => {const current = generation; const token = await getToken(); if (current !== generation) throw new Error('Account changed.'); return token;});
  return {render(appearance: Appearance, busy: boolean) {reactRoot.render(<WidgetStudio key={generation} appearance={appearance} busy={busy} request={request} update={update} previewRoot={previewRoot} addRoot={addRoot}/>);},
    clear() {generation++; reactRoot.render(null);}};
}
export function applyWidgetLayout(appearance: Appearance, widgetLayout: WidgetLayout): Appearance {return {...appearance, widgetLayout, ...legacyWidgetProjection(widgetLayout), layout: 'custom'};}
