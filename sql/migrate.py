"""
SQLite → Supabase 데이터 마이그레이션 스크립트
기존 서버에서 실행하여 INSERT SQL을 생성합니다.

사용법:
    python migrate.py > migrate_insert.sql
    → 출력된 SQL을 Supabase SQL Editor에 붙여넣기
"""

import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'data', 'mailbox.db')

def escape_sql(text):
    if text is None:
        return 'NULL'
    return "'" + str(text).replace("'", "''") + "'"

def main():
    if not os.path.exists(DB_PATH):
        print(f"-- DB not found at {DB_PATH}")
        print(f"-- Adjust DB_PATH in this script")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("-- ============================================")
    print("-- 자동 생성된 마이그레이션 SQL")
    print("-- ============================================")
    print()

    # confessions
    cursor.execute("SELECT * FROM confessions ORDER BY created_at")
    rows = cursor.fetchall()
    if rows:
        print(f"-- confessions: {len(rows)}건")
        for row in rows:
            print(f"INSERT INTO confessions (id, session_id, category, title, content, emoji, reply_count, like_count, view_count, is_answered, created_at, updated_at) VALUES ({escape_sql(row['id'])}, {escape_sql(row['session_id'])}, {escape_sql(row['category'])}, {escape_sql(row['title'])}, {escape_sql(row['content'])}, {escape_sql(row['emoji'])}, {row['reply_count']}, {row['like_count']}, {row['view_count']}, {row['is_answered']}, {escape_sql(row['created_at'])}, {escape_sql(row['updated_at'])});")
        print()

    # replies
    cursor.execute("SELECT * FROM replies ORDER BY created_at")
    rows = cursor.fetchall()
    if rows:
        print(f"-- replies: {len(rows)}건")
        for row in rows:
            print(f"INSERT INTO replies (id, confession_id, session_id, content, like_count, is_best, created_at) VALUES ({escape_sql(row['id'])}, {escape_sql(row['confession_id'])}, {escape_sql(row['session_id'])}, {escape_sql(row['content'])}, {row['like_count']}, {row['is_best']}, {escape_sql(row['created_at'])});")
        print()

    # likes
    cursor.execute("SELECT * FROM likes")
    rows = cursor.fetchall()
    if rows:
        print(f"-- likes: {len(rows)}건")
        for row in rows:
            print(f"INSERT INTO likes (id, session_id, target_type, target_id, created_at) VALUES ({escape_sql(row['id'])}, {escape_sql(row['session_id'])}, {escape_sql(row['target_type'])}, {escape_sql(row['target_id'])}, {escape_sql(row['created_at'])});")
        print()

    # sessions
    cursor.execute("SELECT * FROM sessions")
    rows = cursor.fetchall()
    if rows:
        print(f"-- sessions: {len(rows)}건")
        for row in rows:
            print(f"INSERT INTO sessions (id, nickname, confession_count, reply_count, created_at, last_active) VALUES ({escape_sql(row['id'])}, {escape_sql(row['nickname'])}, {row['confession_count']}, {row['reply_count']}, {escape_sql(row['created_at'])}, {escape_sql(row['last_active'])});")
        print()

    # content_usage
    cursor.execute("SELECT * FROM content_usage")
    rows = cursor.fetchall()
    if rows:
        print(f"-- content_usage: {len(rows)}건")
        for row in rows:
            print(f"INSERT INTO content_usage (id, content_type, content_id, content_name, session_id, created_at) VALUES ({escape_sql(row['id'])}, {escape_sql(row['content_type'])}, {escape_sql(row['content_id'])}, {escape_sql(row['content_name'])}, {escape_sql(row['session_id'])}, {escape_sql(row['created_at'])});")
        print()

    conn.close()
    print("-- 마이그레이션 완료")

if __name__ == '__main__':
    main()
