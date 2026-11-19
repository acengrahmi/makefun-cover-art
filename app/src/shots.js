// Fixed scenes for screenshots, driven by the ?shot= query.
//   ?shot=cover&layout=collage&grade=sunset&photo=pier&caption=Sunset%20Heist&size=1920x1080
//     → the cover alone, filling the window (screenshot viewport must match
//        the cover's aspect, e.g. 1280x720 for 1920x1080).
//   ?shot=editor&layout=collage&grade=sunset&caption=Boulevard%20Queen
//     → the full editor with both sample photos loaded.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, state, redraw) {
  const byName = (name) => state.photos.findIndex((p) => p.name.toLowerCase() === String(name || '').toLowerCase());

  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('size')) state.size = query.get('size');

  if (shot === 'cover') {
    const picked = byName(query.get('photo'));
    const hero = picked >= 0 ? picked : 0;
    // Alternate the two sample photos across the slots so multi-panel
    // layouts show variety instead of one photo repeated everywhere.
    state.slots.forEach((slot, i) => {
      const idx = i === 0 ? hero : (state.photos.length > 1 ? (hero + i) % state.photos.length : hero);
      slot.img = state.photos[idx].img;
      slot.zoom = 1; slot.ox = 0; slot.oy = 0;
    });
    state.selected = 0;
  }

  if (shot === 'editor') {
    // Show the real editor chrome again (boot hid it for cover shots).
    document.body.classList.remove('shot-cover');
    state.slots[0].img = state.photos[0] ? state.photos[0].img : null;
    for (let i = 1; i < state.slots.length; i++) {
      state.slots[i].img = state.photos[1] ? state.photos[1].img : state.photos[0].img;
    }
    state.selected = 0;
  }

  redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; resolve(); }));
  });
}
