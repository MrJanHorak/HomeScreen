/** Fail at initialization if a view's required markup is missing. */
export function requiredElement<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

export type StatusWriter = (message: string, kind?: 'info' | 'error' | 'success') => void;

/** Every feature uses the same accessible status presentation. */
export function statusWriter(element: HTMLElement): StatusWriter {
  return (message, kind = 'info') => {
    element.textContent = message;
    element.dataset.kind = kind;
  };
}
