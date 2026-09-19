/* ============================================================
   spotify.js — Spotify Web API Wrapper (via Cloudflare Worker Proxy)
   
   Uses the custom Embed HTML Scraper to fetch playlist data without auth!
   ============================================================ */

const SpotifyAPI = (() => {
  let PROXY_URL = 'https://playlist-versus-proxy.YOUR_SUBDOMAIN.workers.dev';

  function setProxyUrl(url) {
    PROXY_URL = url.replace(/\/$/, ''); // Remove trailing slash
  }

  function getProxyUrl() {
    return PROXY_URL;
  }

  /* ---------- Helpers ---------- */

  function extractPlaylistId(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Playlist linki veya ID gerekli.');
    }

    const trimmed = input.trim();

    const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]{22})/);
    if (urlMatch) return urlMatch[1];

    const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
    if (uriMatch) return uriMatch[1];

    const idMatch = trimmed.match(/^[a-zA-Z0-9]{22}$/);
    if (idMatch) return trimmed;

    throw new Error('Geçersiz playlist formatı. Spotify playlist URL, URI veya ID girin.');
  }

  async function getPlaylistData(playlistId) {
    const url = `${PROXY_URL}/api/scrape/${playlistId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Bilinmeyen bir hata oluştu');
    }

    if (data.tracks.length === 0) {
      throw new Error('Playlist boş veya okunamıyor.');
    }

    return data;
  }

  /* ---------- Public API ---------- */
  return {
    extractPlaylistId,
    getPlaylistData,
    setProxyUrl,
    getProxyUrl,
  };
})();
