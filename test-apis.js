const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('--- iTunes API ---');
  const itunes = await get('https://itunes.apple.com/search?term=Miley+Cyrus+Flowers&entity=song&limit=1');
  if (itunes.results && itunes.results.length > 0) {
    const track = itunes.results[0];
    console.log('Cover:', track.artworkUrl100);
    console.log('Preview:', track.previewUrl);
  } else {
    console.log('No iTunes result');
  }

  console.log('\n--- LRCLIB API ---');
  const lrc = await get('https://lrclib.net/api/search?track_name=Flowers&artist_name=Miley+Cyrus');
  if (lrc && lrc.length > 0) {
    console.log('Lyrics snippet:', lrc[0].plainLyrics ? lrc[0].plainLyrics.substring(0, 100) : 'No lyrics');
  } else {
    console.log('No LRCLIB result');
  }
}

test();
