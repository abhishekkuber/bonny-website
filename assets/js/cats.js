// Cat break: random cats (house cats + every wild cat species we can find)
// from Wikimedia Commons. Free, no API key. Photos are Creative Commons
// licensed, so we always show the credit.
//
// Per species we prefer Commons' curated "Quality images" / "Featured pictures"
// categories, and fall back to the species' own category (filtered) when the
// curated ones are thin. Photo lists are cached in localStorage for a week so
// each new photo costs a single small request.
import { ambient, burst, pick, replay, toast } from './fx.js';
import { startScene } from './scene.js';

const API = 'https://commons.wikimedia.org/w/api.php';

const HOUSE_CAT = { name: 'house cat', sci: 'Felis catus', categories: ['Quality images of cats', 'Featured pictures of cats'] };
const HOUSE_CAT_CHANCE = 0.2;

// [common name, scientific name]
const WILD = [
  ['cheetah', 'Acinonyx jubatus'],
  ['caracal', 'Caracal caracal'],
  ['African golden cat', 'Caracal aurata'],
  ['Asian golden cat', 'Catopuma temminckii'],
  ['bay cat', 'Catopuma badia'],
  ['jungle cat', 'Felis chaus'],
  ['sand cat', 'Felis margarita'],
  ['black-footed cat', 'Felis nigripes'],
  ['European wildcat', 'Felis silvestris'],
  ['African wildcat', 'Felis lybica'],
  ['Chinese mountain cat', 'Felis bieti'],
  ['jaguarundi', 'Herpailurus yagouaroundi'],
  ['pampas cat', 'Leopardus colocola'],
  ["Geoffroy's cat", 'Leopardus geoffroyi'],
  ['kodkod', 'Leopardus guigna'],
  ['Andean mountain cat', 'Leopardus jacobita'],
  ['ocelot', 'Leopardus pardalis'],
  ['oncilla', 'Leopardus tigrinus'],
  ['margay', 'Leopardus wiedii'],
  ['serval', 'Leptailurus serval'],
  ['Canada lynx', 'Lynx canadensis'],
  ['Eurasian lynx', 'Lynx lynx'],
  ['Iberian lynx', 'Lynx pardinus'],
  ['bobcat', 'Lynx rufus'],
  ['clouded leopard', 'Neofelis nebulosa'],
  ['Sunda clouded leopard', 'Neofelis diardi'],
  ["Pallas's cat", 'Otocolobus manul'],
  ['lion', 'Panthera leo'],
  ['jaguar', 'Panthera onca'],
  ['leopard', 'Panthera pardus'],
  ['tiger', 'Panthera tigris'],
  ['snow leopard', 'Panthera uncia'],
  ['marbled cat', 'Pardofelis marmorata'],
  ['leopard cat', 'Prionailurus bengalensis'],
  ['flat-headed cat', 'Prionailurus planiceps'],
  ['rusty-spotted cat', 'Prionailurus rubiginosus'],
  ['fishing cat', 'Prionailurus viverrinus'],
  ['puma', 'Puma concolor'],
].map(([name, sci]) => ({ name, sci }));

// Titles that are usually not a photo of a living cat.
const NOT_A_CAT_PHOTO = /skull|map|range|distribution|drawing|illustrat|stamp|skeleton|taxiderm|museum|specimen|coin|plate|lithograph|engraving|diagram|footprint|pelt|scat|logo|poster/i;
const MIN_CURATED = 6;

const CACHE_KEY = 'bonny.catPhotoLists.v1';
const CACHE_TTL = 7 * 24 * 3600 * 1000;

const $ = (s) => document.getElementById(s);
const frame = $('frame');
const photo = $('photo');
const nextBtn = $('next');

ambient();
const mascots = startScene();

const recent = [];
const lists = new Map(); // sci name -> Promise<string[]>

// ---------------------------------------------------------------- data

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', origin: '*', ...params })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`commons ${res.status}`);
  return res.json();
}

async function categoryPhotos(category) {
  const d = await api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmtype: 'file', cmlimit: 500 });
  return (d.query?.categorymembers ?? []).map((m) => m.title).filter((t) => /\.jpe?g$/i.test(t));
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}
function writeCache(sci, files) {
  try {
    const all = readCache();
    all[sci] = { t: Date.now(), files };
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {}
}

async function fetchList(sp) {
  const cached = readCache()[sp.sci];
  if (cached && Date.now() - cached.t < CACHE_TTL) return cached.files;

  const curatedCats = sp.categories ?? [`Quality images of ${sp.sci}`, `Featured pictures of ${sp.sci}`];
  const curated = [...new Set((await Promise.all(curatedCats.map(categoryPhotos))).flat())];
  let files = curated;
  if (curated.length < MIN_CURATED && !sp.categories) {
    const general = (await categoryPhotos(sp.sci)).filter((t) => !NOT_A_CAT_PHOTO.test(t));
    files = [...new Set([...curated, ...general])];
  }
  writeCache(sp.sci, files);
  return files;
}

function listFor(sp) {
  if (!lists.has(sp.sci)) {
    const p = fetchList(sp);
    p.catch(() => lists.delete(sp.sci)); // network error: retry next time
    lists.set(sp.sci, p);
  }
  return lists.get(sp.sci);
}

// Commons returns the artist as HTML; keep just the text.
const textOf = (html) => (html ? new DOMParser().parseFromString(html, 'text/html').body.textContent.trim() : '');

async function fileInfo(title) {
  const d = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: 1400 });
  const info = Object.values(d.query.pages)[0].imageinfo[0];
  const meta = info.extmetadata ?? {};
  return {
    src: info.thumburl || info.url,
    page: info.descriptionurl,
    artist: textOf(meta.Artist?.value) || 'unknown',
    license: meta.LicenseShortName?.value || 'see license',
    licenseUrl: meta.LicenseUrl?.value || info.descriptionurl,
  };
}

function preload(src) {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
}

async function randomCat() {
  // a few tries in case we land on a species with no usable photos
  for (let attempt = 0; attempt < 5; attempt++) {
    const sp = Math.random() < HOUSE_CAT_CHANCE ? HOUSE_CAT : pick(WILD);
    const files = await listFor(sp);
    if (!files.length) continue;
    let title = pick(files);
    for (let i = 0; i < 10 && recent.includes(title); i++) title = pick(files);
    const info = await fileInfo(title);
    await preload(info.src);
    return { ...info, title, sp };
  }
  throw new Error('no photos found');
}

// ---------------------------------------------------------------- ui

let upcoming = null; // prefetched next cat
let loading = false;

async function show() {
  if (loading) return;
  loading = true;
  nextBtn.disabled = true;
  frame.classList.add('is-loading');
  photo.classList.remove('in');

  try {
    let cat = upcoming ? await upcoming : null;
    upcoming = null;
    if (!cat) cat = await randomCat();
    render(cat);
    upcoming = randomCat().catch(() => null);
  } catch {
    toast('the cats are napping 😴 try again');
    $('name').textContent = 'no cats right now';
  } finally {
    loading = false;
    nextBtn.disabled = false;
    frame.classList.remove('is-loading');
  }
}

function render(cat) {
  recent.push(cat.title);
  if (recent.length > 25) recent.shift();

  replay(frame, 'shuffle');
  photo.src = cat.src;
  photo.alt = `a ${cat.sp.name}`;
  requestAnimationFrame(() => photo.classList.add('in'));

  $('name').textContent = cat.sp.name;
  $('sci').textContent = cat.sp.sci;

  $('credit').replaceChildren('photo: ', link(cat.artist, cat.page), ' · ', link(cat.license, cat.licenseUrl), ' · via Wikimedia Commons');

  if (Math.random() < 0.35) pick([mascots.him, mascots.her]).emote(pick(['😻', '😍', '🐾', '🥹']));
}

function link(text, href) {
  const a = document.createElement('a');
  a.textContent = text;
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

nextBtn.addEventListener('click', show);
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') show();
});

frame.querySelector('.polaroid__photo').addEventListener('dblclick', (e) => {
  burst(e.clientX, e.clientY, { count: 18, spread: 130 });
  mascots.her.emote('💕');
});

show();
