// src/content.ts

// Function to handle both copy and cut
const handleCapture = () => {
  // Small delay to allow the clipboard to update
  setTimeout(async () => {
    try {
      const selection = window.getSelection()?.toString();
      const text = selection || await navigator.clipboard.readText();

      if (text && text.trim().length > 0) {
        chrome.runtime.sendMessage({ 
          type: "NEW_COPY", 
          text: text.trim(),
          sourceUrl: window.location.href,
          sourceTitle: document.title
        });
      }
    } catch (err) {
      console.error("Clippa capture error:", err);
    }
  }, 100);
};

// Listen for BOTH copy and cut
document.addEventListener('copy', handleCapture);
document.addEventListener('cut', handleCapture);