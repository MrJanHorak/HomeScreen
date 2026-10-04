type Photo = {id: string; dataUrl: string};
function isPhoto(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 800_000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/** Google's picker selects images; this gallery shows only the saved selection. */
export function createPhotoGallery(
  root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>,
  onBackground: (dataUrl: string | null) => void,
  onSelected: (purpose: 'background' | 'ambient') => void = () => {},
) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let picking = false;
  let pickerUri = '';
  root.innerHTML = `<div class="editor-heading"><span class="field-label">PHOTOS SAVED FOR YOUR TV</span>
    <p class="field-hint">Choose up to eight images in Google Photos. The first becomes your background when choosing dashboard photos; ambient selection updates the slideshow.</p></div>
    <div class="photo-actions"><button class="button button-secondary pick-background" type="button">Choose dashboard photos</button><button class="button button-secondary pick-ambient" type="button">Choose ambient photos</button></div>
    <div class="photo-pending" hidden><a class="mode-link picker-link" target="_blank" rel="noopener noreferrer">Open Google Photos picker ↗</a><button class="button button-text picker-check" type="button">Check selection</button><button class="button button-text picker-cancel" type="button">Stop waiting</button></div>
    <details class="help-panel"><summary>How photo selection works</summary><p>Google opens in a new tab. Allow Photos access if prompted, then return here and choose photos again. Select images and press Done in Google’s picker. Leave this page open to save your selection automatically. New selections replace the saved gallery for all linked TVs. Existing photos stay in place if selection fails.</p><p>Photo selection saves images immediately. Choose your background or ambient source, then use Save to TV to publish the design. Only selected images are shared with HomeScreen.</p></details>
    <button class="button button-text photo-refresh" type="button">Refresh saved photos</button>
    <p class="field-hint photo-status" role="status"></p><div class="saved-photos"></div>
    <dialog class="photo-dialog" aria-label="Selected photo"><button class="button button-secondary" type="button">Close photo</button><img alt="" /><button class="button button-secondary use-background" type="button">Use as dashboard background</button></dialog>`;
  const refresh = root.querySelector<HTMLButtonElement>('.photo-refresh')!;
  const pickButtons = [...root.querySelectorAll<HTMLButtonElement>('.pick-background, .pick-ambient')];
  const pending = root.querySelector<HTMLElement>('.photo-pending')!;
  const pickerLink = root.querySelector<HTMLAnchorElement>('.picker-link')!;
  const useBackground = root.querySelector<HTMLButtonElement>('.use-background')!;
  const status = root.querySelector<HTMLElement>('.photo-status')!;
  const photos = root.querySelector<HTMLElement>('.saved-photos')!;
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const largeImage = dialog.querySelector<HTMLImageElement>('img')!;
  let selectedId = '';
  async function request(path: string, method = 'GET', body?: object) {
    const token = await getToken(); if (!token) throw new Error('Sign in to choose photos.');
    const response = await fetch(`${apiUrl}/${path}`, {method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})});
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load Google Photos.'); return result;
  }
  function stop() { clearTimeout(timer); picking = false; pending.hidden = true; pickButtons.forEach((button) => { button.disabled = false; }); }
  useBackground.onclick = async () => {
    const current = generation; useBackground.disabled = true;
    try { await request('googlePhotosPicker?action=choose', 'POST', {photoId: selectedId});
      if (current !== generation) return;
      dialog.close(); await load(); if (current + 1 === generation) { onSelected('background'); status.textContent = 'Background photo saved. Use Save to TV to publish your design.'; }
    } catch (error) { if (current === generation) status.textContent = error instanceof Error ? error.message : 'Could not select photo.'; }
    finally { useBackground.disabled = false; }
  };
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { largeImage.removeAttribute('src'); });
  function add(photo: Photo, caption: string) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'saved-photo';
    button.setAttribute('aria-label', `View ${caption.toLowerCase()}`);
    const img = document.createElement('img'); img.src = photo.dataUrl; img.alt = caption; img.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = caption;
    button.append(img, label);
    button.addEventListener('click', () => { selectedId = photo.id; useBackground.hidden = photo.id === 'background' || photo.id === 'legacy-background'; largeImage.src = photo.dataUrl; largeImage.alt = caption; dialog.showModal(); });
    photos.append(button);
  }
  async function load() {
    stop(); const current = ++generation;
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
  async function start(purpose: 'background' | 'ambient') {
    if (picking) return;
    const current = generation;
    // Open while the click still has user activation; browsers otherwise block it.
    const popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null;
    pickButtons.forEach((button) => { button.disabled = true; });
    try {
      status.textContent = 'Connecting to Google Photos…';
      const state = await request('googlePhotosPicker?action=status'); if (current !== generation) { popup?.close(); return; }
      root.querySelector<HTMLButtonElement>('.picker-check')!.hidden = !state.connected;
      if (!state.connected) {
        const result = await request('beginGooglePhotos', 'POST'); if (current !== generation) { popup?.close(); return; }
        const url = new URL(result.authorizationUrl);
        if (url.protocol !== 'https:' || url.hostname !== 'accounts.google.com') throw new Error('Google returned an unexpected connection link.');
        if (popup) popup.location.href = url.href;
        else { pickerLink.href = url.href; pickerLink.textContent = 'Allow Google Photos access ↗'; pending.hidden = false; }
        status.textContent = 'Allow Photos access in Google, return here, then choose photos again.';
        return;
      }
      const session = await request(`googlePhotosPicker?action=create&purpose=${purpose}`, 'POST');
      if (current !== generation) { popup?.close(); return; }
      const url = new URL(session.pickerUri);
      if (url.protocol !== 'https:' || url.hostname !== 'photos.google.com') throw new Error('Google returned an unexpected picker link.');
      pickerUri = url.href; pickerLink.href = pickerUri; pickerLink.textContent = 'Open Google Photos picker ↗';
      pending.hidden = false; picking = true;
      if (popup) popup.location.href = pickerUri;
      status.textContent = 'Choose photos in Google, then press Done. Waiting for your selection…';
      const deadline = Date.now() + 10 * 60 * 1000;
      let checking = false;
      const poll = async () => {
        if (!picking || checking || current !== generation) return;
        clearTimeout(timer); checking = true;
        try {
          if (Date.now() > deadline) throw new Error('Selection timed out. Choose photos again to start a new picker.');
          const result = await request(`googlePhotosPicker?action=poll&sessionId=${encodeURIComponent(session.sessionId)}`);
          if (current !== generation || !picking) return;
          if (result.status === 'selected') {
            stop(); await load(); if (current + 1 === generation) { onSelected(purpose); status.textContent = 'Photos saved. Use Save to TV to publish your background or ambient design.'; }
          } else timer = setTimeout(() => void poll(), Math.max(1500, Math.min(15000, result.pollIntervalMs || session.pollIntervalMs || 3000)));
        } catch (error) { if (current === generation) { stop(); status.textContent = error instanceof Error ? error.message : 'Could not check selection. Start again.'; } }
        finally { checking = false; }
      };
      root.querySelector<HTMLButtonElement>('.picker-check')!.onclick = () => void poll();
      timer = setTimeout(() => void poll(), Math.max(1500, session.pollIntervalMs || 3000));
    } catch (error) { popup?.close(); if (current === generation) { stop(); status.textContent = error instanceof Error ? error.message : 'Could not open Google Photos.'; } }
    finally { if (current === generation) pickButtons.forEach((button) => { button.disabled = picking; }); }
  }
  pickButtons[0].onclick = () => void start('background'); pickButtons[1].onclick = () => void start('ambient');
  root.querySelector<HTMLButtonElement>('.picker-cancel')!.onclick = () => { stop(); status.textContent = 'Stopped waiting. Your saved photos are unchanged unless selection already finished. Choose photos again to restart.'; };
  return {
    load,
    clear() { generation++; stop(); pickerLink.removeAttribute('href'); pickerUri = ''; selectedId = ''; photos.replaceChildren(); dialog.close(); largeImage.removeAttribute('src'); onBackground(null); status.textContent = ''; refresh.disabled = true; },
  };
}
