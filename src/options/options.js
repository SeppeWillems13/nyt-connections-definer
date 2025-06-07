/**
 * options.js
 * Manages the settings page for the addon.
 */
document.addEventListener('DOMContentLoaded', () => {
    const popoverPositionSelect = document.getElementById('popoverPositionSelect');

    // Load the saved settings when the page opens
    browser.storage.sync.get([
        'popoverPosition'
    ]).then(result => {
        popoverPositionSelect.value = result.popoverPosition || 'auto';
    });

    // Save the setting whenever the select is changed
    popoverPositionSelect.addEventListener('change', () => {
        browser.storage.sync.set({
            popoverPosition: popoverPositionSelect.value
        });
    });
});
