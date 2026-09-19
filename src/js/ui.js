/* ============================================================
   ui.js — DOM Rendering, Animations, External APIs
   
   Handles English UI, GSAP animations, iTunes Audio Previews,
   and LRCLIB Lyrics Modal.
   ============================================================ */

const UI = (() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentAudio = null;
  let currentlyPlayingBtn = null;
  
  // Real-time Socket
  let socket = null;
  let isLocalUpdate = true;

  /* ---------- Screen Management ---------- */

  function showScreen(screenId) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    const screen = $(`#${screenId}`);
    if (screen) screen.classList.add('active');
  }

  /* ---------- Input Screen ---------- */

  function showInputScreen() {
    showScreen('input-screen');
    hideError();
  }

  function setupInputHandlers() {
    const compareBtn = $('#btn-compare');
    const input1 = $('#playlist-input-1');
    const input2 = $('#playlist-input-2');

    const handleCompare = () => {
      if(socket) socket.emit('sync-start', { link1: input1.value, link2: input2.value });
      startComparison(input1.value, input2.value);
    };

    compareBtn.addEventListener('click', handleCompare);

    [input1, input2].forEach((input) => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCompare();
      });
      
      // Emit input changes
      input.addEventListener('input', (e) => {
        if (isLocalUpdate && socket) {
          socket.emit('sync-input', { id: input.id, value: input.value });
        }
      });
    });

    const newCompareBtn = $('#btn-new-compare');
    if (newCompareBtn) {
      newCompareBtn.addEventListener('click', () => {
        input1.value = '';
        input2.value = '';
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        if (socket) socket.emit('sync-reset');
        showInputScreen();
      });
    }

    // Modal close
    $('.modal-close').addEventListener('click', closeModal);
    $('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === $('.modal-overlay')) closeModal();
    });
  }

  function setupSocket() {
    if (typeof io !== 'undefined') {
      socket = io({ transports: ['websocket'] });
      
      socket.on('sync-input', (data) => {
        const input = $(`#${data.id}`);
        if (input) {
          isLocalUpdate = false;
          input.value = data.value;
          isLocalUpdate = true;
        }
      });

      socket.on('sync-start', (data) => {
        $('#playlist-input-1').value = data.link1;
        $('#playlist-input-2').value = data.link2;
        startComparison(data.link1, data.link2);
      });

      socket.on('sync-reset', () => {
        $('#playlist-input-1').value = '';
        $('#playlist-input-2').value = '';
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        showInputScreen();
      });
    }
  }

  /* ---------- Comparison Flow ---------- */

  async function startComparison(link1, link2) {
    hideError();

    let playlistId1, playlistId2;
    try {
      playlistId1 = SpotifyAPI.extractPlaylistId(link1);
    } catch (e) {
      showError('Player 1 Error', e.message);
      return;
    }
    try {
      playlistId2 = SpotifyAPI.extractPlaylistId(link2);
    } catch (e) {
      showError('Player 2 Error', e.message);
      return;
    }

    if (playlistId1 === playlistId2) {
      showError('Same Playlist', 'Please enter two different playlists!');
      return;
    }

    showLoadingScreen();

    try {
      const results = await Compare.comparePlayists(playlistId1, playlistId2, (progress) => {
        updateLoadingProgress(progress);
      });

      showResultsScreen(results);
    } catch (err) {
      showInputScreen();
      showError('Comparison Error', err.message);
    }
  }

  /* ---------- Loading Screen ---------- */

  function showLoadingScreen() {
    showScreen('loading-screen');
    const progressBar = $('#loading-progress-bar');
    if (progressBar) progressBar.style.width = '0%';
  }

  function updateLoadingProgress({ phase, message, progress }) {
    const msgEl = $('#loading-message');
    const progressBar = $('#loading-progress-bar');
    if (msgEl) msgEl.textContent = message || '';
    if (progressBar) progressBar.style.width = `${progress || 0}%`;
  }

  /* ---------- Results Screen ---------- */

  function showResultsScreen(results) {
    showScreen('results-screen');
    renderPlaylistCards(results);
    renderScoreSection(results);
    renderCommonSection(results);
  }

  function renderPlaylistCards(results) {
    const { playlist1, playlist2 } = results;

    const setupCard = (player, data) => {
      const cover = $(`#playlist-cover-${player}`);
      const name = $(`#playlist-name-${player}`);
      const owner = $(`#playlist-owner-${player}`);
      const count = $(`#playlist-track-count-${player}`);
      if (cover) cover.src = data.info.coverImage || '';
      if (name) name.textContent = data.info.name;
      if (owner) owner.textContent = `by ${data.info.ownerName}`;
      if (count) count.textContent = `${data.trackCount} songs`;
    };

    setupCard('1', playlist1);
    setupCard('2', playlist2);
    setupTiltEffect($$('.playlist-card'));
  }

  /* ---------- Score Ring + Count-up ---------- */

  function renderScoreSection(results) {
    const { finalScore } = results;
    const scoreLabel = Compare.getScoreLabel(finalScore);

    const scoreValueEl = $('#score-value');
    const scoreLabelEl = $('#score-label');
    const scoreDescEl = $('#score-description');
    const scoreRingFill = $('#score-ring-fill');

    if (scoreLabelEl) scoreLabelEl.textContent = `${scoreLabel.emoji} ${scoreLabel.label}`;
    if (scoreDescEl) scoreDescEl.textContent = getScoreDescription(finalScore);

    if (scoreRingFill) {
      const circumference = 2 * Math.PI * 100;
      const offset = circumference - (finalScore / 100) * circumference;
      scoreRingFill.style.strokeDasharray = circumference;
      scoreRingFill.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        setTimeout(() => {
          scoreRingFill.style.strokeDashoffset = offset;
        }, 100);
      });
    }

    if (scoreValueEl && typeof gsap !== 'undefined') {
      const counter = { value: 0 };
      gsap.to(counter, {
        value: finalScore,
        duration: 2.5,
        ease: 'power2.out',
        delay: 0.3,
        onUpdate: () => {
          scoreValueEl.textContent = Math.round(counter.value);
        },
        onComplete: () => {
          if (finalScore >= 60 && typeof confetti !== 'undefined') {
            fireConfetti(finalScore);
          }
        },
      });
    } else if (scoreValueEl) {
      scoreValueEl.textContent = finalScore;
    }
  }

  function getScoreDescription(score) {
    if (score >= 90) return 'These playlists are practically mirror images of each other!';
    if (score >= 75) return 'Your musical tastes align beautifully — a near perfect match!';
    if (score >= 60) return 'Strong common ground. You should definitely make a playlist together!';
    if (score >= 45) return 'Some nice intersections amidst different vibes.';
    if (score >= 30) return 'Different musical worlds with a few surprising bridges.';
    if (score >= 15) return 'Very different tastes, but variety is the spice of life!';
    return 'Complete musical opposites — opposites attract?';
  }

  /* ---------- Confetti ---------- */

  function fireConfetti(score) {
    const intensity = Math.min(score / 100, 1);
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30 * intensity,
      colors: ['#b829ff', '#00f0ff', '#ff6b2b', '#39ff14', '#ff2d55'],
    };

    confetti({ ...defaults, particleCount: Math.floor(40 * intensity), origin: { x: 0.3, y: 0.5 } });
    setTimeout(() => {
      confetti({ ...defaults, particleCount: Math.floor(50 * intensity), origin: { x: 0.7, y: 0.4 } });
    }, 200);
    setTimeout(() => {
      confetti({ ...defaults, particleCount: Math.floor(30 * intensity), origin: { x: 0.5, y: 0.6 } });
    }, 400);
  }

  /* ---------- Common Tracks / Artists + iTunes Integration ---------- */

  async function renderCommonSection(results) {
    const { content } = results.components;
    const tracksContainer = $('#common-tracks-list');
    const artistsContainer = $('#common-artists-list');
    const trackCountEl = $('#common-track-count');
    const artistCountEl = $('#common-artist-count');
    const commonSection = $('#common-section');

    const hasCommon = content.commonTracks.length > 0 || content.commonArtists.length > 0;

    if (!hasCommon) {
      if (commonSection) commonSection.style.display = 'none';
      return;
    }

    if (commonSection) commonSection.style.display = '';
    
    if (artistCountEl) artistCountEl.textContent = content.commonArtists.length;
    if (artistsContainer) {
      artistsContainer.innerHTML = '';
      content.commonArtists.slice(0, 20).forEach((artist, index) => {
        const div = document.createElement('div');
        div.className = 'common-item artist-item';
        div.innerHTML = `
          <div class="common-item-info">
            <div class="common-item-name">${escapeHtml(artist.name)}</div>
          </div>
        `;
        artistsContainer.appendChild(div);
        
        // GSAP Animation
        gsap.fromTo(div, 
          { opacity: 0, y: 20 }, 
          { opacity: 1, y: 0, duration: 0.4, delay: 0.5 + (index * 0.05), ease: "power2.out" }
        );
      });
    }

    if (trackCountEl) trackCountEl.textContent = content.commonTracks.length;
    if (tracksContainer) {
      tracksContainer.innerHTML = '';
      
      const tracksToRender = content.commonTracks.slice(0, 20);
      
      tracksToRender.forEach((track, index) => {
        const artistNames = track.artists.map(a => a.name).join(', ');
        
        const div = document.createElement('div');
        div.className = 'common-item track-item';
        div.innerHTML = `
          <button class="play-btn" style="visibility:hidden;">▶</button>
          <div class="track-cover-container">
            <div class="common-item-img fallback"></div>
          </div>
          <div class="common-item-info">
            <div class="common-item-name">${escapeHtml(track.name)}</div>
            <div class="common-item-sub">${escapeHtml(artistNames)}</div>
          </div>
          <button class="info-btn">Lyrics</button>
        `;
        
        tracksContainer.appendChild(div);
        
        // GSAP Animation
        gsap.fromTo(div, 
          { opacity: 0, x: -20 }, 
          { opacity: 1, x: 0, duration: 0.4, delay: 0.5 + (index * 0.05), ease: "power2.out" }
        );

        // Fetch cover and preview asynchronously
        fetchITunesData(track.name, artistNames).then(itunesData => {
          if (itunesData) {
            const imgContainer = div.querySelector('.track-cover-container');
            const fallback = div.querySelector('.fallback');
            
            const img = document.createElement('img');
            img.className = 'common-item-img';
            img.src = itunesData.cover;
            img.alt = track.name;
            
            imgContainer.replaceChild(img, fallback);

            if (itunesData.preview) {
              const playBtn = div.querySelector('.play-btn');
              playBtn.style.visibility = 'visible';
              
              playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlay(itunesData.preview, playBtn);
              });
            }
          }
        });

        // Click to open modal
        div.addEventListener('click', () => {
          openModal(track.name, artistNames);
        });
      });
    }
  }

  async function fetchITunesData(trackName, artistName) {
    try {
      const term = encodeURIComponent(`${trackName} ${artistName}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          cover: data.results[0].artworkUrl100,
          preview: data.results[0].previewUrl
        };
      }
    } catch (e) {
      console.error('iTunes fetch error:', e);
    }
    return null;
  }

  function togglePlay(url, btnElement) {
    let audio = $('#audio-player');
    
    // If clicking the same button that is currently playing
    if (currentlyPlayingBtn === btnElement && !audio.paused) {
      audio.pause();
      btnElement.textContent = '▶';
      currentlyPlayingBtn = null;
      return;
    }
    
    // Reset previous button
    if (currentlyPlayingBtn) {
      currentlyPlayingBtn.textContent = '▶';
    }

    audio.src = url;
    audio.play();
    btnElement.textContent = '⏸';
    currentlyPlayingBtn = btnElement;

    audio.onended = () => {
      btnElement.textContent = '▶';
      currentlyPlayingBtn = null;
    };
  }

  async function fetchMusicBrainzData(trackName, artistName) {
    try {
      // First, get the artist ID and tags
      const aTerm = encodeURIComponent(artistName);
      const aRes = await fetch(`https://musicbrainz.org/ws/2/artist?query=${aTerm}&fmt=json`);
      const aData = await aRes.json();
      
      let tags = [];
      if (aData.artists && aData.artists.length > 0) {
        tags = aData.artists[0].tags || [];
      }

      // Then get the recording (song) info
      const query = encodeURIComponent(`recording:"${trackName}" AND artist:"${artistName}"`);
      const res = await fetch(`https://musicbrainz.org/ws/2/recording?query=${query}&fmt=json`);
      const data = await res.json();
      
      if (data.recordings && data.recordings.length > 0) {
        const rec = data.recordings[0];
        let album = '';
        let date = '';
        if (rec.releases && rec.releases.length > 0) {
          album = rec.releases[0].title;
          date = rec.releases[0].date;
        }
        return { album, date, tags };
      }
    } catch (e) {
      console.error('MusicBrainz fetch error:', e);
    }
    return null;
  }

  /* ---------- Lyrics Modal (LRCLIB) ---------- */

  async function openModal(trackName, artistName) {
    const modal = $('#track-modal');
    $('#modal-title').textContent = trackName;
    $('#modal-artist').textContent = artistName;
    $('#modal-cover').style.display = 'none';
    $('#modal-lyrics').innerHTML = '';
    $('#modal-lyrics-loader').style.display = 'block';
    
    modal.classList.add('visible');
    $('#modal-rich-info').style.display = 'none';
    $('#modal-rich-info').innerHTML = '';

    // Fetch MusicBrainz data for rich info
    fetchMusicBrainzData(trackName, artistName).then(data => {
      if (data) {
        let html = '';
        if (data.album) html += `<div class="rich-item"><span class="rich-label">Album</span><span class="rich-value">${escapeHtml(data.album)}</span></div>`;
        if (data.date) html += `<div class="rich-item"><span class="rich-label">Release Year</span><span class="rich-value">${escapeHtml(data.date.substring(0, 4))}</span></div>`;
        if (data.tags && data.tags.length > 0) {
          const tags = data.tags.slice(0, 3).map(t => t.name).join(', ');
          html += `<div class="rich-item"><span class="rich-label">Genres</span><span class="rich-value">${escapeHtml(tags)}</span></div>`;
        }
        if (html) {
          $('#modal-rich-info').innerHTML = html;
          $('#modal-rich-info').style.display = 'flex';
        }
      }
    });

    // Fetch cover for modal
    fetchITunesData(trackName, artistName).then(data => {
      if (data && data.cover) {
        $('#modal-cover').src = data.cover.replace('100x100', '300x300'); // Higher res
        $('#modal-cover').style.display = 'block';
      }
    });

    // Fetch Lyrics
    try {
      const t = encodeURIComponent(trackName);
      const a = encodeURIComponent(artistName);
      const res = await fetch(`https://lrclib.net/api/search?track_name=${t}&artist_name=${a}`);
      const data = await res.json();
      
      $('#modal-lyrics-loader').style.display = 'none';
      
      if (data && data.length > 0 && data[0].plainLyrics) {
        const lyricsHTML = escapeHtml(data[0].plainLyrics).replace(/\n/g, '<br>');
        $('#modal-lyrics').innerHTML = lyricsHTML;
      } else {
        $('#modal-lyrics').innerHTML = '<em>Lyrics not found for this track.</em>';
      }
    } catch (e) {
      $('#modal-lyrics-loader').style.display = 'none';
      $('#modal-lyrics').innerHTML = '<em>Failed to load lyrics.</em>';
    }
  }

  function closeModal() {
    $('#track-modal').classList.remove('visible');
    // Stop audio if playing in modal (currently we only play on the track item, but just in case)
  }

  /* ---------- 3D Tilt Effect ---------- */

  function setupTiltEffect(cards) {
    cards.forEach((card) => {
      const inner = card.querySelector('.playlist-card-inner') || card;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        inner.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        inner.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
      });
    });
  }

  /* ---------- Error Display ---------- */

  function showError(title, detail) {
    const activeScreen = $('.screen.active');
    const container = activeScreen?.querySelector('.error-container') || $('#error-container');

    if (container) {
      const msgEl = container.querySelector('.error-message');
      const detailEl = container.querySelector('.error-detail');
      container.classList.add('visible');
      if (msgEl) msgEl.textContent = title;
      if (detailEl) detailEl.textContent = detail || '';
    }
  }

  function hideError() {
    $$('.error-container').forEach((c) => c.classList.remove('visible'));
  }

  /* ---------- Utilities ---------- */

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Initialization ---------- */

  function init() {
    setupSocket();
    setupInputHandlers();

    $$('.btn-retry').forEach((btn) => {
      btn.addEventListener('click', hideError);
    });

    showInputScreen();
  }

  return {
    init,
    showInputScreen,
    showError,
    hideError,
  };
})();

document.addEventListener('DOMContentLoaded', UI.init);
