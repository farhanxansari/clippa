// src/background.ts
interface ClipboardItem {
  id: number;
  text: string;
  timestamp: number;
  isPinned?: boolean;
  sourceUrl?: string;
  sourceTitle?: string;
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === "NEW_COPY") {
    const copiedText = message.text;

    chrome.storage.local.get(['clipboardHistory'], (result) => {
      let history = (result.clipboardHistory as ClipboardItem[]) || [];
      
      // Prevent duplicates at the very top of the list
      if (history.length > 0 && history[0].text === copiedText) return;

      // Create the new item including the source data from the message
      const newItem: ClipboardItem = {
        id: Date.now(),
        text: copiedText,
        timestamp: Date.now(),
        isPinned: false,
        sourceUrl: message.sourceUrl,   // Captured from content script
        sourceTitle: message.sourceTitle // Captured from content script
      };

      // Add to start of array and keep only the latest 50 items
      const updatedHistory = [newItem, ...history].slice(0, 50);
      
      chrome.storage.local.set({ clipboardHistory: updatedHistory }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving to storage:", chrome.runtime.lastError);
        } else {
          console.log("Clippa: Saved item from source:", message.sourceTitle || "Unknown");
        }
      });
    });
  }
});