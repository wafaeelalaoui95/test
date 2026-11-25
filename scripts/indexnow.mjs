// Tell Bing (and the other IndexNow engines) that pages changed. ChatGPT search
// relies on Bing's index, so new guides get picked up sooner.
//
// Usage (after a deploy):  node scripts/indexnow.mjs
//   or for specific pages: node scripts/indexnow.mjs /alternatives-dhl /envoyer-colis-maroc
// With no arguments it submits every URL in the live sitemap.
//
// The key is public by design: IndexNow checks that https://jibly.io/<key>.txt
// contains it, which proves we own the site.

const HOST = 'jibly.io';
const KEY = '146f64316c844518f1d36e7c3a648b27';

let urls = process.argv.slice(2).map((p) => `https://${HOST}${p.startsWith('/') ? p : `/${p}`}`);
if (urls.length === 0) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} — ${urls.length} URL(s)`);
