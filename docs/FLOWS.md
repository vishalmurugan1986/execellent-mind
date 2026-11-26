# Flow map

Reference: the Excellent Brain app (v3.2.0, Unity, package `com.ExcellentBrain.ebandroid`)
was explored on the BrainLink-Lite tablet on 2026-11-24. This app (brand: **Excellent Mind**) keeps the
same flows with its own branding, copy, artwork and games, and adds brainwave analytics.

## Headset facts (measured on the tablet)

- BrainLink_Lite is a **Classic Bluetooth (BR/EDR)** device, bonded as `BrainLink_Lite`.
  Data arrives over an **RFCOMM serial channel (SPP, channel 1)**. Not BLE.
- The stream is the NeuroSky **ThinkGear** packet format: `AA AA len payload checksum`.
  - `0x02` poor signal (0 = good, 200 = sensor off head)
  - `0x04` attention (0–100, ~1 Hz), `0x05` meditation (0–100, ~1 Hz)
  - `0x80` raw EEG sample (int16, 512 Hz)
  - `0x83` 8 band powers (delta, theta, low/high alpha, low/high beta, low/mid gamma), 1 Hz
- Expo Go cannot open Bluetooth sockets, so the headset needs the development build of Excellent Mind.
- Like the original, the activity clock only runs while the headset gives a usable signal.

## Screens and flows

| Original | Excellent Mind route | Notes |
|---|---|---|
| Welcome (hero + Log In / Sign Up card) | `/` | Redirects to `/home` when signed in |
| Log In (email, password, remember me, forgot password) | `/login` | Accounts are stored on the device |
| Sign Up (first/last name, email, phone, password ×2, birthday, gender, country) | `/signup` | |
| Forgot password | `/forgot` | Reset with email + date of birth |
| Choose your training (protocol cards) | `/home` | Attention-based training only, so Home goes straight to Journey / Free play / Watch & train |
| How would you like to train? (Programs / Minigames / Video) | `/mode` | |
| Choose a program → levels (unlock in order) → session grid | `/programs`, `/program`, `/level` | 30 sessions: 10 + 20 |
| Session = 10 activities, ~2 min each, pick a game per slot | `/games?session=1` | Session is saved only when all 10 finish |
| Minigames list (8 games) | `/games` | Rail Rush, Sky Glider, Rocket Climb, Turbo Kart, Hoop Shot, Star Blaster, Reef Friends, Magic Garden |
| Activity options (threshold gauge + slider, Dynamic mode) | `/activity/options` | In a session the threshold is automatic |
| Activity (HUD: time left, score, streak bar ×multiplier, pause) | `/activity/play` | "Sensor not found" banner on bad signal |
| Pause: Stop / Resume (minigame) | | |
| Pause in session: 2:00 pause countdown, Change Activity / Resume | | Countdown expiry resets the session |
| Activity complete (stars, Scores / Graphs tabs, notes, Replay / Next) | `/activity/results` | |
| Video: browse file, preview, Next → train while watching | `/video`, `/video/play` | Video dims and quietens below threshold |
| Profile (name, Program Progress chart, stat tiles, Fill Survey) | `/profile` | Name, age, class, student ID (Edit details), stats, Attention chart, brainwaves first vs latest, questionnaire, sync status |
| (new) | Settings › School dashboard | Server address, school key, tablet name; results sync to the school web dashboard (`dashboard/`) |
| Progress Questionnaire (3 steps: details → 20 questions → results) | `/survey` | Own question set |
| Menu: Settings, Homepage, Logout, Quit | top bar menu | |
| Settings: Audio (master/effects/music volume, feedback sound, background music), Language, About, Support | `/settings` | Plus a Headset tab (status, pairing) |
| Live dock (Raw EEG / Brain Waves, Attention & Relaxation gauges, signal, connected, hide) | bottom of every screen | |

## Game rule (same for every activity)

- Every 250 ms: if attention (the headset's 0–100 attention score) is at or above the
  threshold and the signal is good, add `multiplier` points.
- Staying above the threshold fills the streak bar; each full bar raises the multiplier (max ×5).
  Dropping below for 2 s resets the streak.
- Dynamic mode: every 15 s the threshold moves up 5 if you were above it >70% of the time,
  down 5 if <30% (clamped 10–90). Shown as a coral marker on the dock gauge.
- Stars: 1 / 2 / 3 for 25% / 50% / 75% of the time above the threshold.
