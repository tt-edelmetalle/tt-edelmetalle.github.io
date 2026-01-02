/* -------- Configuration & Data -------- */
let DAILY_SPOT_EUR = { gold: 3625, silver: 60, platinum: 1650, palladium: 1300 };
let LAST_UPDATE = "31.12.2025, 08:30 Uhr";
const PREMIUMS = { gold_coin: 1, gold_bar: 1, silver_coin: 1, silver_bar: 1, plat_coin: 1, pall_coin: 1 };
const COIN_MODIFIERS = { 'g_phil_1': 1.00, 'g_krue_1': 0.97, 'g_maple_1': 0.99, 'g_brit_1': 1.01, 'g_eagle_1': 0.995, 'g_buff_1': 1.03, 'g_krue_05': 0.99 };
const catalogDB = [
    { id: 'g_krue_1', name: 'Krügerrand 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_krue_05', name: 'Krügerrand 1/2 oz', metal: 'gold', type: 'coin', fine: 15.552 },
    { id: 'g_maple_1', name: 'Maple Leaf 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_brit_1', name: 'Britannia 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_phil_1', name: 'Wiener Philharmoniker 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_eagle_1', name: 'American Eagle 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_buff_1', name: 'American Buffalo 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_vren', name: 'Vreneli 20 Fr', metal: 'gold', type: 'coin', fine: 5.806 },
    { id: 'g_dukat', name: '1 Dukat Österreich', metal: 'gold', type: 'coin', fine: 3.44 },
    { id: 'g_bar_100', name: 'Goldbarren 100g', metal: 'gold', type: 'bar', fine: 100.0 },
    { id: 'g_bar_50', name: 'Goldbarren 50g', metal: 'gold', type: 'bar', fine: 50.0 },
    { id: 'g_bar_1oz', name: 'Goldbarren 1 oz', metal: 'gold', type: 'bar', fine: 31.103 },
    { id: 'g_bar_10', name: 'Goldbarren 10g', metal: 'gold', type: 'bar', fine: 10.0 },
    { id: 's_maple', name: 'Silber Maple Leaf 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_krue', name: 'Silber Krügerrand 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_phil', name: 'Silber Philharmoniker 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_eagle', name: 'Silber Eagle 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_bar_1kg', name: 'Silberbarren 1 kg', metal: 'silver', type: 'bar', fine: 1000.0 },
    { id: 's_bar_100', name: 'Silberbarren 100g', metal: 'silver', type: 'bar', fine: 100.0 },
    { id: 'pt_maple', name: 'Platin Maple Leaf 1 oz', metal: 'platinum', type: 'coin', fine: 31.103 },
    { id: 'pt_brit', name: 'Platin Britannia 1 oz', metal: 'platinum', type: 'coin', fine: 31.103 },
    { id: 'pt_bar_1', name: 'Platinbarren 1 oz', metal: 'platinum', type: 'bar', fine: 31.103 },
    { id: 'pd_maple', name: 'Palladium Maple Leaf 1 oz', metal: 'palladium', type: 'coin', fine: 31.103 },
    { id: 'pd_bar_1', name: 'Palladiumbarren 1 oz', metal: 'palladium', type: 'bar', fine: 31.103 }
];

// Persistent Portfolio from LocalStorage
let portfolio = JSON.parse(localStorage.getItem('tt_portfolio')) || [];
let lastAddedIndex = -1;
const STANDARD_ANKAUF_SPREAD = 1;

function savePortfolio() {
    localStorage.setItem('tt_portfolio', JSON.stringify(portfolio));
}

/* -------- Initialization -------- */
async function loadPricesThenInit() {
    const PRICE_JSON_PATH = "./prices.json";
    try {
        const resp = await fetch(PRICE_JSON_PATH, { cache: "no-store" });
        if (!resp.ok) throw new Error("prices.json nicht erreichbar");
        const data = await resp.json();
        if (data && data.rates) {
            if (data.rates.gold?.per_oz) DAILY_SPOT_EUR.gold = data.rates.gold.per_oz;
            if (data.rates.silver?.per_oz) DAILY_SPOT_EUR.silver = data.rates.silver.per_oz;
            if (data.rates.platinum?.per_oz) DAILY_SPOT_EUR.platinum = data.rates.platinum.per_oz;
            if (data.rates.palladium?.per_oz) DAILY_SPOT_EUR.palladium = data.rates.palladium.per_oz;
            LAST_UPDATE = data.updated_at || new Date().toLocaleString('de-DE');
        }
    } catch (err) {
        console.warn('Fallback prices used due to:', err);
        LAST_UPDATE = "Fallback (offline) " + new Date().toLocaleString('de-DE');
    }

    try {
        if(document.getElementById('catalogSelect')) initCustomSelect();
        if(document.getElementById('catalogSelect')) populateCatalog('all');
        
        // Page specific renders
        if(document.getElementById('dash-gold')) renderPrices();
        if(document.getElementById('coin-compare')) renderCoinComparison();
        if(document.getElementById('portfolio-container')) renderPortfolio();
        
        buildMobileNav();
        initMobileOverlay();
        responsiveInit();
    } catch (e) {
        console.error('Fehler UI Init:', e);
    }
    
    const updEl = document.getElementById('update-date');
    if (updEl) updEl.innerText = LAST_UPDATE;
}

window.onload = function () {
    loadPricesThenInit();
    // Automatischer Aufruf des Consent-Banners beim Laden
    initConsentState();
};

/* -------- Navigation Logic (Mobile) -------- */
function toggleMobileNav() {
    const mn = document.getElementById('mobile-nav');
    const overlay = document.getElementById('mobile-overlay');
    const btn = document.getElementById('hamburger');
    const isOpen = mn.classList.contains('open');
    if (isOpen) closeMobileNav();
    else {
        mn.classList.add('open'); overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false'); btn.setAttribute('aria-expanded', 'true');
        mn.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll');
    }
}

function closeMobileNav() {
    const mn = document.getElementById('mobile-nav');
    const overlay = document.getElementById('mobile-overlay');
    const btn = document.getElementById('hamburger');
    if(!mn) return;
    mn.classList.remove('open'); overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false');
    mn.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll');
}

function initMobileOverlay() {
    const overlay = document.getElementById('mobile-overlay');
    if(overlay) {
        overlay.addEventListener('click', closeMobileNav);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });
    }
}

function buildMobileNav() {
    const mn = document.getElementById('mobile-nav');
    const items = document.querySelectorAll('.nav-menu .nav-item');
    if(!mn) return;
    mn.innerHTML = '';
    items.forEach(it => {
        const clone = it.cloneNode(true);
        clone.classList.remove('active');
        mn.appendChild(clone);
    });
}

/* -------- Pricing Logic -------- */
function calculateItemPrice(item) {
    const spotPerOz = DAILY_SPOT_EUR[item.metal];
    const spotPerGram = spotPerOz / 31.1034768;
    let premium = 1.0;
    if (item.metal === 'gold') premium = (item.type === 'coin') ? PREMIUMS.gold_coin : PREMIUMS.gold_bar;
    if (item.metal === 'silver') premium = (item.type === 'coin') ? PREMIUMS.silver_coin : PREMIUMS.silver_bar;
    if (item.metal === 'platinum') premium = PREMIUMS.plat_coin;
    if (item.metal === 'palladium') premium = PREMIUMS.pall_coin;
    const coinModifier = (item.type === 'coin' && COIN_MODIFIERS[item.id]) ? COIN_MODIFIERS[item.id] : 1.0;
    return item.fine * spotPerGram * premium * coinModifier;
}

function formatMoney(val) {
    return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function renderPrices() {
    const phil = catalogDB.find(i => i.id === 'g_phil_1');
    const philPrice = (phil) ? calculateItemPrice(phil) : (DAILY_SPOT_EUR.gold * PREMIUMS.gold_coin);
    if(document.getElementById('dash-gold')) document.getElementById('dash-gold').innerText = formatMoney(philPrice);
    
    const silver1 = catalogDB.find(i => i.id === 's_maple') || { metal: 'silver', type:'coin', fine:31.1 };
    const plat1 = catalogDB.find(i => i.id === 'pt_maple') || { metal: 'platinum', type:'coin', fine:31.1 };
    const pall1 = catalogDB.find(i => i.id === 'pd_maple') || { metal: 'palladium', type:'coin', fine:31.1 };
    
    if(document.getElementById('dash-silver')) document.getElementById('dash-silver').innerText = formatMoney(calculateItemPrice(silver1));
    if(document.getElementById('dash-plat')) document.getElementById('dash-plat').innerText = formatMoney(calculateItemPrice(plat1));
    if(document.getElementById('dash-pall')) document.getElementById('dash-pall').innerText = formatMoney(calculateItemPrice(pall1));
}

function renderCoinComparison() {
    const container = document.getElementById('coin-compare');
    if(!container) return;
    const compareIds = ['g_phil_1', 'g_krue_1', 'g_maple_1', 'g_brit_1', 'g_eagle_1', 'g_buff_1'];
    container.innerHTML = '';
    compareIds.forEach(id => {
        const item = catalogDB.find(i => i.id === id);
        if (!item) return;
        const price = calculateItemPrice(item);
        const el = document.createElement('div');
        el.style.display = 'flex'; el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center'; el.style.gap = '8px';
        el.innerHTML = `<div style="font-weight:700; color:var(--c-text-main); font-size:0.95rem;">${item.name}</div><div style='text-align:right; font-size:0.95rem; color:var(--c-primary);'>${formatMoney(price)}</div>`;
        container.appendChild(el);
    });
}

/* -------- Calculator Logic -------- */
function initCustomSelect() {
    const toggle = document.getElementById('catalogToggle');
    const list = document.getElementById('catalogList');
    if(!toggle || !list) return;
    toggle.addEventListener('click', (e) => {
        const open = list.hasAttribute('hidden');
        if (open) { list.hidden = false; list.removeAttribute('hidden'); toggle.setAttribute('aria-expanded', 'true'); list.focus(); }
        else { list.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.select-wrapper')) { list.hidden = true; toggle.setAttribute('aria-expanded', 'false'); } });
}

function populateCatalog(filter) {
    const sel = document.getElementById('catalogSelect');
    const list = document.getElementById('catalogList');
    if(!sel || !list) return;
    sel.innerHTML = ''; list.innerHTML = '';
    catalogDB.forEach(item => {
        if (filter === 'all' || item.metal === filter) {
            let opt = document.createElement('option'); opt.value = item.id; opt.text = item.name; sel.appendChild(opt);
            let li = document.createElement('li'); li.tabIndex = 0; li.setAttribute('role', 'option'); li.dataset.value = item.id; li.innerText = item.name;
            li.addEventListener('click', () => { selectCatalogItem(item.id); });
            list.appendChild(li);
        }
    });
    if (sel.options && sel.options.length > 0) { selectCatalogItem(sel.options[0].value); }
}

function selectCatalogItem(id) {
    const sel = document.getElementById('catalogSelect');
    const list = document.getElementById('catalogList');
    const toggle = document.getElementById('catalogToggle');
    if(!sel) return;
    sel.value = id;
    const item = catalogDB.find(x => x.id === id);
    if(item) {
        toggle.innerHTML = `${item.name} <i class="fa-solid fa-caret-down"></i>`;
        updateCatDetails();
    }
    list.hidden = true; toggle.setAttribute('aria-expanded', 'false');
}

function updateCatDetails() {
    const sel = document.getElementById('catalogSelect');
    const id = sel.value;
    if (!id) return;
    const item = catalogDB.find(x => x.id === id);
    if (!item) return;
    const price = calculateItemPrice(item);
    document.getElementById('cat-price-display').value = formatMoney(price);
}

function toggleCalcMode(mode) {
    document.getElementById('mode-catalog').style.display = (mode === 'catalog') ? 'block' : 'none';
    document.getElementById('mode-raw').style.display = (mode === 'raw') ? 'block' : 'none';
    document.getElementById('tab-cat').classList.toggle('active', mode === 'catalog');
    document.getElementById('tab-raw').classList.toggle('active', mode === 'raw');
}

function filterCatalog(metalType) { populateCatalog(metalType); }

function addToPortfolio() {
    let itemToAdd = {};
    const spreadVal = STANDARD_ANKAUF_SPREAD;
    const catalogMode = document.getElementById('tab-cat').classList.contains('active');
    
    if (catalogMode) {
        const id = document.getElementById('catalogSelect').value;
        const qty = parseInt(document.getElementById('cat-qty').value) || 1;
        const dbItem = catalogDB.find(x => x.id === id);
        if (!dbItem) return alert('Kein Produkt gewählt');
        let basePrice = calculateItemPrice(dbItem);
        itemToAdd = { name: dbItem.name, metal: dbItem.metal, singleVal: basePrice, qty: qty, spread: spreadVal };
    } else {
        const metal = document.getElementById('raw-metal').value;
        const weight = parseFloat(document.getElementById('raw-weight').value);
        const purity = parseFloat(document.getElementById('raw-purity').value);
        if (!weight || weight <= 0) return alert("Gewicht fehlt oder ungültig");
        const spotPerOz = DAILY_SPOT_EUR[metal];
        const spotPerGram = spotPerOz / 31.1034768;
        let basePrice = (weight * purity) * spotPerGram;
        itemToAdd = { name: `Manuell (${metal.toUpperCase()})`, metal: metal, singleVal: basePrice, qty: 1, spread: spreadVal };
    }
    
    portfolio.push(itemToAdd);
    savePortfolio(); // Save to localStorage
    lastAddedIndex = portfolio.length - 1;
    renderPortfolio();
    
    const addBtn = document.querySelector('.btn.btn-primary.add-btn-hook');
    if(addBtn) {
        addBtn.style.transform = 'scale(0.98)';
        setTimeout(() => addBtn.style.transform = '', 140);
    }
}

function renderPortfolio() {
    const container = document.getElementById('portfolio-container');
    if(!container) return;
    
    let total = 0;
    if (portfolio.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--c-text-muted); padding-top: 40px;">Noch keine Positionen.</p>';
        document.getElementById('total-value').innerText = formatMoney(0);
        document.getElementById('port-count').innerText = "0 Positionen";
        return;
    }
    
    let html = '<div class="inventory-list">';
    portfolio.forEach((item, index) => {
        const totalItemVal = item.singleVal * item.qty * item.spread;
        total += totalItemVal;
        let spreadLabel = "";
        if (item.spread < 1.0 && item.spread > 0.8) spreadLabel = '<span style="font-size:0.7rem; color:var(--c-text-muted)">(Ankaufswert)</span>';
        
        let iconColor = 'var(--c-text-main)';
        if (item.metal === 'gold') iconColor = 'var(--color-gold)';
        if (item.metal === 'silver') iconColor = 'var(--color-silver)';
        if (item.metal === 'platinum') iconColor = 'var(--color-plat)';
        if (item.metal === 'palladium') iconColor = 'var(--color-pall)';
        
        html += `
        <div class="inventory-item" data-idx="${index}">
          <div style="display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-circle" style="font-size:0.7rem; color:${iconColor};"></i>
            <div>
              <div style="font-weight:700; color:var(--c-text-main);">${item.name}</div>
              <div style="font-size:0.82rem; color:var(--c-text-muted);">${item.qty} Stück ${spreadLabel}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; color:var(--c-primary);">${formatMoney(totalItemVal)}</div>
            <i class="fa-solid fa-trash" style="cursor:pointer; color:var(--c-text-muted); font-size:0.88rem; margin-top:6px;" onclick="removeFromPortfolio(${index})" aria-label="Position löschen"></i>
          </div>
        </div>`;
    });
    html += '</div>';
    
    container.innerHTML = html;
    
    if (lastAddedIndex >= 0) {
        const itemEl = container.querySelector(`.inventory-item[data-idx='${lastAddedIndex}']`);
        if (itemEl) {
            itemEl.classList.add('item-added');
            setTimeout(() => itemEl.classList.remove('item-added'), 600);
        }
        lastAddedIndex = -1;
    }
    document.getElementById('total-value').innerText = formatMoney(total);
    document.getElementById('port-count').innerText = portfolio.length + " Positionen";
}

function removeFromPortfolio(idx) {
    portfolio.splice(idx, 1);
    savePortfolio(); // Update localStorage
    renderPortfolio();
}

function clearPortfolio() {
    portfolio = [];
    savePortfolio(); // Update localStorage
    renderPortfolio();
}

/* -------- Utils & Legal -------- */
function responsiveInit() {
    function adjustCharts() {
        const tvs = document.querySelectorAll('.tradingview-widget-container');
        tvs.forEach(el => {
            if (window.innerWidth < 700) el.style.minHeight = '220px';
            else if (window.innerWidth < 1100) el.style.minHeight = '360px';
            else el.style.minHeight = '540px';
        });
    }
    adjustCharts();
    window.addEventListener('resize', adjustCharts);
}

function openLegal(type) {
    const overlay = document.getElementById('legal-overlay');
    const title = document.getElementById('legal-title');
    const content = document.getElementById('legal-content');
    
    let html = '';
    let headline = '';
    
    if (type === 'impressum') { 
        headline = 'Impressum'; 
        // Adresse angeglichen an Datenschutz
        html = '<p><strong>Angaben gemäß § 5 TMG</strong></p><p>T&T Edelmetalle<br>Österreich<br>2293 marchegg<br>E-Mail: info.ttedelmetalle@gmail.com</p>'; 
    }

    if (type === 'haftung') { 
        headline = 'Haftungsausschluss'; 
        // Hier sind deine exakten Haftungsausschluss-Texte
        html = `
        <p>
        Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt.
        Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
        </p>
        <p>
        Die dargestellten Preise stellen keine verbindlichen Angebote dar und dienen ausschließlich Informationszwecken.
        </p>
        <p>
        Entscheidungen, die Sie auf Grundlage der Inhalte dieser Seite treffen, liegen in Ihrer Verantwortung.
        Wir haften nicht für unmittelbare oder mittelbare Schäden, die aus der Nutzung dieser Informationen entstehen.
        </p>
        `; 
    }

    if (type === 'datenschutz') { 
        headline = 'Datenschutzerklärung'; 
        // Hier sind deine exakten Datenschutz-Texte inkl. Marchegg Adresse
        html = `
        <p><strong>1. Allgemeine Hinweise</strong></p>
        <p>
        Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen.
        Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften
        sowie dieser Datenschutzerklärung.
        </p>

        <p><strong>2. Verantwortlicher</strong></p>
        <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br>
        T&T Edelmetalle<br>
        Österreich<br>
        2293 marchegg<br>
        E-Mail: info.ttedelmetalle@gmail.com
        </p>

        <p><strong>3. Erhebung und Speicherung personenbezogener Daten</strong></p>
        <p>
        Diese Website kann grundsätzlich ohne Angabe personenbezogener Daten genutzt werden.
        Es werden <strong>keine Benutzerkonten</strong> und <strong>keine personenbezogenen Eingaben</strong> dauerhaft auf unseren Servern gespeichert.
        Formulare (z. B. Kontaktformular) werden nur dann verarbeitet, wenn Sie diese aktiv absenden.
        </p>

        <p><strong>4. Portfolio-Rechner</strong></p>
        <p>
        Alle Eingaben im Portfolio-Rechner erfolgen ausschließlich lokal im Browser (LocalStorage wird NICHT verwendet für Portfolio-Daten).
        Es findet <strong>keine Übertragung, Speicherung oder Auswertung auf unseren Servern</strong> statt, sofern Sie nicht explizit etwas exportieren (z. B. PDF).
        </p>

        <p><strong>5. Externe Inhalte & Drittanbieter</strong></p>
        <p>
        Auf dieser Website werden externe Dienste eingebunden, die Drittanbieter-Inhalte bereitstellen können:
        </p>
        <ul>
            <li><strong>TradingView Widgets:</strong> Zur Anzeige von Charts und Ticker-Tape. Beim Laden werden Verbindungen zu den Servern von TradingView aufgebaut.</li>
            <li><strong>Google Fonts:</strong> Für Schriftarten (fonts.googleapis.com, fonts.gstatic.com).</li>
            <li><strong>Font Awesome / CDNJS:</strong> Icon- und Script-Hosting.</li>
        </ul>
        <p>
        Beim Laden dieser Inhalte können Daten (z. B. Ihre IP-Adresse, angefragte URL) an die jeweiligen Drittanbieter übermittelt werden.
        Die Nutzung dieser Drittanbieter erfolgt auf Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO). Wenn Sie damit nicht einverstanden sind, können Sie die Nutzung der Drittanbieter über die Cookie-/Einwilligungsfunktion ablehnen.
        </p>

        <p><strong>6. Cookies & Tracking</strong></p>
        <p>
        Diese Website verwendet nach aktuellem Stand <strong>keine Tracking-Cookies</strong> und keine Analyse-Tools.
        Die sichtbare Cookie-/Einwilligungs-Meldung dient der Transparenz gegenüber eingebundenen Drittinhalten.
        </p>

        <p><strong>7. Server-Logfiles</strong></p>
        <p>
        Technische Informationen wie Browsertyp, Betriebssystem oder Uhrzeit der Anfrage werden möglicherweise vom Hosting-Provider in Server-Logfiles protokolliert. Diese Daten sind nicht einzelnen Personen zuordenbar und dienen der Sicherheit und dem Betrieb des Dienstes.
        </p>

        <p><strong>9. Aktualität</strong></p>
        <p>
        Diese Datenschutzerklärung hat den Stand: Januar 2026
        </p>
        `;
    }

    title.innerText = headline;
    content.innerHTML = html;
    overlay.style.display = 'flex';
    document.body.classList.add('no-scroll');
}

function closeLegal() {
    document.getElementById('legal-overlay').style.display = 'none';
    document.body.classList.remove('no-scroll');
}

function exportPortfolioPDF() {
    if (!portfolio || portfolio.length === 0) { alert('Das Portfolio ist leer.'); return; }
    if (!window.jspdf) { alert('PDF Library missing.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    let y = 20;
    doc.setFontSize(14); doc.text('T&T Edelmetalle – Portfolio', margin, y);
    doc.setFontSize(10); y += 6; doc.text('Exportdatum: ' + new Date().toLocaleString('de-DE'), margin, y);
    y += 8; doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text('Pos.', margin, y); doc.text('Bezeichnung', margin + 12, y); doc.text('Anz.', margin + 98, y);
    doc.text('Einzel', margin + 120, y); doc.text('Gesamt', margin + 160, y);
    y += 4; doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(margin, y, 195, y); y += 6;
    doc.setFont(undefined, 'normal');
    
    portfolio.forEach((item, idx) => {
        const totalItemVal = item.singleVal * item.qty * item.spread;
        const name = item.name;
        const splitName = doc.splitTextToSize(name, 80);
        const lines = Math.max(splitName.length, 1);
        for(let i=0; i<lines; i++) {
            if(y > 275) { doc.addPage(); y=20; }
            if(i===0) {
                doc.text(String(idx + 1), margin, y);
                doc.text(splitName[i], margin + 12, y);
                doc.text(String(item.qty), margin + 98, y);
                doc.text(formatMoney(item.singleVal), margin + 120, y);
                doc.text(formatMoney(totalItemVal), margin + 160, y);
            } else { doc.text(splitName[i], margin+12, y); }
            y += 7;
        }
    });
    
    y += 4; doc.setLineWidth(0.4); doc.line(margin, y, 195, y); y += 8;
    doc.setFont(undefined, 'bold');
    const totalVal = portfolio.reduce((acc, curr) => acc + (curr.singleVal * curr.qty * curr.spread), 0);
    doc.text('Gesamtwert: ' + formatMoney(totalVal), margin, y);
    doc.save('Portfolio_Export.pdf');
}

/* -------- Consent Management (Automatic Popup) -------- */
function getConsent() { try { return localStorage.getItem('tt_consent'); } catch (e) { return null; } }
function setConsent(value) { try { localStorage.setItem('tt_consent', value); } catch (e) { } }

function showConsentBanner() {
    const overlay = document.getElementById('consent-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.classList.add('no-scroll');
}

function hideConsentBanner() {
    const overlay = document.getElementById('consent-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.classList.remove('no-scroll');
}

function acceptConsent() { 
    setConsent('accepted'); 
    hideConsentBanner(); 
}

function declineConsent() { 
    setConsent('declined'); 
    hideConsentBanner(); 
}

// Diese Funktion prüft automatisch beim Start, ob bereits eine Wahl getroffen wurde.
// Falls nicht, wird das Popup angezeigt.
function initConsentState() {
    const current = getConsent();
    if (!current) {
        showConsentBanner();
    }
}
