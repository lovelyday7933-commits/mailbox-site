-- ============================================
-- RLS (Row Level Security) 정책
-- 읽기: 누구나 가능
-- 쓰기: RPC 함수를 통해서만 (SECURITY DEFINER)
-- ============================================

-- RLS 활성화
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- confessions: 누구나 읽기 가능
CREATE POLICY "confessions_select" ON confessions
    FOR SELECT USING (true);

-- replies: 누구나 읽기 가능
CREATE POLICY "replies_select" ON replies
    FOR SELECT USING (true);

-- likes: 누구나 읽기 가능
CREATE POLICY "likes_select" ON likes
    FOR SELECT USING (true);

-- sessions: 누구나 읽기 가능
CREATE POLICY "sessions_select" ON sessions
    FOR SELECT USING (true);

-- content_usage: 누구나 읽기 가능
CREATE POLICY "content_usage_select" ON content_usage
    FOR SELECT USING (true);

-- settings: 직접 읽기 차단 (RPC를 통해서만)
-- settings에는 SELECT 정책 없음 → 직접 접근 불가
