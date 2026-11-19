// Fixed scenes for the maker's screenshots: ?shot=cover shows one exported cover edge to edge;
// ?shot=editor shows the whole studio with a sample photo loaded. `photo` picks the sample
// (samples/<photo>.jpg) and `caption` the words. window.__shotReady is set once the scene is
// painted and the display font has settled, so a screenshot never catches a half-drawn cover.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(`samples/${query.get('photo') ?? 'pier'}.jpg`, query.get('caption') ?? 'Sunset Heist');
  try { await document.fonts.ready; } catch { /* fonts are best-effort for a screenshot */ }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
