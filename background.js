/**
 * Did You Mean? — Chrome Service Worker
 * Listens for trap word updates from the popup and forwards
 * them to any open Gmail tabs so the content script stays in sync.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRAP_WORDS_UPDATED") {
    chrome.tabs.query({ url: "https://mail.google.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      });
    });
  }
});
