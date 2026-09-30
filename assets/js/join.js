// Invite landing page: join.html#invite=<code>
import { join, whoami } from './db.js';
import { ambient } from './fx.js';

ambient(10);

const $ = (id) => document.getElementById(id);
const show = (emoji, title, msg, showButton = false) => {
  $('emoji').textContent = emoji;
  $('title').textContent = title;
  $('msg').textContent = msg;
  $('go').hidden = !showButton;
};

const code = new URLSearchParams(location.hash.slice(1)).get('invite');
// Scrub the code from the address bar and history straight away.
history.replaceState(null, '', location.pathname);

try {
  const me = await whoami();
  if (me) {
    show('💖', `welcome back, ${me.nickname}`, "you're already in.", true);
  } else if (!code) {
    show('🔒', 'invite only', 'ask kubie for your invite link.');
  } else {
    await join(code.trim());
    const joined = await whoami();
    show('💖', `you're in, ${joined?.nickname ?? ''}!`, 'this browser is now remembered.', true);
  }
} catch (err) {
  const used = /invalid|already used/i.test(err.message ?? '');
  show('😢', used ? 'that link has been used' : 'something went wrong', used ? 'ask kubie for a fresh one.' : String(err.message ?? err));
}
