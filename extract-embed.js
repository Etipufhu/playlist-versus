const fs = require('fs');
const html = fs.readFileSync('embed.html', 'utf8');

const tracks = [];
// <h3 class="... TracklistRow_title..." dir="auto">TITLE</h3>
// <h4 class="... TracklistRow_subtitle..." dir="auto">ARTIST</h4>
// Or something similar

const regex = /<h3[^>]*?TracklistRow_title[^>]*?>([^<]+)<\/h3>.*?<h4[^>]*?TracklistRow_subtitle[^>]*?>(?:<span[^>]*>.*?<\/span>)?([^<]+)<\/h4>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  tracks.push({
    title: match[1].replace(/&#x27;/g, "'").trim(),
    artist: match[2].trim()
  });
}

console.log(`Found ${tracks.length} tracks:`);
console.log(tracks.slice(0, 5));
