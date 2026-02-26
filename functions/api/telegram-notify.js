/**
 * 텔레그램 알림 API: POST /api/telegram-notify
 * 고민 등록 시 텔레그램 채널로 알림 전송
 */
export async function onRequestPost(context) {
    const { env } = context;

    const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        return new Response(JSON.stringify({ ok: false, error: 'config missing' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await context.request.json();
        const { id, content, category, emoji, title } = body;

        const categoryLabels = {
            general: '일반', love: '연애', work: '직장/학교',
            family: '가족', friend: '친구', health: '건강'
        };

        const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
        const catLabel = categoryLabels[category] || category;

        const message = [
            `${emoji || '💌'} 새 고민이 도착했어요!`,
            '',
            `📂 카테고리: ${catLabel}`,
            title ? `📌 제목: ${title}` : null,
            '',
            preview,
            '',
            `🔗 https://allnewstartday.com/concern/${id}`
        ].filter(Boolean).join('\n');

        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        });

        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
