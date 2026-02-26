/**
 * /concern/:id → detail.html 서빙
 * ASSETS.fetch()로 정적 파일 직접 서빙 (_redirects 우회)
 */
export async function onRequest(context) {
    const assetUrl = new URL('/detail.html', context.request.url);
    return context.env.ASSETS.fetch(assetUrl);
}
