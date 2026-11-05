# SNUSDEX

**The Pokédex for Snus.**  
Scan, collect, rate, and track every can — with a rarity system, social features, and a fully customizable collector card.

> Follow us on Instagram [@snusdex](https://instagram.com/snusdex) · All links at [linktr.ee/snusdex](https://linktree.snusdex.com)

---

## What is Snusdex?

Snusdex is an iOS app built around a SwiftUI WKWebView shell. The entire product UI lives as a web app hosted at [snusdex.com](https://snusdex.com) — the native Xcode wrapper loads it and adds the full iOS experience on top: native haptic feedback, automatic camera permission handling, a startup jingle, real-time network monitoring, a native offline screen, and a home screen widget extension.

This architecture means the app can ship and update instantly without waiting for App Store review, while still feeling completely native to iOS.

---

## Architecture

Snusdex is split into two layers:

### Web Layer — `snusdex.com`
A single-page HTML/JS app. All UI, product logic, barcode scanning, ratings, social features, and Supabase data fetching live here. Deployed and updated in seconds, completely independently of the App Store.

**Stack:** Vanilla JS · Tailwind CSS v3 (compiled locally) · Supabase · Html5-QrCode · Custom i18n

### Native Shell — Xcode / SwiftUI
A lightweight but fully wired iOS wrapper. The shell is responsible for everything that requires native iOS access:

#### WKWebView (`WebView.swift`)
- Loads `https://snusdex.com` inside a `WKWebView` with a custom iPhone Safari user agent
- Registers a `hapticHandler` JavaScript message bridge — when the web app calls `window.webkit.messageHandlers.hapticHandler.postMessage(...)`, the native shell fires `UIImpactFeedbackGenerator(style: [...])` instantly
- Auto-grants camera permission for barcode scanning via `requestMediaCapturePermissionFor` — no permission prompt interrupts the scan flow
- Allows inline video autoplay for the splash screen animation
- Injects a JavaScript snippet at document start that silences the web-layer splash sound, so the native audio player can handle it exclusively (prevents a Control Center media player from appearing)

#### Network Monitor (`NetworkMonitor.swift`)
- Uses Apple's `NWPathMonitor` to observe connectivity in real time via a `DispatchQueue`
- Published as `@Published var isConnected` — ContentView reacts instantly when the connection drops or returns
- When offline: the WebView is replaced by a fully native SwiftUI offline screen
- When back online: the WebView reloads automatically

#### Widget Extension (`SDXWidget`)
- A WidgetKit extension that supports home screen widgets, Control Center toggles, Dynamic Island, and Live Activities
- Currently in development

---

## Features

### Barcode Scanner
Scan any snus can to instantly identify it and add it to your collection. Supports Normal, Wide, and Tele camera modes with hardware zoom on supported devices. Camera permission is granted automatically by the native shell without a disruptive system prompt mid-scan.

### The Dex
Your personal snus collection — displayed in a card grid sorted by rarity or brand. Each card shows the product image, nicotine strength, and an animated rarity glow. Supports large tile mode (2 columns) and fully customizable card patterns and fonts.

### Rarity System
Every product has a rarity tier that determines its XP value and visual style. Higher rarities unlock new colors for your Collector Card.

| Rarity | Color |
|---|---|
| Common | Gray |
| Uncommon | Green |
| Rare | Blue |
| Epic | Purple |
| Legendary | Gold |
| Mythic | Light Blue |

### Ratings
Rate products across multiple taste and strength categories and leave a written review. Ratings from all users are aggregated into an overall score visible on leaderboards and product cards.

### Social & Leaderboards
Connect with friends, compare collections, and compete on global leaderboards for most scans and highest community-rated products. Friend requests, connection management, and a live activity heatmap are all included.

### Usage Tracking
Log daily pouch consumption and track which cans you've opened. Daily usage streaks sync to the cloud, and a full activity heatmap visualizes your history over time.

### Badges & Achievements
Unlock badges by hitting milestones — discovering rare products, maintaining streaks, or reaching collection sizes. Badges display on your profile and Collector Card.

### Collector Card
A fully customizable profile card with animated glow effects (Sweep / Pulse / None), adjustable intensity and saturation, interchangeable card patterns (Dots, Grid, Lines, Carbon, Hex, Rings), and rarity-based color themes that unlock progressively as you discover higher rarities.

### Privacy & Data Export
Export all your personal data — scans, ratings, usage logs, and profile — as a structured JSON file at any time. Full GDPR-compliant data export built in.

---

## Tech Stack

| Layer | Technology |
|---|---|
| iOS Shell | SwiftUI / WKWebView |
| Audio | AVFoundation / AVAudioPlayer |
| Connectivity | Network / NWPathMonitor |
| Haptics | UIImpactFeedbackGenerator (JS bridge) |
| Widget | WidgetKit / SDXWidget |
| Frontend | Vanilla HTML / JavaScript |
| Styling | Tailwind CSS v3 (compiled locally) |
| Backend | Supabase (Auth, Postgres, Storage) |
| Scanner | Html5-QrCode |
| i18n | Custom translation system |

---

## Links

- Instagram: [@snusdex](https://instagram.com/snusdex)
- All links: [linktr.ee/snusdex](https://linktree.snusdex.com)
