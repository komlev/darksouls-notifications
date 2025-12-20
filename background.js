// Background service worker for intercepting Gmail send requests

// Helper function to check if request body contains send markers
const isSendRequest = (requestBody) => {
  if (!requestBody || !requestBody.raw) {
    return false;
  }

  try {
    // Decode request body from raw bytes
    let bodyStr = '';
    for (const item of requestBody.raw) {
      if (item.bytes) {
        const decoder = new TextDecoder('utf-8');
        bodyStr += decoder.decode(item.bytes);
      }
    }

    // Check for sent flags - these are present when email is actually sent
    const hasSentFlags =
      bodyStr.includes('"^f_bt"') ||      // Sent button flag (most reliable)
      bodyStr.includes('"^pfg"');         // Post from gmail / sent flag

    // Additional send markers for forwards/replies
    const hasActionMarker =
      bodyStr.includes('"^io_fwd"') ||    // Forward
      bodyStr.includes('"^io_re"');       // Reply

    // Exclude draft saves (have ^r or ^r_bt markers)
    const isDraft =
      bodyStr.includes('"^r"') ||         // Draft/reply mode
      bodyStr.includes('"^r_bt"');        // Draft button mode

    // Exclude sync-only markers that are NOT actual sends
    const hasSyncOnlyMarkers =
      bodyStr.includes('"^io_lr"') ||     // Last reply (sync marker)
      bodyStr.includes('"^io_lr2m"') ||   // Last reply to multiple (sync)
      bodyStr.includes('"^io_lr30s"');    // Last reply 30s (sync)

    // Trigger if:
    // - Has sent flags (^f_bt or ^pfg) OR has action marker (^io_fwd or ^io_re)
    // - AND is not a draft
    // - AND is not just a sync operation
    return (hasSentFlags || hasActionMarker) && !isDraft && !hasSyncOnlyMarkers;
  } catch (err) {
    // Ignore parsing errors
    return false;
  }
};

// Listen for network requests to Gmail sync endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Check if this is an actual send/forward/reply request
    if (isSendRequest(details.requestBody)) {
      // Send message to content script to show notification
      chrome.tabs
        .sendMessage(details.tabId, { action: "emailSent" })
        .catch(() => {
          // Tab might not have content script loaded, ignore error
        });
    }
  },
  {
    urls: ["https://mail.google.com/sync/u/*/i/s*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"]
);
