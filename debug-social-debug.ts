const Parser = require("rss-parser");

const rssParser = new Parser();

async function test() {
  const urls = [
    "https://news.google.com/rss/search?q=loker+threads&hl=id&gl=ID&ceid=ID:id",
    "https://news.google.com/rss/search?q=lowongan+kerja+threads&hl=id&gl=ID&ceid=ID:id",
  ];
  for (const url of urls) {
    console.log("\nURL:", url);
    try {
      const feed = await rssParser.parseURL(url);
      console.log("Items:", feed.items?.length);
      if (feed.items) {
        feed.items.slice(0, 2).forEach((item: any, i: number) => {
          console.log(`\n--- Item ${i + 1} ---`);
          console.log("Title:", item.title);
          console.log("Content:", item.content);
          console.log("ContentSnippet:", item.contentSnippet);
        });
      }
    } catch (e) {
      console.error("Error:", (e as Error).message);
    }
  }
}

test();
