/**
 * content.js
 * This script runs on the NYT Connections game page.
 * Its purpose is to listen for requests from the popup and
 * find the currently selected words on the page.
 * 
 * Use async/await and handle errors for all browser.* API calls
 * Use browser.runtime and browser.storage as recommended for Firefox WebExtensions
 * No deprecated APIs or synchronous XHR
 * Manifest V3 compliance already present
 */

// Listen for a message from the popup script.
// The 'browser' object is the standard for modern web extensions.
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message is the one we're expecting.
    if (request.action === "get_selected_words") {
        // This is the specific class name the NYT Connections game uses for a selected card.
        const selectedClass = "Card-module_selected__cN2eT";
        
        // Find all elements that have this class.
        const selectedElements = document.querySelectorAll(`.${selectedClass}`);
        
        // Extract the text content (the word) from each selected element.
        // We use Array.from to convert the NodeList into an array so we can map over it.
        const words = Array.from(selectedElements).map(el => el.innerText || el.textContent);
        
        // Send the array of found words back to the popup script.
        sendResponse({ words: words });
    }
    // Return true is good practice to indicate that the response might be sent asynchronously,
    // even if in this case it's synchronous.
    return true; 
});

// --- Auto-define (lock) mode implementation ---
(async function() {
    // Read all settings from storage
    const settings = await browser.storage.sync.get([
        'autoDefineEnabled',
        'popoverPosition'
    ]);
    const { autoDefineEnabled, popoverPosition } = settings;
    if (!autoDefineEnabled) return;

    // Inject CSS for the popover
    if (!document.getElementById('nyt-definer-popover-style')) {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = browser.runtime.getURL('injected-ui.css');
        style.id = 'nyt-definer-popover-style';
        document.head.appendChild(style);
    }

    // Helper to remove existing popover
    function removePopover() {
        const pop = document.getElementById('nyt-definer-popover');
        if (pop) pop.remove();
    }

    // Helper to create and show the popover
    function showPopover(words, definitions) {
        removePopover();
        const pop = document.createElement('div');
        pop.id = 'nyt-definer-popover';
        let html = `<div class="definer-header">
            <span class="definer-word">${words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')}</span>
            <button class="definer-close-btn" title="Close">&times;</button>
        </div>`;
        if (definitions.length === 0) {
            html += '<div class="definer-loading">No definitions found.</div>';
        } else {
            html += '<div class="definer-body">' + definitions.map((d, idx) => {
                let audioBtn = '';
                if (d.audio) {
                    audioBtn = ` <button class="definer-audio-btn" title="Play pronunciation" style="background:none;border:none;cursor:pointer;font-size:1.1em;vertical-align:middle;padding:2px 6px;border-radius:4px;background:#e6f0ff;margin-left:6px;transition:background 0.2s;" onmouseover="this.style.background='#cce0ff'" onmouseout="this.style.background='#e6f0ff'" data-audio="${d.audio}">🔊</button>`;
                }
                // Key data summary (word, phonetic, audio, short definition, details button)
                let shortDef = (d.meanings && d.meanings[0] && d.meanings[0].definitions && d.meanings[0].definitions[0]) ? d.meanings[0].definitions[0].definition : '';
                let summaryHtml = `<div class="definer-summary" style="margin-bottom:6px;">
                    <div class="definer-word" style="font-size:1.1em;">${d.word}</div>
                    ${d.phonetic ? `<div class="definer-phonetic">${d.phonetic}${audioBtn}</div>` : ''}
                    <div class="definer-key-def" style="margin:4px 0 0 0; color:#444;">${shortDef}</div>
                    <button class="definer-details-btn" data-idx="${idx}" style="margin-top:8px;padding:5px 14px;font-size:1em;border-radius:5px;border:1px solid #7da7d9;background:linear-gradient(90deg,#eaf3ff,#d2e6fa);cursor:pointer;transition:background 0.2s;box-shadow:0 1px 2px #e0e0e0;">More...</button>
                </div>`;
                // Full details (hidden by default)
                let meaningsHtml = '';
                if (Array.isArray(d.meanings)) {
                    d.meanings.forEach(meaning => {
                        meaningsHtml += `<div style=\"margin-bottom:6px;\"><span style=\"font-weight:bold;\">${meaning.partOfSpeech}</span>`;
                        if (Array.isArray(meaning.definitions)) {
                            meaningsHtml += '<ul style=\"margin:4px 0 0 18px;\">';
                            meaning.definitions.forEach(def => {
                                meaningsHtml += `<li>${def.definition}${def.example ? `<br><span style='color:#888;font-size:0.95em;'>e.g. ${def.example}</span>` : ''}</li>`;
                            });
                            meaningsHtml += '</ul>';
                        }
                        meaningsHtml += '</div>';
                    });
                }
                const origin = d.origin ? `<div style='margin-top:8px;font-size:0.95em;color:#666;'><b>Origin:</b> ${d.origin}</div>` : '';
                let detailsHtml = `<div class="definer-details" id="definer-details-${idx}" style="display:none;">
                    <div>${meaningsHtml}</div>
                    ${origin}
                </div>`;
                return `<div style="margin-bottom:10px;">${summaryHtml}${detailsHtml}</div>`;
            }).join('') + '</div>';
        }
        pop.innerHTML = html;
        document.body.appendChild(pop);
        // Position popover
        const selected = document.querySelector('.Card-module_selected__cN2eT');
        if (popoverPosition === 'top-right') {
            pop.style.top = '30px';
            pop.style.right = '30px';
            pop.style.left = '';
        } else if (selected) {
            const rect = selected.getBoundingClientRect();
            pop.style.top = `${window.scrollY + rect.bottom + 8}px`;
            pop.style.left = `${window.scrollX + rect.left}px`;
            pop.style.right = '';
        } else {
            pop.style.top = '30px';
            pop.style.right = '30px';
            pop.style.left = '';
        }
        // Close button
        pop.querySelector('.definer-close-btn').onclick = () => removePopover();
        // Audio button
        pop.querySelectorAll('.definer-audio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const audioUrl = btn.getAttribute('data-audio');
                const audioObj = new Audio(audioUrl.startsWith('http') ? audioUrl : 'https:' + audioUrl);
                audioObj.play();
            });
        });
        // Details button
        pop.querySelectorAll('.definer-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.getAttribute('data-idx');
                const details = pop.querySelector(`#definer-details-${idx}`);
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    btn.textContent = 'Less';
                } else {
                    details.style.display = 'none';
                    btn.textContent = 'More...';
                }
            });
        });
    }

    // Fetch definitions for an array of words
    async function fetchDefinitions(words) {
        const defs = [];
        for (const word of words) {
            try {
                let url;
                url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Not found');
                const data = await resp.json();
                const entry = data[0];
                // Find first audio URL if available
                const audio = (entry.phonetics.find(p => p.audio) || {}).audio || '';
                defs.push({
                    word: entry.word,
                    phonetic: entry.phonetic || (entry.phonetics.find(p => p.text) || {}).text || '',
                    audio,
                    meanings: entry.meanings,
                    origin: entry.origin || '',
                });
            } catch (e) {
                defs.push({ word, phonetic: '', audio: '', meanings: [], origin: '', definition: 'No definition found.' });
            }
        }
        return defs;
    }

    // Observe changes in selected words
    let lastWords = [];
    const selectedClass = 'Card-module_selected__cN2eT';
    async function updatePopover() {
        const selectedElements = document.querySelectorAll(`.${selectedClass}`);
        const words = Array.from(selectedElements).map(el => el.innerText || el.textContent).filter(Boolean);
        if (words.length === 0) {
            removePopover();
            lastWords = [];
            return;
        }
        if (JSON.stringify(words) === JSON.stringify(lastWords)) return; // No change
        lastWords = words;
        showPopover(words, [{ word: '', phonetic: '', definition: '<span class="definer-loading">Loading...</span>' }]);
        const defs = await fetchDefinitions(words);
        showPopover(words, defs);
    }

    // Set up MutationObserver on the game area
    const gameArea = document.querySelector('[class*=Game-module_game__]') || document.body;
    const observer = new MutationObserver(updatePopover);
    observer.observe(gameArea, { subtree: true, childList: true, attributes: true });
    // Also update on click (for keyboard navigation)
    document.addEventListener('click', updatePopover, true);
    // Initial check
    updatePopover();
})();
