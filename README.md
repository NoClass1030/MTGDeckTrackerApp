# MTG Deck Tracker

A lightweight static web app for GitHub Pages that searches Magic: The Gathering cards using the Scryfall API, supports name-based and theme-based search, lets users build a deck list, and tracks how many cards they own versus how many they still need.

## Features

- Search cards by name using the Scryfall Search API
- Search by theme with Scryfall query syntax such as `color>=w`, `type:creature`, or `o:"draw a card"`
- Autocomplete card names using the Scryfall Autocomplete API
- Add cards to a personal deck list and track counts
- Track the number of cards owned versus needed
- Open card pricing and vendor links through Scryfall `purchase_uris` and direct TCGPlayer / Card Kingdom links
- Persist deck state in browser `localStorage` so it works on GitHub Pages without a backend
- Export a deck list to a plain text file in the format `Qty,Name,Rarity,Set`
- Import a deck list from the same plain-text format to restore or merge cards into the current deck
- Track whether cards are owned or still needed after import

## APIs used

- Scryfall Card Search API: `https://api.scryfall.com/cards/search`
- Scryfall Card Autocomplete API: `https://api.scryfall.com/cards/autocomplete`
- Scryfall card data includes `purchase_uris` and `prices`, which provides:
  - TCGPlayer links
  - Card Kingdom links
  - USD / other pricing values

Important note: TCGPlayer and CardKingdom do not expose a public free JSON API for general website integration in the same way Scryfall does. This project uses Scryfall's official card metadata and vendor links instead of scraping or requiring an API key. That makes it suitable for a static GitHub Pages deployment.

## Local development

Because this is a static site, you can run it by opening `index.html` directly or by serving the folder with a simple local web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## GitHub Pages deployment

1. Push this project to a GitHub repository.
2. In GitHub, open the repository settings.
3. Navigate to Pages.
4. Select the branch you want to publish (for example, `main`).
5. Use the root folder or an `/` path.
6. Save your settings and wait for the site to publish.

## Notes about theme search

EDHRec does not publish an official public API for theme recommendations. To mimic that behavior in a GitHub Pages-friendly way, this app uses Scryfall query language, which supports color, type, object text, and keyword filters to approximate thematic deck exploration.

## License

This project is provided as a demo starter app and can be adapted for personal or commercial use.

## Import/Export Format

When exporting or importing a deck list, use the following plain-text format to ensure compatibility:

```text
Qty,Name,Rarity,Set
4,Arcane Signet,Uncommon,Commander Masters
2,Sol Ring,Uncommon,Commander Masters
1,Drannith Magistrate,Uncommon,Commander Masters
```
# MTGDeckTrackerApp
