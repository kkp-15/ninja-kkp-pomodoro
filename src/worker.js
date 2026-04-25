// シェアURL（?v=VIDEO_ID）に対して、動画サムネ等をOGタグに動的注入するWorker
// それ以外のリクエストは静的アセットをそのまま返す

const SITE_ORIGIN = 'https://pomodoro.kkpwebninja.com';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

async function fetchYouTubeTitle(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cf: { cacheEverything: true, cacheTtl: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (_) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isHtml = url.pathname === '/' || url.pathname === '/index.html';
    const videoId = url.searchParams.get('v');

    if (!isHtml || !videoId || !VIDEO_ID_RE.test(videoId)) {
      return env.ASSETS.fetch(request);
    }

    const asset = await env.ASSETS.fetch(request);
    const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const shareUrl = `${SITE_ORIGIN}/?v=${videoId}`;

    const title = await fetchYouTubeTitle(videoId);
    const ogTitle = title
      ? `「${title}」でポモドーロ｜ポモドーロタイマー`
      : 'おすすめ動画つきポモドーロ｜ポモドーロタイマー';
    const ogDescription = title
      ? `「${title}」を流しながらポモドーロが始められます。動画の上にタイマー重ねるやつ。`
      : 'おすすめのYouTube動画つきでポモドーロが始められます。動画の上にタイマー重ねるやつ。';

    return new HTMLRewriter()
      .on('head', {
        element(el) {
          el.append(
            `<meta property="og:image" content="${thumbUrl}">` +
            `<meta property="og:image:width" content="480">` +
            `<meta property="og:image:height" content="360">` +
            `<meta name="twitter:image" content="${thumbUrl}">`,
            { html: true }
          );
        }
      })
      .on('meta[property="og:url"]', {
        element(el) { el.setAttribute('content', shareUrl); }
      })
      .on('meta[property="og:title"]', {
        element(el) { el.setAttribute('content', ogTitle); }
      })
      .on('meta[property="og:description"]', {
        element(el) { el.setAttribute('content', ogDescription); }
      })
      .on('title', {
        element(el) { el.setInnerContent(ogTitle); }
      })
      .transform(asset);
  }
};
