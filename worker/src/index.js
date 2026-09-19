/**
 * Cloudflare Worker for scraping Spotify Embed pages
 * Returns a JSON representation of the playlist up to 100 tracks.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow /api/scrape/:id
    const match = url.pathname.match(/^\/api\/scrape\/([a-zA-Z0-9]{22})$/);
    if (!match) {
      return addCorsHeaders(new Response('Not Found', { status: 404 }), origin);
    }

    const playlistId = match[1];

    try {
      // Scrape from Embed page
      const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
      const embedResponse = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!embedResponse.ok) {
        return addCorsHeaders(new Response(JSON.stringify({ error: `Playlist bulunamadı veya gizli (${embedResponse.status})` }), { status: 404 }), origin);
      }

      const html = await embedResponse.text();

      // Extract Playlist Title
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/);
      let name = titleMatch ? titleMatch[1].replace(' | Spotify Playlist', '').trim() : 'Unknown Playlist';

      // Extract Cover Image
      const imgMatch = html.match(/<img[^>]*class="[^"]*CoverArtBase[^"]*"[^>]*src="([^"]+)"/);
      const coverImage = imgMatch ? imgMatch[1] : null;

      // Extract Tracks
      const tracks = [];
      const trackRegex = /<h3[^>]*?TracklistRow_title[^>]*?>([^<]+)<\/h3>.*?<h4[^>]*?TracklistRow_subtitle[^>]*?>(?:<span[^>]*>.*?<\/span>)?([^<]+)<\/h4>/g;
      
      let trackMatch;
      while ((trackMatch = trackRegex.exec(html)) !== null) {
        // Handle HTML entities if any (like &#x27;)
        const trackName = trackMatch[1].replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
        const artistNameStr = trackMatch[2].replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
        
        // Artists are comma separated
        const artists = artistNameStr.split(',').map(a => ({ name: a.trim() }));

        tracks.push({
          id: trackName + '-' + artists[0].name, // Fake ID based on name and artist
          name: trackName,
          artists: artists
        });
      }

      const result = {
        id: playlistId,
        name,
        coverImage,
        ownerName: 'Spotify', // Embed doesn't clearly give owner name always
        totalTracks: tracks.length,
        tracks
      };

      return addCorsHeaders(
        new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600' // Cache for 1 hour to prevent spam
          }
        }),
        origin
      );

    } catch (err) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        origin
      );
    }
  },
};

function addCorsHeaders(response, origin) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
