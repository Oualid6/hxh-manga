const provider = require('../providers/weebcentral-provider');

async function main() {
  console.log('Fetching latest chapter from WeebCentral...');
  const latest = await provider.getLatestChapter();
  console.log('Latest chapter:', latest);

  console.log('Fetching latest chapters list...');
  const list = await provider.getLatestChaptersList();
  console.log('First 5 chapters in list:', list.slice(0, 5));

  if (latest && latest.id) {
    console.log(`Fetching images for latest chapter (ID: ${latest.id})...`);
    const images = await provider.getChapterImages(latest.id);
    console.log(`Fetched ${images.length} images.`);
    if (images.length > 0) {
      console.log('Sample image URL:', images[0]);
    }
  }
}

main().catch(console.error);
