import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {cardInk, cardSurface} from '../../../../functions/src/utils/cardStyle';
import {freeWidgetSpace, validWidgetLayout, validWidgetGrid, widgetGridFromRows, widgetsFromLegacy, legacyWidgetProjection} from '../../../../functions/src/utils/widgets';
import type {Widget, WidgetLayout} from '../../../../functions/src/utils/widgets';
import {CARD_LABELS} from '../dashboard/appearanceModel';
import type {Appearance} from '../dashboard/appearanceModel';
import {pollApi} from './pollApi';
import type {PollRequest, PollLibrary, RoundSummary} from './pollApi';
import './polls.css';

function WidgetStudio({appearance, busy, request, update, previewRoot}: {appearance: Appearance; busy: boolean; request: PollRequest; update: (layout: WidgetLayout) => void; previewRoot: HTMLElement}) {
  const layout = appearance.widgetLayout;
  const [rounds, setRounds] = useState<RoundSummary[]>([]); const [roundId, setRoundId] = useState(''); const [selected, setSelected] = useState(''); const [message, setMessage] = useState('');
  const enabled = !!layout;
  useEffect(() => {let active = true; if (enabled) void request<PollLibrary>('polls').then((library) => {if (active) {setRounds(library.rounds.filter((r) => r.state !== 'archived')); setMessage('');}}).catch((e) => {if (active) setMessage(e.message);});
    return () => {active = false;};}, [request, enabled]);
  const label = (widget: Widget) => widget.kind === 'poll' ? rounds.find((r) => r.id === widget.roundId)?.question || 'Poll' : CARD_LABELS[widget.kind];
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
    if (!layout || !roundId) return;
    const widget: Widget = {id: `poll_${crypto.randomUUID().replaceAll('-', '')}`, kind: 'poll', roundId, visible: true, size: 'standard', presentation: 'auto'};
    let grid = layout.grid;
    if (grid) {const space = freeWidgetSpace(grid, widget.id); if (!space) {setMessage('The canvas is full. Shrink or hide a widget first.'); return;} grid = {...grid, items: [...grid.items, space]};}
    commit({...layout, grid, widgets: [...layout.widgets, widget]}); setSelected(widget.id);
  }
  return <section className="widget-studio" aria-label="Poll widgets and arrangement">
    {!layout ? <><p className="widget-note">Add independently styled poll cards to your existing dashboard.</p><button type="button" className="button button-secondary" disabled={busy} onClick={() => update(widgetsFromLegacy(appearance.cards, appearance.grid, appearance.cardStyles))}>Enable poll widgets</button><a href="/polls" className="guide-link">Create and reuse polls →</a></> : <>
      <label>Arrangement<select disabled={busy} value={layout.grid ? 'grid' : 'rows'} onChange={(e) => commit({...layout, grid: e.target.value === 'grid' ? widgetGridFromRows(layout.widgets) : null})}><option value="rows">Automatic rows</option><option value="grid">Free layout · all 50 sizes</option></select></label>
      <div className="widget-toolbar"><select aria-label="Poll round to add" disabled={busy} value={roundId} onChange={(e) => setRoundId(e.target.value)}><option value="">Choose a voting round</option>{rounds.map((r) => <option key={r.id} value={r.id}>{r.question} · {r.state}</option>)}</select><button type="button" className="button button-secondary" disabled={busy || !roundId} onClick={addPoll}>Add poll</button></div>
      <a href="/polls" className="guide-link">Create or manage saved polls →</a>
      {createPortal(<div className="widget-canvas" aria-label="Widget layout preview">{(layout.grid || widgetGridFromRows(layout.widgets)).items.map((item) => {const widget = layout.widgets.find((w) => w.id === item.id)!;
        const custom = widget.style && !widget.style.useThemeSurface ? widget.style : null;
        return <button type="button" key={item.id} disabled={busy} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} style={{gridColumn: `${item.x + 1}/span ${item.width}`, gridRow: `${item.y + 1}/span ${item.height}`, background: custom ? cardSurface(custom) : '#24344d', color: custom ? cardInk(custom, appearance.backgroundColor, appearance.customAccent).primary : '#fff', borderRadius: custom?.borderRadius, borderWidth: custom?.borderWidth}}>{label(widget)}<small>{item.width} × {item.height}{widget.kind === 'poll' ? ` · ${rounds.find((r) => r.id === widget.roundId)?.total ?? 0} votes` : ''}</small></button>;
      })}</div>, previewRoot)}
      <p className="widget-note">Select a widget for precise positioning. Changes remain in your draft until Save to TV. Small polls open a larger QR when selected on the TV.</p>
      {layout.widgets.map((widget, index) => <article className="widget-row" key={widget.id}>
        <div className="widget-toolbar"><h3>{label(widget)}</h3><button type="button" disabled={busy} onClick={() => setSelected(selected === widget.id ? '' : widget.id)}>{selected === widget.id ? 'Hide controls' : 'Edit widget'}</button></div>
        <div className="widget-toolbar"><label><input type="checkbox" disabled={busy} checked={widget.visible} onChange={(e) => visibility(widget, e.target.checked)}/>Visible</label>
          {!layout.grid && <><button type="button" disabled={busy || index === 0} onClick={() => {const widgets = [...layout.widgets]; [widgets[index - 1], widgets[index]] = [widgets[index], widgets[index - 1]]; commit({...layout, widgets});}}>↑</button><button type="button" disabled={busy || index === layout.widgets.length - 1} onClick={() => {const widgets = [...layout.widgets]; [widgets[index], widgets[index + 1]] = [widgets[index + 1], widgets[index]]; commit({...layout, widgets});}}>↓</button></>}
          {widget.kind === 'poll' && <button type="button" disabled={busy} onClick={() => commit({...layout, widgets: layout.widgets.filter((w) => w.id !== widget.id), grid: layout.grid ? {...layout.grid, items: layout.grid.items.filter((i) => i.id !== widget.id)} : null})}>Remove widget</button>}
        </div>
        {selected === widget.id && <fieldset disabled={busy} className="poll-form-fields">
          {layout.grid && widget.visible && <div className="widget-fields">{(['x', 'y', 'width', 'height'] as const).map((key) => {
            const item = layout.grid!.items.find((i) => i.id === widget.id)!; const offset = key === 'x' || key === 'y' ? 1 : 0;
            return <label key={key}>{key === 'x' ? 'Column' : key === 'y' ? 'Row' : key === 'width' ? 'Width (3–12)' : 'Height (2–6)'}<input type="number" step={1} min={key === 'width' ? 3 : key === 'height' ? 2 : 1} max={key === 'x' || key === 'width' ? 12 : 6} value={item[key] + offset} onChange={(e) => {
              const next = {...layout.grid!, items: layout.grid!.items.map((i) => i.id === widget.id ? {...i, [key]: Number(e.target.value) - offset} : i)};
              if (validWidgetGrid(next, layout.widgets)) commit({...layout, grid: next}); else setMessage('This size or position does not fit. Move or shrink another widget first.');
            }}/></label>;
          })}</div>}
          <div className="widget-fields"><label>Surface preset<select value={widget.style?.useThemeSurface !== false ? 'theme' : 'custom'} onChange={(e) => change(widget.id, {style: e.target.value === 'theme' ? undefined : {backgroundColor: '#142338', opacity: .95, useThemeSurface: false, borderWidth: 1, borderRadius: 20}})}><option value="theme">Follow dashboard theme</option><option value="custom">Custom color</option></select></label>
            {!layout.grid && <label>Row width<select value={widget.size} onChange={(e) => change(widget.id, {size: e.target.value as Widget['size']})}><option value="standard">Standard</option><option value="wide">Wide where space permits</option></select></label>}
            {widget.style && !widget.style.useThemeSurface && <>
              <label>Background color<input type="color" value={widget.style.backgroundColor} onChange={(e) => change(widget.id, {style: {...widget.style!, backgroundColor: e.target.value}})}/></label>
              <label>Opacity<input type="range" min={0.3} max={1} step={.05} value={widget.style.opacity} onChange={(e) => change(widget.id, {style: {...widget.style!, opacity: Number(e.target.value)}})}/></label>
              <label>Border width<input type="number" min={0} max={4} step={.5} value={widget.style.borderWidth ?? 1} onChange={(e) => change(widget.id, {style: {...widget.style!, borderWidth: Number(e.target.value)}})}/></label>
              <label>Corner radius<input type="number" min={0} max={32} value={widget.style.borderRadius ?? 20} onChange={(e) => change(widget.id, {style: {...widget.style!, borderRadius: Number(e.target.value)}})}/></label>
            </>}
            {widget.kind === 'poll' && <><label>Result accent<input type="color" value={widget.accent || appearance.customAccent} onChange={(e) => change(widget.id, {accent: e.target.value})}/></label><label>Presentation<select value={widget.presentation || 'auto'} onChange={(e) => change(widget.id, {presentation: e.target.value as Widget['presentation']})}><option value="auto">Automatic</option><option value="results">Results first</option><option value="join">Join first</option></select></label><label>Voting round<select value={widget.roundId} onChange={(e) => change(widget.id, {roundId: e.target.value})}>{rounds.map((r) => <option key={r.id} value={r.id}>{r.question}</option>)}</select></label></>}
          </div><button type="button" onClick={() => change(widget.id, {style: undefined, accent: undefined, presentation: 'auto'})}>Reset this widget style</button>
        </fieldset>}
      </article>)}
    </>}
    <p role="status" className="status" data-kind="error">{message}</p>
  </section>;
}
export function createWidgetStudio(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>, update: (layout: WidgetLayout) => void, previewRoot: HTMLElement) {
  const reactRoot = createRoot(root); let generation = 0;
  const request = pollApi(apiUrl, async () => {const current = generation; const token = await getToken(); if (current !== generation) throw new Error('Account changed.'); return token;});
  return {render(appearance: Appearance, busy: boolean) {reactRoot.render(<WidgetStudio key={generation} appearance={appearance} busy={busy} request={request} update={update} previewRoot={previewRoot}/>);},
    clear() {generation++; reactRoot.render(null);}};
}
export function applyWidgetLayout(appearance: Appearance, widgetLayout: WidgetLayout): Appearance {return {...appearance, widgetLayout, ...legacyWidgetProjection(widgetLayout), layout: 'custom'};}
