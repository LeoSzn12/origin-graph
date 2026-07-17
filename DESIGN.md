# Origin Graph visual system

The interface uses an archival editorial language: warm paper, dark ink, restrained moss/rust/gold role accents, high-contrast serif display type, and compact sans-serif metadata. The visual hierarchy is meant to feel like a serious research desk rather than a feed or generic dashboard.

## Tokens

- Ink `#16221f`
- Muted metadata `#60706a`
- Paper `#f4f1e9`
- Secondary paper `#ebe5d8`
- Rules `#d7d0c2`
- Moss/support `#446b55`
- Rust/challenge or claimed date `#a45538`
- Gold/uncertainty `#bc8e3b`
- Blue/witness date `#54758a`
- Display: Iowan Old Style / Palatino / Georgia fallback
- Interface: Inter / system sans-serif fallback

## Interaction and layout

- The global research navigation persists across all surfaces and horizontally scrolls on narrow screens.
- Major screens use one dominant heading, rules, and editorial sections instead of collections of floating cards.
- Touch controls target a minimum 44px height where forms and primary actions are used.
- Timeline bands scroll horizontally on mobile; the accessible table mirrors the visual data.
- Map and graph controls become stacked layouts on narrow screens.
- Support, challenge, ambiguity, context, and inability to test remain visually distinct without producing a score.

## Content rules

- Use real interface copy or explicitly marked synthetic fixtures—never placeholder pseudo-history.
- Show status, rights, source role, exact locator, and uncertainty close to the object they qualify.
- Empty states explain the editorial requirement that prevents publication.
- Literary/mythical places never receive factual coordinates; sensitive sites render generalized public geometry.
