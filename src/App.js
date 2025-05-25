/* global chrome, cast */
import { useEffect, useState, useCallback } from "react";

const ADHAN_AUDIO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const DISPLAY_ORDER = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Sunset",
  "Maghrib",
  "Isha",
];

export default function App() {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [castReady, setCastReady] = useState(false);

  // 1-time Cast SDK init & configure
  useEffect(() => {
    const intv = setInterval(() => {
      if (window.chrome?.cast?.isAvailable && window.cast?.framework) {
        clearInterval(intv);
        setCastReady(true);

        const ctx = window.cast.framework.CastContext.getInstance();
        const policy = window.chrome.cast.AutoJoinPolicy?.ORIGIN_SCOPED;
        ctx.setOptions({
          receiverApplicationId:
            window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          ...(policy && { autoJoinPolicy: policy }),
        });

        console.log("✅ Cast SDK is ready and configured");
      }
    }, 500);
    return () => clearInterval(intv);
  }, []);

  // Instrumented castAdhan
  const castAdhan = useCallback(() => {
    console.log("🔌 castAdhan() called, castReady =", castReady);
    if (!castReady) {
      console.warn("⚠️ Casting not ready yet.");
      return;
    }
    console.log("⏭ Requesting Cast session…");
    const ctx = window.cast.framework.CastContext.getInstance();
    ctx
      .requestSession()
      .then(() => {
        console.log("✅ Cast session granted");
        const session = ctx.getCurrentSession();
        const mediaInfo = new window.chrome.cast.media.MediaInfo(
          ADHAN_AUDIO_URL,
          "video/mp4"
        );
        mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
        mediaInfo.metadata.title = "Big Buck Bunny (Test)";
        mediaInfo.streamType = window.chrome.cast.media.StreamType.BUFFERED;

        const req = new window.chrome.cast.media.LoadRequest(mediaInfo);
        console.log("▶️ Sending loadMedia for", ADHAN_AUDIO_URL);
        return session.loadMedia(req);
      })
      .then(() => console.log("✅ Adhan.loadMedia() resolved"))
      .catch((e) => console.error("🚨 Cast error:", e));
  }, [castReady]);

  // Fetch prayer times and schedule (untouched)
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;
      const res = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=3&madhab=Shafi`
      );
      const data = await res.json();
      setPrayerTimes(data.data.timings);

      const now = new Date();
      DISPLAY_ORDER.forEach((name) => {
        const t = data.data.timings[name];
        if (!t) return;
        const [hh, mm] = t.split(":").map(Number);
        const target = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hh,
          mm
        );
        const delay = target.getTime() - now.getTime();
        if (delay > 0) {
          setTimeout(() => {
            console.log(`▶️ Casting scheduled for ${name} at ${t}`);
            castAdhan();
          }, delay);
        }
      });
    });
  }, [castAdhan]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Today's Prayer Times</h1>

      {prayerTimes ? (
        <ul className="space-y-2 text-xl">
          {DISPLAY_ORDER.map((n) => (
            <li key={n}>
              <strong>{n}:</strong> {prayerTimes[n]}
            </li>
          ))}
        </ul>
      ) : (
        <p>Loading prayer times…</p>
      )}

      <div className="mb-4 mt-8">
        <google-cast-launcher style={{ width: 48, height: 48 }} />
      </div>

      <button
        onClick={castAdhan}
        disabled={!castReady}
        className={`px-6 py-3 rounded-lg text-lg ${
          castReady
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-400 text-gray-700 cursor-not-allowed"
        }`}
      >
        Cast Adhan Now
      </button>
    </div>
  );
}
