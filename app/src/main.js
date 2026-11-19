// Neon Coast boot: start the cover studio once the page is ready.
import { startStudio } from './editor.js';

startStudio().catch((err) => {
  const status = document.getElementById('status');
  if (status) status.textContent = `Could not start the studio: ${err.message}`;
  // eslint-disable-next-line no-console
  console.error(err);
});
