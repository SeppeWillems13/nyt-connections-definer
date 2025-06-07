// Listen for the keyboard shortcut command to open the popup
browser.commands.onCommand.addListener((command) => {
    if (command === "open-addon-popup") {
        // Open the popup programmatically
        browser.action.openPopup();
    }
});