// Foguetim ERP — Background Service Worker

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  }
  if (message.action === 'clearBadge') {
    chrome.action.setBadgeText({ text: '' });
  }
  return true;
});

// On install, open welcome page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://app.foguetim.com.br/extensao' });
  }
});
