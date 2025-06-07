/**
 * popup.js
 * This script runs when the user clicks the extension icon.
 * It coordinates getting the selected word and fetching its definition.
 * 
 * 2025 best practices for Firefox WebExtensions:
 * - Use async/await and handle errors for all browser.* API calls
 * - Use browser.runtime and browser.storage as recommended for Firefox WebExtensions
 * - No deprecated APIs or synchronous XHR
 * - Manifest V3 compliance already present
 */
document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');

    /**
     * Displays an error message in the popup.
     * @param {string} message The error message to show.
     */
    function showError(message) {
        loadingDiv.classList.add('hidden');
        resultsDiv.innerHTML = ''; // Clear any previous results
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    // Get the currently active tab in the browser.
    browser.tabs.query({ active: true, currentWindow: true })
        .then((tabs) => {
            const activeTab = tabs[0];
            // First, check if we are on the correct website.
            if (activeTab.url && activeTab.url.includes("nytimes.com/games/connections")) {
                // If so, send a message to our content script asking for the words.
                 browser.tabs.sendMessage(activeTab.id, { action: "get_selected_words" })
                    .then(response => {
                        // Check for errors during message passing.
                        if (browser.runtime.lastError) {
                            showError("Could not connect to the page. Please reload the game page and try again.");
                            return;
                        }
                        // If we got a response with words, fetch their definitions.
                        if (response && response.words && response.words.length > 0) {
                            fetchDefinitions(response.words);
                        } else {
                            showError("No words selected. Please select one to four words in the game.");
                        }
                    })
                    .catch(err => {
                         showError("Could not communicate with the content script. Is the game page open?");
                         console.error("Message sending failed:", err);
                    });
            } else {
                showError("This extension only works on the NYT Connections game page.");
            }
        })
        .catch(err => {
            showError("Could not get the active tab.");
            console.error("Tab query failed:", err);
        });

    /**
     * Fetches definitions for an array of words from the dictionary API.
     * @param {string[]} words - An array of words to define.
     */
    async function fetchDefinitions(words) {
        loadingDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '';
        errorDiv.classList.add('hidden');

        // Loop through each selected word and fetch its definition.
        for (const word of words) {
            try {
                const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
                const response = await fetch(url);
                if (!response.ok) {
                    // Handle cases where the API doesn't find the word.
                    throw new Error(`Definition not found for "${word}".`);
                }
                const data = await response.json();
                displayDefinition(data[0]);
            } catch (error) {
                // Display an error for this specific word if fetching fails.
                const errorItem = document.createElement('div');
                errorItem.className = 'result-item';
                errorItem.innerHTML = `<div class="word">${word}</div><div class="definition">${error.message}</div>`;
                resultsDiv.appendChild(errorItem);
            }
        }
        loadingDiv.classList.add('hidden');
    }

    /**
     * Renders a definition in the popup.
     * @param {object} data - The definition data from the API.
     */
    function displayDefinition(data) {
        // Safely extract data from the API response.
        const word = data.word;
        const phonetic = data.phonetic || (data.phonetics.find(p => p.text) || {}).text || "";
        // Find first audio URL if available
        const audio = (data.phonetics.find(p => p.audio) || {}).audio || "";
        // Build meanings HTML (all meanings, all definitions)
        let meaningsHtml = '';
        if (Array.isArray(data.meanings)) {
            data.meanings.forEach(meaning => {
                meaningsHtml += `<div style="margin-bottom:6px;"><span style="font-weight:bold;">${meaning.partOfSpeech}</span>`;
                if (Array.isArray(meaning.definitions)) {
                    meaningsHtml += '<ul style="margin:4px 0 0 18px;">';
                    meaning.definitions.forEach(def => {
                        meaningsHtml += `<li>${def.definition}${def.example ? `<br><span style='color:#888;font-size:0.95em;'>e.g. ${def.example}</span>` : ''}</li>`;
                    });
                    meaningsHtml += '</ul>';
                }
                meaningsHtml += '</div>';
            });
        }
        // Origin
        const origin = data.origin ? `<div style='margin-top:8px;font-size:0.95em;color:#666;'><b>Origin:</b> ${data.origin}</div>` : '';

        const item = document.createElement('div');
        item.className = 'result-item';

        // Build the HTML for the definition entry.
        let html = `<div class="word">${word}</div>`;
        if (phonetic) {
            html += `<div class="phonetic">${phonetic}`;
            if (audio) {
                html += ` <button class="audio-btn" title="Play pronunciation" style="background:none;border:none;cursor:pointer;font-size:1em;vertical-align:middle;" data-audio="${audio}">🔊</button>`;
            }
            html += `</div>`;
        }
        html += `<div class="definition">${meaningsHtml}</div>`;
        html += origin;
        item.innerHTML = html;
        resultsDiv.appendChild(item);

        // Add audio event
        if (audio) {
            const btn = item.querySelector('.audio-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    const audioObj = new Audio(btn.getAttribute('data-audio').startsWith('http') ? btn.getAttribute('data-audio') : 'https:' + btn.getAttribute('data-audio'));
                    audioObj.play();
                });
            }
        }
    }
});
