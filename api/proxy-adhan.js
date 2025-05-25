import fetch from "node-fetch";
cat << 'EOF' > api/proxy-adhan.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const upstream = await fetch(
    "https://cdn.jsdelivr.net/gh/MusabAngudi/adhan-audio@main/adhan1.mp3"
  );
  if (!upstream.ok) {
    return res
      .status(upstream.status)
      .send(\`Upstream error: \${upstream.statusText}\`);
  }
  const array = await upstream.arrayBuffer();

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Accept-Ranges", "bytes");
  res.send(Buffer.from(array));
}
