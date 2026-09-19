const fs = require('fs');
const html = fs.readFileSync('playlist.html', 'utf8');
const match = html.match(/<script id="initial-state" type="text\/plain">([^<]+)<\/script>/);
if (match) {
  const data = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  
  // Find where tracks are stored
  fs.writeFileSync('initial-state.json', JSON.stringify(data, null, 2));
  console.log('Saved initial-state.json. Keys:', Object.keys(data));
} else {
  console.log('No match found');
}
