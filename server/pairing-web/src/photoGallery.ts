type Photo = {id: string; dataUrl: string};
function isPhoto(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 800_000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/** Shows only images already selected for this account, never the user's library. */
export function createPhotoGallery(
  root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>,
  onBackground: (dataUrl: string | null) => void,
) {
  let generation = 0;
  root.innerHTML = `<div class="editor-heading"><span class="field-label">PHOTOS SAVED FOR YOUR TV</span>
    <p class="field-hint">Your saved background and up to eight photos selected for the TV. Choose new photos with the TV's Google Photos picker.</p></div>
    <button class="button button-text" type="button">Refresh saved photos</button>
    <p class="field-hint photo-status" role="status"></p><div class="saved-photos"></div>
    <dialog class="photo-dialog"><button class="button button-secondary" type="button">Close photo</button><img alt="" /></dialog>`;
  const refresh = root.querySelector<HTMLButtonElement>('button')!;
  const status = root.querySelector<HTMLElement>('.photo-status')!;
  const photos = root.querySelector<HTMLElement>('.saved-photos')!;
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const largeImage = dialog.querySelector<HTMLImageElement>('img')!;
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { largeImage.removeAttribute('src'); });
  function add(photo: Photo, caption: string) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'saved-photo';
    button.setAttribute('aria-label', `View ${caption.toLowerCase()}`);
    const img = document.createElement('img'); img.src = photo.dataUrl; img.alt = caption; img.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = caption;
    button.append(img, label);
    button.addEventListener('click', () => { largeImage.src = photo.dataUrl; largeImage.alt = caption; dialog.showModal(); });
    photos.append(button);
  }
  async function load() {
    const current = ++generation;
    photos.replaceChildren(); refresh.disabled = true; status.textContent = 'Loading saved photos…';
    onBackground(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sign in to view saved photos.');
      const fetchPhoto = async (action: 'background' | 'gallery') => {
        const response = await fetch(`${apiUrl}/googlePhotosPicker?action=${action}`, {headers: {Authorization: `Bearer ${token}`}});
        if (!response.ok) throw new Error('Could not load saved photos. Use Refresh saved photos to try again.');
        return response.json();
      };
      const [background, gallery] = await Promise.allSettled([fetchPhoto('background'), fetchPhoto('gallery')]);
      if (current !== generation) return;
      const backgroundUrl = background.status === 'fulfilled' && isPhoto(background.value.dataUrl) ? background.value.dataUrl : null;
      const items: Photo[] = gallery.status === 'fulfilled' && Array.isArray(gallery.value.photos)
        ? gallery.value.photos.filter((photo: Photo) => photo && typeof photo.id === 'string' && isPhoto(photo.dataUrl)).slice(0, 8) : [];
      if (backgroundUrl) {
        add({id: 'background', dataUrl: backgroundUrl}, 'Saved dashboard background');
        onBackground(backgroundUrl);
      }
      for (const [i, photo] of items.entries()) add(photo, photo.dataUrl === backgroundUrl ? `TV photo ${i + 1} · background` : `TV photo ${i + 1}`);
      status.textContent = background.status === 'rejected' || gallery.status === 'rejected'
        ? 'Some saved photos could not load. Use Refresh saved photos to try again.'
        : !backgroundUrl && !items.length ? 'No photos have been saved for this account yet.' : 'Tap a photo for a larger view. Photos stay private to your linked account.';
    } catch (error) {
      if (current === generation) status.textContent = error instanceof Error ? error.message : 'Could not load saved photos.';
    } finally { if (current === generation) refresh.disabled = false; }
  }
  refresh.addEventListener('click', () => void load());
  return {
    load,
    clear() { generation++; photos.replaceChildren(); dialog.close(); largeImage.removeAttribute('src'); onBackground(null); status.textContent = ''; refresh.disabled = true; },
  };
}
