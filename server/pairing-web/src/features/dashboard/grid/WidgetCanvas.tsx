import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent, PointerEvent} from 'react';
import {cardInk, cardSurface} from '../../../../../functions/src/utils/cardStyle';
import {validWidgetGrid, widgetGridFromRows} from '../../../../../functions/src/utils/widgets';
import type {Widget, WidgetGrid, WidgetLayout} from '../../../../../functions/src/utils/widgets';
import type {Appearance} from '../appearanceModel';
import './WidgetCanvas.css';
import {normalizeReading, readingColors, readingInk} from '../../../../../functions/src/utils/reading';

type Item = WidgetGrid['items'][number];
type Gesture = {pointerId: number; x: number; y: number; item: Item; resize: boolean; layout: WidgetLayout; handle: HTMLButtonElement};
type Proposal = {item: Item; target?: Item; moved: boolean};

export function WidgetCanvas({appearance, layout, busy, selected, select, label, votes, commit, report}: {
  appearance: Appearance; layout: WidgetLayout; busy: boolean; selected: string;
  select: (id: string) => void; label: (widget: Widget) => string; votes: (widget: Widget) => number;
  commit: (layout: WidgetLayout) => void; report: (message: string) => void;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const reading = normalizeReading(appearance.reading), scheme = readingColors(reading);
  const gesture = useRef<Gesture | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const grid = layout.grid || widgetGridFromRows(layout.widgets);
  function cancel() {
    const active = gesture.current;
    gesture.current = null;
    if (active?.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
    setProposal(null);
  }
  useEffect(() => {cancel(); return () => {
    const active = gesture.current;
    gesture.current = null;
    if (active?.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
  };}, [layout, busy]);

  function nextGrid(item: Item, target?: Item): WidgetGrid {
    return {...grid, items: grid.items.map((old) => target
      ? old.id === item.id ? {...target, id: item.id} : old.id === target.id ? {...grid.items.find((i) => i.id === item.id)!, id: target.id} : old
      : old.id === item.id ? item : old)};
  }
  function apply(item: Item, target?: Item) {
    if (busy) return;
    if (!layout.grid) {
      if (!target) return;
      const widgets = [...layout.widgets];
      const from = widgets.findIndex((w) => w.id === item.id), to = widgets.findIndex((w) => w.id === target.id);
      [widgets[from], widgets[to]] = [widgets[to], widgets[from]];
      commit({...layout, widgets});
      return;
    }
    const next = nextGrid(item, target);
    if (validWidgetGrid(next, layout.widgets)) commit({...layout, grid: next});
    else report('Widgets cannot overlap. Drop onto another widget to swap, or choose an empty space.');
  }
  function propose(event: PointerEvent<HTMLButtonElement>): Proposal | null {
    const active = gesture.current;
    if (!active || event.pointerId !== active.pointerId || active.layout !== layout || busy || !canvas.current) return null;
    const rect = canvas.current.getBoundingClientRect(), style = getComputedStyle(canvas.current);
    const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const top = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
    const width = canvas.current.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = canvas.current.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const pitchX = (width + (parseFloat(style.columnGap) || 0)) / 12;
    const pitchY = (height + (parseFloat(style.rowGap) || 0)) / 6;
    const dx = Math.round((event.clientX - active.x) / pitchX), dy = Math.round((event.clientY - active.y) / pitchY);
    const original = active.item;
    const item = active.resize
      ? {...original, width: Math.max(3, Math.min(12 - original.x, original.width + dx)), height: Math.max(2, Math.min(6 - original.y, original.height + dy))}
      : {...original, x: Math.max(0, Math.min(12 - original.width, original.x + dx)), y: Math.max(0, Math.min(6 - original.height, original.y + dy))};
    const cellX = (event.clientX - left) / pitchX, cellY = (event.clientY - top) / pitchY;
    const target = !active.resize ? grid.items.find((i) => i.id !== item.id && cellX >= i.x && cellX < i.x + i.width && cellY >= i.y && cellY < i.y + i.height) : undefined;
    return {item, target, moved: Math.hypot(event.clientX - active.x, event.clientY - active.y) > 4};
  }
  function start(event: PointerEvent<HTMLButtonElement>, item: Item, resize: boolean) {
    if (busy || gesture.current || event.button !== 0) return;
    event.preventDefault();
    select(item.id);
    event.currentTarget.focus({preventScroll: true});
    gesture.current = {pointerId: event.pointerId, x: event.clientX, y: event.clientY, item, resize, layout, handle: event.currentTarget};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {const next = propose(event); if (next) setProposal(next);}
  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerId !== gesture.current?.pointerId) return;
    const next = propose(event), original = gesture.current.item;
    cancel();
    if (next?.moved && (next.target || ['x', 'y', 'width', 'height'].some((key) => next.item[key as keyof Item] !== original[key as keyof Item]))) apply(next.item, next.target);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, item: Item, resize: boolean) {
    if (event.key === 'Escape') {cancel(); return;}
    const direction = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key];
    if (!direction || busy) return;
    event.preventDefault(); select(item.id);
    if (gesture.current) return;
    if (!layout.grid) {
      const index = grid.items.findIndex((i) => i.id === item.id);
      apply(item, grid.items[index + (direction[0] || direction[1])]);
    } else if (resize) apply({...item, width: item.width + direction[0], height: item.height + direction[1]});
    else {
      const candidate = {...item, x: item.x + direction[0], y: item.y + direction[1]};
      const targets = grid.items.filter((i) => i.id !== item.id && candidate.x < i.x + i.width && candidate.x + candidate.width > i.x && candidate.y < i.y + i.height && candidate.y + candidate.height > i.y);
      apply(candidate, targets.length === 1 ? targets[0] : undefined);
    }
  }
  const blocked = proposal?.moved && layout.grid && !validWidgetGrid(nextGrid(proposal.item, proposal.target), layout.widgets);
  return <div ref={canvas} className="widget-canvas" aria-label="Widget layout preview" aria-describedby="widget-layout-help">
    {grid.items.map((original) => {
      const widget = layout.widgets.find((w) => w.id === original.id)!;
      const item = layout.grid && proposal?.moved && proposal.item.id === original.id ? proposal.item : original;
      const custom = widget.style && !widget.style.useThemeSurface ? widget.style : null;
      const active = proposal?.moved && proposal.item.id === item.id;
      return <div key={item.id} data-widget-id={item.id} className={`widget-tile${selected === item.id ? ' is-selected' : ''}${active ? ' is-dragging' : ''}${active && blocked ? ' is-blocked' : ''}${proposal?.moved && proposal.target?.id === item.id ? ' is-swap-target' : ''}`}
        style={{gridColumn: `${item.x + 1}/span ${item.width}`, gridRow: `${item.y + 1}/span ${item.height}`, background: scheme?.surface || (custom ? cardSurface(custom) : '#24344d'), color: scheme ? readingInk(reading.textColor, scheme.focused, scheme.primary) : custom ? cardInk(custom, appearance.backgroundColor, appearance.customAccent, reading.textColor).primary : readingInk(reading.textColor, '#24344d', '#fff'), fontFamily: reading.font === 'opendyslexic' ? 'OpenDyslexic, sans-serif' : undefined, fontWeight: reading.weight === 'bold' ? 700 : undefined, letterSpacing: reading.spacing === 'relaxed' ? '.02em' : undefined, borderRadius: widget.style?.borderRadius ?? 10, borderWidth: widget.style?.borderWidth ?? 1}}>
        <button type="button" className="widget-move" disabled={busy} aria-pressed={selected === item.id} aria-label={`Select or move ${label(widget)}`} onClick={() => select(item.id)}
          onPointerDown={(e) => start(e, original, false)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={(e) => keyboard(e, original, false)}>
          <span className="widget-tile-label">{label(widget)}</span><small>{item.width} × {item.height}{widget.kind === 'poll' ? ` · ${votes(widget)} votes` : ''}</small>
        </button>
        {layout.grid && <button type="button" className="widget-resize" disabled={busy} aria-label={`Resize ${label(widget)}`} onPointerDown={(e) => start(e, original, true)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={(e) => keyboard(e, original, true)}>↘</button>}
      </div>;
    })}
  </div>;
}
