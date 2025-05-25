/* global chrome, cast */
import { useEffect, useState, useCallback } from "react";

const ADHAN_AUDIO_URL =
  "https://cdn.jsdelivr.net/gh/MusabAngudi/adhan-audio@main/adhan1.mp3";

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

  // 1-time Cast SDK initialization and configuration
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (window.chrome?.cast?.isAvailable && window.cast?.framework) {
        clearInterval(checkInterval);
        setCastReady(true);

        const context = window.cast.framework.CastContext.getInstance();
        const policy = window.chrome.cast.AutoJoinPolicy?.ORIGIN_SCOPED;
        context.setOptions({
          receiverApplicationId:
            window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          ...(policy && { autoJoinPolicy: policy }),
        });

        console.log("✅ Cast SDK is ready and configured");
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  // Function to cast only (no local play)
  const castAdhan = useCallback(() => {
    console.log("🔌 castAdhan() called, castReady =", castReady);
    if (!castReady) {
      console.warn("⚠️ Casting not ready yet.");
      return;
    }

    console.log("⏭ Requesting Cast session…");
    const context = window.cast.framework.CastContext.getInstance();
    context
      .requestSession()
      .then(() => {
        console.log("✅ Cast session granted");
        const session = context.getCurrentSession();
        const mediaInfo = new window.chrome.cast.media.MediaInfo(
          ADHAN_AUDIO_URL,
          "audio/mpeg"
        );
        mediaInfo.metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
        mediaInfo.metadata.title = "Adhan";
        mediaInfo.streamType =
          window.chrome.cast.media.StreamType.BUFFERED;

        const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
        return session.loadMedia(request);
      })
      .then(() => console.log("✅ Adhan.loadMedia() resolved"))
      .catch((e) => console.error("🚨 Cast error:", e));
  }, [castReady]);

  // Fetch prayer times and schedule casts
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
        const timeString = data.data.timings[name];
        if (!timeString) return;
        const [hh, mm] = timeString.split(":").map(Number);
        const target = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hh,
          mm,
          0
        );
        const delay = target.getTime() - now.getTime();
        if (delay > 0) {
          setTimeout(() => {
            console.log(`▶️ Casting Adhan for ${name} at ${timeString}`);
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
          {DISPLAY_ORDER.map((name) => (
            <li key={name}>
              <span className="font-semibold">{name}:</span>{" "}
              {prayerTimes[name]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-lg">Loading prayer times…</p>
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
