const Parser = require("rss-parser");
const rssParser = new Parser();

async function main() {
  const urls = [
    "https://news.google.com/rss/search?q=loker+threads&hl=id&gl=ID&ceid=ID:id",
    "https://news.google.com/rss/search?q=lowongan+kerja+threads&hl=id&gl=ID&ceid=ID:id",
  ];
  
  for (const url of urls) {
    console.log("\nURL:", url);
    try {
      const feed = await rssParser.parseURL(url);
      console.log("Total Items:", feed.items?.length || 0);
      
      feed.items?.slice(0, 5).forEach((item: any, i: number) => {
        console.log(`\n--- Item ${i + 1} ---`);
        console.log("Title:", item.title);
        console.log("ContentSnippet:", item.contentSnippet?.substring(0, 150));
        // Coba cek kata kunci
        const text = (item.title || "") + " " + (item.contentSnippet || "");
        console.log("Has Tech:", ["backend", "laravel", "nodejs", "php", "mysql", "html", "css", "bootstrap"].some(kw => text.toLowerCase().includes(kw)));
        console.log("Has Job:", ["loker", "lowongan"].some(kw => text.toLowerCase().includes(kw)));
      });
    } catch (e: any) {
      console.error("Error:", e.message);
    }
  }
}

main();
