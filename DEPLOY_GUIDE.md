# 마음우체통 마이그레이션 배포 가이드
## Flask+SQLite → Supabase+Cloudflare Pages

---

## 1단계: Supabase 설정

### 1-1. 프로젝트 생성
1. https://supabase.com 가입/로그인
2. "New Project" 클릭
3. 설정:
   - Name: `mailbox` (아무거나)
   - Database Password: 안전한 비밀번호 설정
   - Region: **Northeast Asia (Tokyo)** 선택
4. 프로젝트 생성 완료 대기 (1-2분)

### 1-2. DB 스키마 생성
1. 좌측 메뉴 → **SQL Editor** 클릭
2. 아래 SQL 파일을 **순서대로** 실행:
   - `sql/01_tables.sql` → 테이블 6개 생성
   - `sql/02_indexes.sql` → 인덱스 생성
   - `sql/03_rls.sql` → RLS 정책 설정
   - `sql/04_rpc_functions.sql` → RPC 함수 12개 생성
   - `sql/05_settings.sql` → 관리자 비밀번호 설정

### 1-3. 기존 데이터 마이그레이션
- 기존 서버에서 `python sql/migrate.py > migrate_insert.sql` 실행
- 출력된 SQL을 Supabase SQL Editor에 붙여넣기 실행
- 또는 데이터가 적으므로(7개 고민) 새로 시작해도 무방

### 1-4. API 키 확보
1. 좌측 메뉴 → **Settings** → **API**
2. 메모할 값:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJ...` (긴 문자열)

---

## 2단계: 프론트엔드 설정

### 2-1. Supabase 키 입력
`js/supabase-client.js` 파일 열기:
```javascript
const SUPABASE_URL = '__SUPABASE_URL__';      // ← 실제 URL로 교체
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';  // ← 실제 키로 교체
```

예시:
```javascript
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## 3단계: Cloudflare Pages 배포

### 3-1. GitHub 리포지토리 생성
1. GitHub에서 새 리포지토리 생성 (예: `mailbox-site`)
2. `mailbox-cloudflare/` 폴더의 모든 파일을 업로드
   ```
   git init
   git add .
   git commit -m "마음우체통 Cloudflare Pages 마이그레이션"
   git remote add origin https://github.com/YOUR_USERNAME/mailbox-site.git
   git push -u origin main
   ```

### 3-2. Cloudflare Pages 프로젝트 생성
1. https://dash.cloudflare.com 로그인
2. **Workers & Pages** → **Create** → **Pages**
3. **Connect to Git** → GitHub 리포지토리 선택
4. 빌드 설정:
   - **Build command**: (비워두기 - 정적 사이트)
   - **Build output directory**: `/` (루트)
5. **Environment Variables** 추가:
   - `SUPABASE_URL` = `https://xxxxxxxx.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJ...`
6. **Save and Deploy** 클릭

### 3-3. 커스텀 도메인 연결
1. Pages 프로젝트 → **Custom domains** → **Set up a custom domain**
2. `allnewstartday.com` 입력
3. Cloudflare가 DNS 설정 자동 처리 (이미 Cloudflare DNS 사용 중인 경우)
4. 기존 A레코드(서버 IP) 삭제 → CF Pages CNAME으로 교체

---

## 4단계: 검증

### 4-1. 기능 테스트
- [ ] 홈페이지 로드 (고민 목록)
- [ ] 고민 작성 → 작성 확인
- [ ] 답장하기 → 랜덤 고민 로드 → 답장 작성
- [ ] 고민 상세 → 공감 → 답장 공감
- [ ] 내 우체통 → 내 고민/답장 확인
- [ ] 인기글 → 정렬 확인
- [ ] 심심풀이 → 테스트/게임 작동
- [ ] 관리자 → 로그인 → 대시보드 → 삭제

### 4-2. SEO 확인
- [ ] `/concern/고민ID` → OG 메타태그 SSR 확인
- [ ] `/sitemap.xml` → 동적 사이트맵 확인
- [ ] `/rss.xml` → RSS 피드 확인
- [ ] 카카오톡 공유 미리보기 확인

### 4-3. 광고 확인
- [ ] AdSense 로드 확인
- [ ] AdFit 로드 확인

---

## 5단계: 정리

### 5-1. GitHub Actions Keepalive
1. GitHub 리포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **Repository secrets** 추가:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Actions 탭에서 `Supabase Keepalive` 워크플로우 활성화 확인

### 5-2. Google Search Console
1. 사이트맵 재제출: `https://allnewstartday.com/sitemap.xml`
2. 기존 색인 URL 재확인

### 5-3. 기존 서버 정리
1. `proxy.py`에서 `allnewstartday.com` 라우트 제거
2. 서버의 마음우체통 관련 파일 삭제 (백업 후)

---

## 최종 구조

```
mailbox-cloudflare/
├── index.html          # 홈 (고민 피드)
├── write.html          # 고민 작성
├── reply.html          # 답장하기
├── detail.html         # 고민 상세
├── my.html             # 내 우체통
├── popular.html        # 인기글
├── play.html           # 심심풀이
├── tests.html          # 심리테스트
├── games.html          # 미니게임
├── admin.html          # 관리자
├── robots.txt          # SEO
├── _redirects          # URL 리다이렉트
├── _headers            # 캐시 설정
├── css/
│   └── style.css       # 디자인 (변경 없음)
├── js/
│   ├── supabase-client.js  # Supabase 초기화 + 세션
│   ├── common.js           # API 호출 (Supabase SDK)
│   └── header.js           # 네비게이션
├── images/
│   ├── og-image.png
│   └── og-image.svg
├── functions/              # CF Pages Functions (SSR)
│   ├── concern/[id].js     # 고민 상세 SEO
│   ├── category/[name].js  # 카테고리 SEO
│   ├── sitemap.xml.js      # 동적 사이트맵
│   ├── rss.xml.js          # 동적 RSS
│   └── detail.js           # 구 URL 리다이렉트
├── sql/                    # Supabase SQL (배포 후 삭제 가능)
│   ├── 01_tables.sql
│   ├── 02_indexes.sql
│   ├── 03_rls.sql
│   ├── 04_rpc_functions.sql
│   ├── 05_settings.sql
│   ├── 06_migrate_data.sql
│   └── migrate.py
└── .github/
    └── workflows/
        └── keepalive.yml   # Supabase 7일 방지
```

---

## 비용 비교

| 항목 | 기존 | 이전 후 |
|------|------|---------|
| 서버 | 월 3만원 | 0원 |
| DB | SQLite (무료) | Supabase 무료 (500MB) |
| 호스팅 | Windows 서버 | Cloudflare Pages (무료) |
| CDN | Cloudflare (무료) | Cloudflare Pages (내장) |
| SSL | Cloudflare (무료) | Cloudflare Pages (자동) |
| **월 총 비용** | **3만원** | **0원** |
