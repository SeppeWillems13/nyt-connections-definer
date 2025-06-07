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
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_selected_words") {
        const selectedClass = "Card-module_selected__cN2eT";
        const selectedElements = document.querySelectorAll(`.${selectedClass}`);
        let words = Array.from(selectedElements).map(el => el.innerText || el.textContent);
        // If no cards are selected, try to get the user's text selection
        if (words.length === 0) {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                // Split by whitespace, filter empty, max 4 words
                words = selection.toString().split(/\s+/).filter(Boolean).slice(0, 4);
            }
        }
        sendResponse({ words: words });
    }
    return true; 
});
