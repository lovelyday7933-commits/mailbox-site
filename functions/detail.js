/**
 * 구 URL 리다이렉트: /detail?id=xxx → /concern/xxx
 * 기존 detail.html?id=xxx URL을 새 URL로 리다이렉트
 *
 * 참고: detail.html 자체도 정적 파일로 존재하므로
 * ?id= 파라미터가 있는 경우에만 이 함수가 호출됨
 */

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const confessionId = url.searchParams.get('id');

    if (confessionId) {
        // /concern/:id로 리다이렉트 (SEO SSR 적용)
        return Response.redirect(`https://allnewstartday.com/concern/${confessionId}`, 301);
    }

    // id 없으면 홈으로
    return Response.redirect('https://allnewstartday.com/', 302);
}
