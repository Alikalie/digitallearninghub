# Implementation Plan

This is a large multi-area request. Here's how I'll break it down, in order, with clear scope per area.

## 1. Profile sync to Lovable Cloud
- Add missing columns to `profiles` if needed: `linkedin_url`, `twitter_url` (already added previously), confirm `avatar_url`, `bio`, `phone`, `country`, `is_profile_locked` exist.
- Rebuild `src/pages/Profile.tsx`:
  - Load profile on mount from `profiles` table; show loading skeleton.
  - Two-column grid for first/last name (split `full_name`), social links section, bio, phone, country.
  - Live completion progress bar (computed from filled fields).
  - Avatar: tap-to-change with camera overlay (reuse `useAvatarUpload`), gradient fallback with initials.
  - Stats row (enrolled / completed / rating) computed from `course_progress`.
  - **Save & Lock**: writes all fields + `is_profile_locked=true`. Button turns green with checkmark for 2s.
  - When `is_profile_locked` is true, all inputs are `disabled` with a banner "Profile locked — unlock from Settings".
- Add Unlock control in `src/pages/Settings.tsx` (password-verified per existing memory rule).
- Full-bleed hero banner with dot texture, safe-area insets.

## 2. Lesson watch progress sync + resume
- Add columns to `course_progress`: `watch_seconds` (int), `last_position` (int), `completed_at` (timestamptz) — only if missing.
- `LessonVideoPlayer.tsx`:
  - On mount: fetch saved `last_position` for `lessonId+user`, seek video to it (direct video) or restore simulated progress.
  - Throttled save (every 5s) of current position to `course_progress`.
  - Mark `is_completed=true` once ≥90% watched (existing behavior, persisted).
  - Keyboard controls: Space/K toggle play, ← → seek ±5s, ↑ ↓ volume, F fullscreen, C captions toggle.
  - Captions toggle button (only visible if `<track kind="captions">` exists or videoUrl has companion `.vtt`).
  - ARIA: `role="region" aria-label="Lesson video"`, `aria-pressed` on play, `aria-valuenow` on progress, visible focus rings.

## 3. Admin video upload for all courses
- New admin tab section in `CourseVideoTab.tsx` (already exists) — extend to:
  - List all courses + lessons.
  - Upload `.mp4/.webm` to existing `dlh-videos` bucket via `supabase.storage`.
  - Save returned public URL into `lessons.video_url`.
  - Show progress bar during upload; allow replace/delete.

## 4. PWA install prompt + service worker
- Manifest already may exist; ensure `public/manifest.webmanifest` with icons, theme color, `display: standalone`, and head tags in `index.html`.
- Register service worker via `vite-plugin-pwa` with guarded wrapper (skip preview/iframe/dev/lovableproject hosts).
- New `src/components/InstallPrompt.tsx`:
  - Listens for `beforeinstallprompt` (Android/Chrome/Edge) → slides up bottom banner 1.5s after first visit with icon, feature list, Install / Not Now.
  - iOS Safari detection → step-by-step Share → Add to Home Screen card.
  - Stores `dlh_install_prompt_dismissed=1` in localStorage; only shown once.
- Mount in `App.tsx`.

## 5. Mobile / Desktop layout polish
- `DashboardLayout` already has sticky header + mobile bottom tab; verify active dot indicator (done). Add safe-area insets to bottom tab and profile hero.
- At ≥768px sidebar is already used. Confirm 3-column field grids on Profile at `md:`.

## Technical Notes
- Watch progress saved with `upsert` on `(user_id, lesson_id)`.
- Install prompt: only one `beforeinstallprompt` listener; capture event, prevent default, show UI; call `prompt()` on Install click.
- Service worker uses `NetworkFirst` for HTML, `CacheFirst` for hashed assets, excludes `/~oauth`.
- Lock state enforced both in UI (`disabled`) and via RLS already in place.

## Out of scope (will not touch)
- Payment integration (still manual upgrade per existing memory).
- Push notifications wiring (banner mentions them as a future feature only).
- Redesign of Course list page or other pages.

I'll execute in this order: DB migration → Profile rebuild → Lesson player sync → Admin video upload → PWA + install prompt.
