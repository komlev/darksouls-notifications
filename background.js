// Background service worker for intercepting mail send requests

// helper function to check if request body contains send markers
const isGamilSendRequest = (requestBody) => {
  // gmail obfuscates it's requests. This is hard and unreliable, feels like magic
  // if they change something this whole thing won't work but oh well
  if (!requestBody || !requestBody.raw) {
    return false;
  }

  try {
    // decode request body from raw bytes
    let bodyStr = "";
    for (const item of requestBody.raw) {
      if (item.bytes) {
        const decoder = new TextDecoder("utf-8");
        bodyStr += decoder.decode(item.bytes);
      }
    }

    // check for sent flags - these are present when email is actually sent
    const hasSentFlags =
      bodyStr.includes('"^f_bt"') || // Sent button flag (most reliable)
      bodyStr.includes('"^pfg"'); // Post from gmail / sent flag

    // additional send markers for forwards/replies
    const hasActionMarker =
      bodyStr.includes('"^io_fwd"') || // Forward
      bodyStr.includes('"^io_re"'); // Reply

    // exclude draft saves (have ^r or ^r_bt markers)
    const isDraft =
      bodyStr.includes('"^r"') || // draft/reply mode
      bodyStr.includes('"^r_bt"'); // draft button mode

    // exclude sync-only markers that are NOT actual sends
    const hasSyncOnlyMarkers =
      bodyStr.includes('"^io_lr"') || // last reply (sync marker)
      bodyStr.includes('"^io_lr2m"') || // last reply to multiple (sync)
      bodyStr.includes('"^io_lr30s"'); // last reply 30s (sync)

    // trigger if:
    // - has sent flags (^f_bt or ^pfg) OR has action marker (^io_fwd or ^io_re)
    // - AND is not a draft
    // - AND is not just a sync operation
    return (hasSentFlags || hasActionMarker) && !isDraft && !hasSyncOnlyMarkers;
  } catch (_err) {
    return false;
  }
};

// listen for network requests to Gmail sync endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isGamilSendRequest(details.requestBody)) {
      chrome.tabs
        .sendMessage(details.tabId, { action: "emailSent" })
        .catch(() => {});
    }
  },
  {
    urls: ["https://mail.google.com/sync/u/*/i/s*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);
