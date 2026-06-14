const https = require('https');

https.get('https://don-atento.vercel.app/providers', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const scripts = [...data.matchAll(/src="([^"]*\.js[^"]*)"/g)].map(m => m[1]);
    console.log('Scripts:', scripts.filter(s => s.includes('providers')));
    
    const pageChunk = scripts.find(s => s.includes('providers/page'));
    if (pageChunk) {
      fetchChunk(pageChunk.replace(/\?.*$/, ''));
    }
  });
});

function fetchChunk(path) {
  if (!path.startsWith('http')) path = `https://don-atento.vercel.app${path}`;
  https.get(path, (res) => {
    let js = '';
    res.on('data', chunk => js += chunk);
    res.on('end', () => {
      const parts = js.split('.filter(');
      console.log('Number of .filter() calls in chunk:', parts.length - 1);
      for (let i = 1; i < parts.length; i++) {
        // print 50 chars before and after
        const before = parts[i-1].slice(-50);
        const after = parts[i].slice(0, 50);
        console.log(`Match ${i}: ...${before}.filter(${after}...`);
      }
    });
  });
}
