# 🎮 Playlist Versus

A gaming/esports-themed web application that compares two Spotify playlists and calculates a **mutual taste score**.

> **No login, no account creation.** Just paste two playlist links and see the result.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🚀 **Zero Login** — Users don't need to create an account or log in
- 🎵 **Deep Analysis** — Compares tracks, artists, genres, popularity, and eras
- 📊 **4-Component Score** — Mutual content, genre similarity, popularity profile, release era
- 🎨 **Gaming/Esports Theme** — Spotify dark mode colors, dynamic patterns, 3D card animations
- 📈 **Radar Chart** — Interactive chart visualizing genre profiles
- 🎉 **Confetti** — Celebration animation for high compatibility scores
- 📱 **Responsive** — Works flawlessly on desktop and mobile
- 🤝 **Multiplayer Room (Live Sync)** — Real-time comparison with your friend on the same network/server
- 🧠 **Rich Metadata (MusicBrainz)** — Clicking on a track merges data from MusicBrainz, iTunes, and LRCLIB

## 🏗 Architecture

```
User → Local Node Server (Express + WebSockets)
                ↓
         Cloudflare Worker (Free API proxy)
                ↓
           Spotify Web API
```

- **Frontend**: Vanilla HTML/CSS/JS — Can be hosted anywhere
- **Backend**: Node.js + Socket.io for live sync, Cloudflare Worker for Spotify Client Credentials flow
- **Why Cloudflare Worker?**: Keeps the Client Secret secure without requiring users to log in

## 🚀 Installation & Usage

### 1. Run on Your Computer (One-Click Setup)

After downloading the project, you can start the local server and live sync features instantly:
- **Windows:** Double click the `start.bat` file.
- **Mac/Linux:** Run `./start.sh` in your terminal.

Your browser will automatically open and the project will start running at `http://localhost:3000`. You can test the live sync (Multiplayer) experience by having your friends connect via your local IP address (e.g., `http://192.168.1.5:3000`) on the same network.

### 2. Set Up Your Own Spotify Developer App (Optional)

If you want to deploy your own Cloudflare Worker proxy instead of using the default one:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new App and copy your **Client ID** and **Client Secret**
3. Deploy the Cloudflare Worker:
   ```bash
   cd worker
   npx wrangler deploy
   npx wrangler secret put SPOTIFY_CLIENT_ID
   npx wrangler secret put SPOTIFY_CLIENT_SECRET
   ```
4. Update the `WORKER_PROXY_URL` in `index.html` with your new Worker URL.

## 📐 Score Calculation

| Component | Weight | Metric | Source |
|---|---|---|---|
| Mutual Content | 40% | Jaccard Similarity (track + artist) | Playlist Tracks |
| Genre Similarity | 35% | Jaccard Similarity (genre sets) | Artist Endpoints |
| Popularity Profile | 15% | Cosine Similarity (popularity histogram) | Track Popularity |
| Release Era | 10% | Cosine Similarity (decade distribution) | Album Release Date |

## 🛠 Technology Stack

- **Vanilla HTML/CSS/JS** — No build tools required
- **Node.js + Express + Socket.io** — Local real-time synchronization server
- **Cloudflare Worker** — Free API proxy (100K requests/day)
- [GSAP](https://greensock.com/gsap/) — Animations
- [Chart.js](https://www.chartjs.org/) — Radar chart
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — Celebration effects
- [Google Fonts](https://fonts.google.com/) — Montserrat

## 📁 Folder Structure

```
PLVersus/
├── index.html          # Main page (input + loading + results)
├── src/
│   ├── js/
│   │   ├── spotify.js  # API wrapper (via Worker proxy)
│   │   ├── compare.js  # Score calculation logic
│   │   └── ui.js       # DOM rendering + animations + WebSockets
│   └── css/
│       └── style.css   # Gaming/esports theme styles
├── worker/
│   ├── src/index.js    # Cloudflare Worker (API proxy)
│   └── wrangler.toml   # Worker configuration
├── server.js           # Local Node.js backend
├── start.bat           # One-click start for Windows
├── start.sh            # One-click start for Mac/Linux
├── README.md
└── LICENSE
```

## 📄 License

[MIT](LICENSE)
