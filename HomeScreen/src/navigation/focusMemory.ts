/** Stable identities survive layout changes; a removed item falls back to its nearest saved neighbor. */
export class FocusMemory {
  private targets = new Map<string, () => void>();
  private selected: string | null = null;
  private order: string[] = [];
  blocked = false;
  onMissingTarget?: () => void;
  get hasSelection(): boolean { return this.selected !== null; }

  register(id: string, focus: () => void): () => void {
    this.targets.set(id, focus);
    return () => {
      if (this.targets.get(id) !== focus) return;
      this.targets.delete(id);
      if (this.selected === id && !this.blocked) this.onMissingTarget?.();
    };
  }

  remember(id: string): void {
    if (this.blocked || !this.targets.has(id)) return;
    this.selected = id;
    this.order = [...this.targets.keys()];
  }

  /** Give a new TV dashboard an initial target without overriding user focus. */
  focusDefault(id: string): boolean {
    if (this.blocked || this.selected) return false;
    const target = this.targets.get(id);
    if (!target) return false;
    target();
    return true;
  }

  restore(): string | null {
    this.blocked = false;
    if (!this.selected) return null;
    const index = this.order.indexOf(this.selected);
    const neighbors = this.order.slice(index + 1).flatMap((id, offset) =>
      [id, this.order[index - offset - 1]]).filter(Boolean);
    // Include earlier neighbors when the selected item was near the end.
    const id = [this.selected, ...neighbors, ...this.order.slice(0, index).reverse(), ...this.targets.keys()]
      .find((key) => this.targets.has(key));
    if (!id) return null;
    this.selected = id;
    this.order = [...this.targets.keys()];
    this.targets.get(id)!();
    return id;
  }
}
