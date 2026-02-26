-- ============================================
-- 마음우체통 - Supabase 테이블 생성
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. confessions (고민글)
CREATE TABLE confessions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    title TEXT,
    content TEXT NOT NULL,
    emoji TEXT DEFAULT '💌',
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_answered INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul')
);

-- 2. replies (답장)
CREATE TABLE replies (
    id TEXT PRIMARY KEY,
    confession_id TEXT NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_best INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul')
);

-- 3. likes (공감)
CREATE TABLE likes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, target_type, target_id)
);

-- 4. sessions (세션)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    nickname TEXT,
    confession_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 5. content_usage (콘텐츠 사용)
CREATE TABLE content_usage (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_name TEXT NOT NULL,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul')
);

-- 6. settings (관리자 설정)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
