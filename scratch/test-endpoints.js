const fs = require('fs');

async function test() {
  console.log('--- Testing Production HTTP Endpoints ---');

  // 1. /en/chapter/419
  const r1 = await fetch('http://localhost:8000/en/chapter/419');
  console.log('1. /en/chapter/419 status:', r1.status);
  const t1 = await r1.text();
  console.log('   Contains "Chapter 419":', t1.includes('Chapter 419'));

  // 2. /en/chapters
  const r2 = await fetch('http://localhost:8000/en/chapters');
  console.log('2. /en/chapters status:', r2.status);
  const t2 = await r2.text();
  console.log('   Contains "Chapter 419":', t2.includes('Chapter 419'));

  // 3. /en/ (Homepage)
  const r3 = await fetch('http://localhost:8000/en/');
  console.log('3. /en/ homepage status:', r3.status);
  const t3 = await r3.text();
  console.log('   Contains "Ongoing · Chapter 419":', t3.includes('Ongoing · Chapter 419'));
  console.log('   Contains chapter count 419:', t3.includes('id="stat-chapters-count">419<'));

  // 4. /chapter-images?ch=419
  const r4 = await fetch('http://localhost:8000/chapter-images?ch=419');
  console.log('4. /chapter-images?ch=419 status:', r4.status);
  const j4 = await r4.json();
  console.log('   Chapter 419 pages returned:', j4.images ? j4.images.length : 0);

  // 5. Proxy Image Test
  if (j4.images && j4.images.length > 0) {
    const proxyUrl = 'http://localhost:8000/proxy-image?url=' + encodeURIComponent(j4.images[0]);
    const r5 = await fetch(proxyUrl);
    console.log('5. Proxy image status:', r5.status, 'Content-Type:', r5.headers.get('content-type'));
  }
}

test().catch(console.error);
