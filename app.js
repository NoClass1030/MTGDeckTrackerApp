const STORAGE_KEY = 'mtgDeckTrackerDeck';
const SAVED_DECKS_KEY = 'mtgSavedDecks';
const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];
const COLOR_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
const state = {
  mode: 'name',
  deck: loadDeck(),
  results: [],
  nextPage: null,
  savedDecks: loadSavedDecks(),
};

const searchForm = document.querySelector('#searchForm');
const searchInput = document.querySelector('#searchInput');
const modeButtons = document.querySelectorAll('.mode-btn');
const resultsWrap = document.querySelector('#results');
const autocompleteList = document.querySelector('#autocompleteList');
const statusNode = document.querySelector('#status');
const themeButtons = document.querySelectorAll('.chip');
const deckList = document.querySelector('#deckList');
const deckCountBadge = document.querySelector('#deckCountBadge');
const clearDeckBtn = document.querySelector('#clearDeckBtn');
const exportDeckBtn = document.querySelector('#exportDeckBtn');
const importDeckBtn = document.querySelector('#importDeckBtn');
const importDeckInput = document.querySelector('#importDeckInput');
const deckNameInput = document.querySelector('#deckNameInput');
const saveDeckBtn = document.querySelector('#saveDeckBtn');
const savedDecksList = document.querySelector('#savedDecksList');
const colorIdentitySummary = document.querySelector('#colorIdentitySummary');
const themeSummary = document.querySelector('#themeSummary');
const archetypeSummary = document.querySelector('#archetypeSummary');
const commanderFitSummary = document.querySelector('#commanderFitSummary');

initialize();

function initialize() {
  bindEvents();
  renderDeck();
  renderDeckInsights();
  renderSavedDecks();
  searchForCards('');
}

function bindEvents() {
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setSearchMode(button.dataset.mode));
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = searchInput.value.trim();
    if (!q && state.mode === 'theme') {
      searchForCards('is:commander');
      return;
    }
    searchForCards(q);
  });

  searchInput.addEventListener('input', () => {
    const value = searchInput.value.trim();
    if (state.mode === 'name' && value.length >= 2) {
      fetchAutocomplete(value);
      return;
    }
    hideAutocomplete();
  });

  autocompleteList.addEventListener('click', (event) => {
    const item = event.target.closest('.autocomplete-item');
    if (!item) return;
    searchInput.value = item.dataset.term || '';
    hideAutocomplete();
    searchForCards(searchInput.value);
  });

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const theme = button.dataset.theme;
      searchInput.value = theme;
      setSearchMode('theme');
      searchForCards(theme);
    });
  });

  clearDeckBtn.addEventListener('click', () => {
    state.deck = [];
    persistDeck();
    renderDeck();
    renderDeckInsights();
  });

  exportDeckBtn.addEventListener('click', exportDeck);
  importDeckBtn.addEventListener('click', () => importDeckInput.click());
  importDeckInput.addEventListener('change', handleDeckImport);
  saveDeckBtn.addEventListener('click', saveCurrentDeck);

  savedDecksList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const name = button.dataset.name;

    if (action === 'load-deck') {
      const preset = state.savedDecks.find((deck) => deck.name === name);
      if (preset) {
        state.deck = preset.cards.map(normalizeDeckCard);
        deckNameInput.value = preset.name;
        persistDeck();
        renderDeck();
        renderDeckInsights();
        statusNode.textContent = `Loaded saved deck "${preset.name}".`;
      }
      return;
    }

    if (action === 'delete-deck') {
      state.savedDecks = state.savedDecks.filter((deck) => deck.name !== name);
      persistSavedDecks();
      renderSavedDecks();
      statusNode.textContent = `Deleted saved deck "${name}".`;
    }
  });

  themeSummary.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-query]');
    if (!button) return;

    const query = button.dataset.themeQuery;
    searchInput.value = query;
    setSearchMode('theme');
    searchForCards(query);
  });

  archetypeSummary.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-query]');
    if (!button) return;

    const query = button.dataset.themeQuery;
    searchInput.value = query;
    setSearchMode('theme');
    searchForCards(query);
  });

  commanderFitSummary.addEventListener('click', (event) => {
    const button = event.target.closest('[data-commander-name]');
    if (!button) return;

    const name = button.dataset.commanderName;
    searchInput.value = name;
    setSearchMode('name');
    searchForCards(name);
  });

  resultsWrap.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'add-card') {
      const card = state.results.find((entry) => entry.id === target.dataset.id);
      if (card) addCardToDeck(card);
    }
  });

  deckList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'remove-card') {
      state.deck = state.deck.filter((entry) => entry.id !== id);
      persistDeck();
      renderDeck();
      renderDeckInsights();
      return;
    }

    const card = state.deck.find((entry) => entry.id === id);
    if (!card) return;

    if (action === 'increment-count') {
      card.count += 1;
    }

    if (action === 'decrement-count') {
      card.count = Math.max(0, card.count - 1);
      if (card.count === 0) {
        state.deck = state.deck.filter((entry) => entry.id !== id);
      }
    }

    if (action === 'increment-owned') {
      card.owned += 1;
    }

    if (action === 'decrement-owned') {
      card.owned = Math.max(0, card.owned - 1);
    }

    persistDeck();
    renderDeck();
    renderDeckInsights();
  });
}

function setSearchMode(mode) {
  state.mode = mode;
  modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  const placeholder = mode === 'name' ? 'Search by card name...' : 'Theme query, e.g. color>=w type:creature';
  searchInput.placeholder = placeholder;

  if (mode === 'name') {
    hideAutocomplete();
    return;
  }

  searchInput.focus();
}

async function fetchAutocomplete(term) {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(term)}`);
    if (!response.ok) {
      throw new Error('Autocomplete failed');
    }
    const data = await response.json();
    const items = data.data.slice(0, 8);
    renderAutocomplete(items);
  } catch (error) {
    console.error(error);
    hideAutocomplete();
  }
}

function renderAutocomplete(items) {
  if (!items.length) {
    hideAutocomplete();
    return;
  }

  autocompleteList.innerHTML = items
    .map(
      (item) => `
        <li class="autocomplete-item" data-term="${escapeHtml(item)}">
          ${escapeHtml(item)}
        </li>
      `,
    )
    .join('');

  autocompleteList.classList.remove('hidden');
}

function hideAutocomplete() {
  autocompleteList.classList.add('hidden');
  autocompleteList.innerHTML = '';
}

async function searchForCards(query) {
  const trimmed = query.trim();

  if (!trimmed && state.mode === 'name') {
    statusNode.textContent = 'Showing a few starter cards.';
    query = 'is:commander';
  }

  const searchQuery = state.mode === 'name'
    ? makeNameQuery(trimmed)
    : trimmed || 'is:commander';

  if (!searchQuery) {
    statusNode.textContent = 'Enter a name or theme to search.';
    resultsWrap.innerHTML = '';
    return;
  }

  statusNode.textContent = 'Loading cards from Scryfall...';

  try {
    const url = new URL('https://api.scryfall.com/cards/search');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('order', 'name');
    url.searchParams.set('unique', 'cards');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(response.statusText || 'Failed to fetch cards');
    }

    const payload = await response.json();
    state.results = payload.data || [];
    state.nextPage = payload.next_page || null;

    renderResults();
    statusNode.textContent = payload.total_cards
      ? `Found ${payload.total_cards.toLocaleString()} cards matching that query.`
      : 'No cards found for that query.';
  } catch (error) {
    console.error(error);
    statusNode.textContent = 'Unable to fetch results from Scryfall right now.';
    resultsWrap.innerHTML = '<div class="empty-state">Could not load cards.</div>';
  }
}

function makeNameQuery(input) {
  return input ? `name:"${input.replace(/"/g, '\\"')}"` : 'is:commander';
}

function renderResults() {
  if (!state.results.length) {
    resultsWrap.innerHTML = '<div class="empty-state">No cards matched your search.</div>';
    return;
  }

  const cards = state.results.map((card) => {
    const imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
    const oracleText = card.oracle_text || card.card_faces?.[0]?.oracle_text || 'No text available.';
    const price = card.prices?.usd ?? 'N/A';
    const priceLabel = price === 'N/A' ? 'N/A' : `$${Number(price).toFixed(2)}`;
    const purchaseUris = card.purchase_uris || {};
    const tcgLink = purchaseUris.tcgplayer || `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(card.name)}`;
    const ckLink = purchaseUris.cardkingdom || `https://www.cardkingdom.com/search?search=quote%3A${encodeURIComponent(card.name)}`;

    return `
      <article class="card-item">
        <img class="card-art" src="${imageUrl || 'https://placehold.co/160x224/1f2937/ffffff?text=Card'}" alt="${escapeHtml(card.name)}" />
        <div class="card-body">
          <header>
            <div>
              <h3 class="card-name">${escapeHtml(card.name)}</h3>
              <p class="card-meta">${escapeHtml(card.set_name || card.set)} · ${escapeHtml(card.rarity || '')}</p>
            </div>
            <span class="card-price">${priceLabel}</span>
          </header>

          <div class="card-tags">
            <span class="mana-cost">${escapeHtml(card.mana_cost || '')}</span>
            <span class="card-type">${escapeHtml(card.type_line || '')}</span>
          </div>

          <p class="card-text">${escapeHtml(oracleText)}</p>

          <div class="card-actions">
            <button class="primary-btn" type="button" data-action="add-card" data-id="${card.id}">Add to deck</button>
            <div class="vendor-links">
              <a class="vendor-link" href="${tcgLink}" target="_blank" rel="noreferrer noopener">TCGPlayer</a>
              <a class="vendor-link" href="${ckLink}" target="_blank" rel="noreferrer noopener">Card Kingdom</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  resultsWrap.innerHTML = cards;
}

function addCardToDeck(card) {
  const existing = state.deck.find((entry) => entry.id === card.id);

  if (existing) {
    existing.count += 1;
  } else {
    state.deck.push({
      id: card.id,
      name: card.name,
      imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
      count: 1,
      owned: 0,
      rarity: card.rarity || 'Unknown',
      set: card.set_name || card.set || 'Unknown',
      typeLine: card.type_line || card.card_faces?.[0]?.type_line || '',
      oracleText: card.oracle_text || card.card_faces?.[0]?.oracle_text || '',
      colorIdentity: Array.isArray(card.color_identity) ? card.color_identity : [],
    });
  }

  persistDeck();
  renderDeck();
  renderDeckInsights();
}

function renderDeck() {
  const totalCards = state.deck.reduce((sum, item) => sum + item.count, 0);
  deckCountBadge.textContent = `${totalCards} cards`;

  if (!state.deck.length) {
    deckList.innerHTML = '<div class="empty-state">Your deck is empty. Add cards from the search results.</div>';
    return;
  }

  deckList.innerHTML = state.deck.map((item) => {
    const need = Math.max(item.count - item.owned, 0);
    const rarity = item.rarity || 'Unknown';
    const set = item.set || 'Unknown';

    return `
      <div class="deck-item">
        <img src="${item.imageUrl || 'https://placehold.co/48x68/1f2937/ffffff?text=MTG'}" alt="${escapeHtml(item.name)}" />
        <div class="deck-details">
          <h4 class="deck-name">${escapeHtml(item.name)}</h4>
          <p class="deck-meta">${escapeHtml(rarity)} · ${escapeHtml(set)}</p>

          <div class="meta-row">
            <button class="small-btn" data-action="decrement-count" data-id="${item.id}" type="button">−</button>
            <span class="quantity">${item.count}</span>
            <button class="small-btn" data-action="increment-count" data-id="${item.id}" type="button">+</button>
            <span>in deck</span>
          </div>

          <div class="meta-row">
            <button class="small-btn" data-action="decrement-owned" data-id="${item.id}" type="button">−</button>
            <span class="quantity">${item.owned}</span>
            <button class="small-btn" data-action="increment-owned" data-id="${item.id}" type="button">+</button>
            <span>owned</span>
          </div>

          <span class="need-pill">${need} needed</span>
        </div>

        <button class="deck-remove" data-action="remove-card" data-id="${item.id}" type="button">Remove</button>
      </div>
    `;
  }).join('');
}

function renderDeckInsights() {
  if (!state.deck.length) {
    colorIdentitySummary.innerHTML = '<span class="color-pill">No identity</span>';
    themeSummary.innerHTML = '<span class="theme-tag">Add cards to see theme insights</span>';
    archetypeSummary.innerHTML = '<span class="theme-tag">Add cards to see archetype recommendations</span>';
    commanderFitSummary.innerHTML = '<span class="theme-tag">Add cards to see commander fit</span>';
    return;
  }

  const colorCounts = getColorCounts();
  const activeColors = COLOR_ORDER.filter((color) => colorCounts[color] > 0);
  const identityHtml = activeColors.length
    ? activeColors.map((color) => `<span class="color-pill">${color} · ${COLOR_LABELS[color]}</span>`).join('')
    : '<span class="color-pill">Colorless</span>';

  colorIdentitySummary.innerHTML = identityHtml;

  const themeStats = getThemeStats();
  const themeHtml = themeStats.length
    ? themeStats.map((theme) => `
        <span class="theme-tag">
          <button type="button" data-theme-query="${escapeHtml(theme.query)}">${theme.label} (${theme.count})</button>
        </span>
      `).join('')
    : '<span class="theme-tag">No clear theme signal</span>';

  themeSummary.innerHTML = themeHtml;

  const archetypes = getArchetypeRecommendations();
  const archetypeHtml = archetypes.length
    ? archetypes.map((archetype) => `
        <span class="archetype-pill">
          <button type="button" data-theme-query="${escapeHtml(archetype.query)}">${archetype.label} (${archetype.score})</button>
        </span>
      `).join('')
    : '<span class="theme-tag">No strong archetype match</span>';

  archetypeSummary.innerHTML = archetypeHtml;

  const commanders = getCommanderFit();
  const commanderHtml = commanders.length
    ? commanders.map((commander) => `
        <div class="commander-fit-card">
          <button type="button" data-commander-name="${escapeHtml(commander.name)}">
            <span class="fit-name">${escapeHtml(commander.name)}</span>
            <span class="fit-meta">${escapeHtml(commander.colors)} · ${escapeHtml(commander.archetype)} · fit ${commander.score}</span>
          </button>
        </div>
      `).join('')
    : '<span class="theme-tag">No clear commander fit</span>';

  commanderFitSummary.innerHTML = commanderHtml;
}

function getColorCounts() {
  const counts = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  state.deck.forEach((card) => {
    const colors = Array.isArray(card.colorIdentity) ? card.colorIdentity : [];
    colors.forEach((color) => {
      if (counts[color] !== undefined) {
        counts[color] += card.count;
      }
    });
  });

  return counts;
}

function getThemeStats() {
  const stats = [
    { label: 'Ramp', query: 'o:"add mana" or o:"search your library" or t:land', count: 0 },
    { label: 'Draw', query: 'o:"draw a card" or o:"draw cards"', count: 0 },
    { label: 'Removal', query: 'o:"destroy" or o:"exile" or o:"counter"', count: 0 },
    { label: 'Tokens', query: 'o:"token"', count: 0 },
    { label: 'Artifacts', query: 't:artifact', count: 0 },
    { label: 'Creatures', query: 'type:creature', count: 0 },
  ];

  state.deck.forEach((card) => {
    const searchable = `${card.name} ${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();
    const qty = card.count || 1;

    if (searchable.includes('token')) {
      stats.find((theme) => theme.label === 'Tokens').count += qty;
    }
    if (/(ramp|mana|landfall|search your library|add mana)/i.test(searchable)) {
      stats.find((theme) => theme.label === 'Ramp').count += qty;
    }
    if (/(draw a card|draw cards|card draw)/i.test(searchable)) {
      stats.find((theme) => theme.label === 'Draw').count += qty;
    }
    if (/(destroy|exile|counter|remove)/i.test(searchable)) {
      stats.find((theme) => theme.label === 'Removal').count += qty;
    }
    if (/(artifact)/i.test(card.typeLine || '')) {
      stats.find((theme) => theme.label === 'Artifacts').count += qty;
    }
    if (/(creature)/i.test(card.typeLine || '')) {
      stats.find((theme) => theme.label === 'Creatures').count += qty;
    }
  });

  return stats.filter((theme) => theme.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
}

function getArchetypeRecommendations() {
  const archetypes = [
    { label: 'Ramp', query: 'o:"add mana" or o:"search your library" or t:land', score: 0 },
    { label: 'Control', query: 'o:"counter" or o:"destroy" or o:"draw a card"', score: 0 },
    { label: 'Voltron', query: 't:creature o:"equip" or o:"double strike" or o:"indestructible"', score: 0 },
    { label: 'Token Swarm', query: 'o:"token" or o:"create token"', score: 0 },
    { label: 'Graveyard', query: 'o:"return.*from your graveyard" or o:"mill" or o:"reanimate"', score: 0 },
    { label: 'Aggro', query: 'type:creature o:"deal damage" or o:"attack"', score: 0 },
    { label: 'Aristocrats', query: 'o:"sacrifice" or o:"dies"', score: 0 },
    { label: 'Combo', query: 'o:"untap" or o:"infinite" or o:"for each" or o:"draw your library"', score: 0 },
    { label: 'Artifacts', query: 't:artifact', score: 0 },
    { label: 'Dragon Tribal', query: 'type:dragon', score: 0 },
  ];

  state.deck.forEach((card) => {
    const combined = `${card.name} ${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();
    const qty = card.count || 1;
    const text = combined;

    if (/(mana|landfall|search your library|fetchland|add mana)/i.test(text)) archetypes.find((a) => a.label === 'Ramp').score += qty;
    if (/(counter|destroy|draw a card|draw cards|board wipe|removal)/i.test(text)) archetypes.find((a) => a.label === 'Control').score += qty;
    if (/(equip|equipment|double strike|indestructible|shield|armor|deathtouch|first strike)/i.test(text)) archetypes.find((a) => a.label === 'Voltron').score += qty;
    if (/(token|create .* token)/i.test(text)) archetypes.find((a) => a.label === 'Token Swarm').score += qty;
    if (/(graveyard|mill|reanimate|return .* from your graveyard|undead|zombie|skeleton)/i.test(text)) archetypes.find((a) => a.label === 'Graveyard').score += qty;
    if (/(attack|creature.*damage|deal damage|battlefield|combat)/i.test(text)) archetypes.find((a) => a.label === 'Aggro').score += qty;
    if (/(sacrifice|dies|pay.*life|life total)/i.test(text)) archetypes.find((a) => a.label === 'Aristocrats').score += qty;
    if (/(untap|infinite|for each|draw your library|storm|proliferate)/i.test(text)) archetypes.find((a) => a.label === 'Combo').score += qty;
    if (/(artifact)/i.test(card.typeLine || '')) archetypes.find((a) => a.label === 'Artifacts').score += qty;
    if (/(dragon)/i.test(text)) archetypes.find((a) => a.label === 'Dragon Tribal').score += qty;
  });

  return archetypes.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

function getCommanderFit() {
  const colorCounts = getColorCounts();
  const archetypeScores = getArchetypeRecommendations();
  const topArchetype = archetypeScores[0]?.label || 'Control';

  const candidates = [
    { name: 'The Gitrog Monster', colors: 'BG', archetype: 'Graveyard', tags: ['graveyard', 'mill', 'reanimate', 'draw'] },
    { name: 'Krenko, Mob Boss', colors: 'R', archetype: 'Token Swarm', tags: ['token', 'create token', 'combat'] },
    { name: 'Alesha, Who Smiles at Death', colors: 'WR', archetype: 'Aristocrats', tags: ['sacrifice', 'dies', 'combat'] },
    { name: 'Sram, Senior Edificer', colors: 'WUB', archetype: 'Artifacts', tags: ['artifact', 'mana', 'equipment'] },
    { name: 'Tovolar, Dire Overlord', colors: 'RG', archetype: 'Ramp', tags: ['mana', 'landfall', 'creature'] },
    { name: 'Tazri, Beacon of Unity', colors: 'WUBRG', archetype: 'Control', tags: ['draw', 'counter', 'destroy'] },
    { name: 'Uril, the Miststalker', colors: 'WG', archetype: 'Voltron', tags: ['equip', 'double strike', 'indestructible'] },
    { name: 'Niv-Mizzet, Parun', colors: 'UR', archetype: 'Control', tags: ['draw', 'counter', 'damage'] },
    { name: 'Atarka, World Render', colors: 'WRG', archetype: 'Aggro', tags: ['creature', 'combat', 'attack'] },
    { name: 'The Ur-Dragon', colors: 'WUBRG', archetype: 'Dragon Tribal', tags: ['dragon', 'creature', 'combat'] },
  ];

  return candidates
    .map((candidate) => {
      let score = 0;
      for (const color of candidate.colors.split('')) {
        const key = color.toUpperCase();
        if (colorCounts[key]) score += colorCounts[key] * 2;
      }

      if (candidate.archetype === topArchetype) score += 12;
      if (candidate.tags.some((tag) => state.deck.some((card) => {
        const text = `${card.name} ${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();
        return text.includes(tag.toLowerCase());
      }))) score += 8;

      const deckText = state.deck.map((card) => `${card.name} ${card.typeLine || ''} ${card.oracleText || ''}`).join(' ').toLowerCase();
      if (candidate.tags.some((tag) => deckText.includes(tag.toLowerCase()))) score += 4;

      return { ...candidate, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function saveCurrentDeck() {
  const name = deckNameInput.value.trim();

  if (!name) {
    statusNode.textContent = 'Enter a name for the deck before saving it.';
    return;
  }

  if (!state.deck.length) {
    statusNode.textContent = 'Your deck is empty. Add cards before saving.';
    return;
  }

  const payload = {
    name,
    cards: state.deck.map((card) => ({ ...card })),
  };

  const existingIndex = state.savedDecks.findIndex((deck) => deck.name.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    state.savedDecks[existingIndex] = payload;
  } else {
    state.savedDecks.unshift(payload);
  }

  persistSavedDecks();
  renderSavedDecks();
  statusNode.textContent = `Saved deck "${name}".`;
}

function renderSavedDecks() {
  if (!state.savedDecks.length) {
    savedDecksList.innerHTML = '<div class="empty-state">No saved decks yet.</div>';
    return;
  }

  savedDecksList.innerHTML = state.savedDecks.map((deck) => `
    <div class="saved-deck-item">
      <strong>${escapeHtml(deck.name)}</strong>
      <div class="saved-deck-actions">
        <button type="button" data-action="load-deck" data-name="${escapeHtml(deck.name)}">Load</button>
        <button type="button" data-action="delete-deck" data-name="${escapeHtml(deck.name)}">Delete</button>
      </div>
    </div>
  `).join('');
}

function exportDeck() {
  if (!state.deck.length) {
    statusNode.textContent = 'Your deck is empty. Add cards before exporting.';
    return;
  }

  const header = 'Qty,Name,Rarity,Set';
  const rows = state.deck.map((item) => [
    String(item.count || 0),
    item.name || '',
    item.rarity || 'Unknown',
    item.set || 'Unknown',
  ].map(escapeCsvField).join(','));

  const text = [header, ...rows].join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mtg-deck.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  statusNode.textContent = 'Deck exported in Qty, Name, Rarity, Set format.';
}

function handleDeckImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const allowedExtensions = /\.(txt|csv)$/i;
  const allowedMimeTypes = ['text/plain', 'text/csv', 'application/csv', 'application/octet-stream'];

  if (file.size > 1024 * 1024) {
    statusNode.textContent = 'Deck import file is too large. Please use files under 1 MB.';
    event.target.value = '';
    return;
  }

  if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
    statusNode.textContent = 'Only .txt or .csv deck files can be imported.';
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const text = String(loadEvent.target?.result || '');
    const sanitized = sanitizeTextInput(text);
    importDeckFromText(sanitized);
    event.target.value = '';
  };
  reader.readAsText(file);
}

function sanitizeTextInput(input) {
  return String(input)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

function importDeckFromText(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (!lines.length) {
    statusNode.textContent = 'No deck data was found in the selected file.';
    return;
  }

  const parsed = [];

  for (const line of lines) {
    if (/^qty\s*,\s*name\s*,\s*rarity\s*,\s*set/i.test(line)) {
      continue;
    }

    const values = parseCsvLine(line);
    if (values.length < 4) continue;

    const qty = Number.parseInt(values[0], 10);
    const name = values[1]?.trim();
    const rarity = values[2]?.trim() || 'Unknown';
    const set = values[3]?.trim() || 'Unknown';

    if (!name || Number.isNaN(qty) || qty <= 0) {
      continue;
    }

    parsed.push({
      id: createDeckId(name, set),
      name,
      count: qty,
      owned: 0,
      rarity,
      set,
      imageUrl: '',
      typeLine: '',
      oracleText: '',
      colorIdentity: [],
    });
  }

  if (!parsed.length) {
    statusNode.textContent = 'No valid records were found. Use Qty,Name,Rarity,Set rows.';
    return;
  }

  for (const item of parsed) {
    const existing = state.deck.find((entry) => entry.id === item.id || (
      entry.name.toLowerCase() === item.name.toLowerCase() && (entry.set || '').toLowerCase() === item.set.toLowerCase()
    ));

    if (existing) {
      existing.count = Math.max(existing.count, item.count);
    } else {
      state.deck.push(item);
    }
  }

  persistDeck();
  renderDeck();
  renderDeckInsights();
  statusNode.textContent = `Imported ${parsed.length} card entries into the deck.`;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function escapeCsvField(value) {
  const text = String(value ?? '');
  if (/[",]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function createDeckId(name, set) {
  return `${(name || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(set || 'set').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function normalizeDeckCard(item) {
  return {
    id: item.id || createDeckId(item.name || 'card', item.set || 'set'),
    name: item.name || 'Unknown card',
    imageUrl: item.imageUrl || '',
    count: Number(item.count) || 1,
    owned: Number(item.owned) || 0,
    rarity: item.rarity || 'Unknown',
    set: item.set || 'Unknown',
    typeLine: item.typeLine || '',
    oracleText: item.oracleText || '',
    colorIdentity: Array.isArray(item.colorIdentity) ? item.colorIdentity : [],
  };
}

function persistDeck() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.deck));
}

function persistSavedDecks() {
  localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(state.savedDecks));
}

function loadDeck() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeDeckCard) : [];
  } catch (error) {
    console.warn('Deck data could not be restored.', error);
    return [];
  }
}

function loadSavedDecks() {
  try {
    const raw = localStorage.getItem(SAVED_DECKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((deck) => ({
      name: deck.name || 'Untitled deck',
      cards: Array.isArray(deck.cards) ? deck.cards.map(normalizeDeckCard) : [],
    })) : [];
  } catch (error) {
    console.warn('Saved deck data could not be restored.', error);
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideAutocomplete();
  }
});
