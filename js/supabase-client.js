/**
 * 마음우체통 - Supabase 클라이언트 + 세션 관리
 *
 * 설정 방법:
 * Cloudflare Pages 환경변수에서 SUPABASE_URL, SUPABASE_ANON_KEY 설정 후
 * 아래 값을 교체하거나, 빌드 시 치환
 */

// ====== Supabase 설정 ======
// 배포 전 반드시 실제 값으로 교체할 것
const SUPABASE_URL = 'https://iutzywqxroskpltygarj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHp5d3F4cm9za3BsdHlnYXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODEwOTAsImV4cCI6MjA4NzY1NzA5MH0.Y3mnMmd2RAyf18ptoJcN7Legp_vqVdpHXQdGu3rDums';

// Supabase 클라이언트 초기화
// CDN이 window.supabase에 SDK를 로드하므로, 클라이언트 인스턴스는 별도 변수 사용
const _supabaseSDK = window.supabase;
const supabaseClient = _supabaseSDK.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== 세션 관리 (localStorage) ======
const SESSION_KEY = 'mailbox_session';

function getSessionId() {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        // 기존과 동일한 12자 UUID
        sessionId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
}

function generateId() {
    // 기존과 동일한 8자 UUID
    return crypto.randomUUID().replace(/-/g, '').substring(0, 8);
}

// 세션 ID 초기화 (페이지 로드 시)
const SESSION_ID = getSessionId();
