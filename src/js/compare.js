/* ============================================================
   compare.js — Playlist Comparison & Score Calculation (Lite Version)
   
   Since we use the Scraper, we only have Track Names and Artists.
   Score is 100% based on Common Tracks and Common Artists.
   ============================================================ */

const Compare = (() => {

  function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  function computeContentScore(tracks1, tracks2) {
    const trackSet1 = new Set(tracks1.map(t => t.name.toLowerCase()));
    const trackSet2 = new Set(tracks2.map(t => t.name.toLowerCase()));
    const trackJaccard = jaccardSimilarity(trackSet1, trackSet2);

    const artistSet1 = new Set(tracks1.flatMap(t => t.artists.map(a => a.name.toLowerCase())));
    const artistSet2 = new Set(tracks2.flatMap(t => t.artists.map(a => a.name.toLowerCase())));
    const artistJaccard = jaccardSimilarity(artistSet1, artistSet2);

    // Common tracks detailed (Preserve original casing)
    const commonTrackNamesLower = [...trackSet1].filter(id => trackSet2.has(id));
    const commonTracks = [];
    const seenTracks = new Set();
    
    tracks1.forEach(t => {
      const lower = t.name.toLowerCase();
      if (commonTrackNamesLower.includes(lower) && !seenTracks.has(lower)) {
        commonTracks.push(t);
        seenTracks.add(lower);
      }
    });

    // Common artists detailed (Preserve original casing)
    const commonArtistNamesLower = [...artistSet1].filter(id => artistSet2.has(id));
    const commonArtists = [];
    const seenArtists = new Set();

    tracks1.forEach(t => {
      t.artists.forEach(a => {
        const lower = a.name.toLowerCase();
        if (commonArtistNamesLower.includes(lower) && !seenArtists.has(lower)) {
          commonArtists.push(a);
          seenArtists.add(lower);
        }
      });
    });

    const score = (trackJaccard * 0.7 + artistJaccard * 0.3) * 100;

    return {
      score,
      commonTracks,
      commonArtists,
      details: {
        trackJaccard: trackJaccard * 100,
        artistJaccard: artistJaccard * 100,
        commonTrackCount: commonTrackNamesLower.length,
        commonArtistCount: commonArtistNamesLower.length,
      },
    };
  }

  async function comparePlayists(playlistId1, playlistId2, onProgress) {
    const progress = (phase, message, pct) => {
      if (onProgress) onProgress({ phase, message, progress: pct });
    };

    progress('info', 'Loading Player 1...', 20);
    const data1 = await SpotifyAPI.getPlaylistData(playlistId1);
    
    progress('tracks', 'Loading Player 2...', 50);
    const data2 = await SpotifyAPI.getPlaylistData(playlistId2);

    progress('scoring', 'Analyzing musical taste...', 80);
    const contentResult = computeContentScore(data1.tracks, data2.tracks);
    
    let finalScore = Math.pow(contentResult.score / 100, 0.6) * 100;
    if (finalScore > 100) finalScore = 100;

    progress('done', 'Results ready!', 100);

    return {
      finalScore: Math.round(finalScore),
      playlist1: { info: data1, trackCount: data1.totalTracks },
      playlist2: { info: data2, trackCount: data2.totalTracks },
      components: {
        content: { ...contentResult, weight: 100 }
      },
    };
  }

  function getScoreLabel(score) {
    if (score >= 90) return { label: 'SOULMATES!', emoji: '💖', tier: 'legendary' };
    if (score >= 75) return { label: 'PERFECT MATCH', emoji: '🔥', tier: 'epic' };
    if (score >= 60) return { label: 'STRONG SYNERGY', emoji: '⚡', tier: 'great' };
    if (score >= 45) return { label: 'GOOD CONNECTION', emoji: '🎯', tier: 'good' };
    if (score >= 30) return { label: 'MODERATE TASTE', emoji: '🤝', tier: 'moderate' };
    if (score >= 15) return { label: 'DIFFERENT FREQUENCIES', emoji: '📻', tier: 'low' };
    return { label: 'POLAR OPPOSITES', emoji: '💥', tier: 'minimal' };
  }

  return {
    comparePlayists,
    getScoreLabel
  };
})();
