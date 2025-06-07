/**
 * content.js
 * This script runs on the NYT Connections game page.
 * Its purpose is to listen for requests from the popup and
 * find the currently selected words on the page.
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
