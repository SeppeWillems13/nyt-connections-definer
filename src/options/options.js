/**
 * options.js
 * Manages the settings page for the addon.
 */
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('autoDefineToggle');
    const popoverPositionSelect = document.getElementById('popoverPositionSelect');

    // Load the saved settings when the page opens
    browser.storage.sync.get([
        'autoDefineEnabled',
        'popoverPosition'
    ]).then(result => {
        toggle.checked = !!result.autoDefineEnabled;
        popoverPositionSelect.value = result.popoverPosition || 'auto';
    });

    // Save the setting whenever the toggle is changed
    toggle.addEventListener('change', () => {
        browser.storage.sync.set({
            autoDefineEnabled: toggle.checked
        });
    });
    popoverPositionSelect.addEventListener('change', () => {
        browser.storage.sync.set({
            popoverPosition: popoverPositionSelect.value
        });
    });
});
