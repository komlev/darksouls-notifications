// Background service worker for intercepting mail send requests

// Helper function to decode request body from raw bytes
const decodeRequestBody = (requestBody) => {
  if (!requestBody || !requestBody.raw) {
    return "";
  }

  let bodyStr = "";
  for (const item of requestBody.raw) {
    if (item.bytes) {
      const decoder = new TextDecoder("utf-8");
      bodyStr += decoder.decode(item.bytes);
    }
  }
  return bodyStr;
};

// Helper function to check if Gmail request is a send action
const isGmailSendRequest = (requestBody) => {
  // Gmail obfuscates its requests. This is hard and unreliable, feels like magic.
  // If they change something this whole thing won't work but oh well.
  try {
    const bodyStr = decodeRequestBody(requestBody);
    if (!bodyStr) return false;

    // Check for sent flags - these are present when email is actually sent
    const hasSentFlags =
      bodyStr.includes('"^f_bt"') || // Sent button flag (most reliable)
      bodyStr.includes('"^pfg"'); // Post from gmail / sent flag

    // Additional send markers for forwards/replies
    const hasActionMarker =
      bodyStr.includes('"^io_fwd"') || // Forward
      bodyStr.includes('"^io_re"'); // Reply

    // Exclude draft saves (have ^r or ^r_bt markers)
    const isDraft =
      bodyStr.includes('"^r"') || // Draft/reply mode
      bodyStr.includes('"^r_bt"'); // Draft button mode

    // Exclude sync-only markers that are NOT actual sends
    const hasSyncOnlyMarkers =
      bodyStr.includes('"^io_lr"') || // Last reply (sync marker)
      bodyStr.includes('"^io_lr2m"') || // Last reply to multiple (sync)
      bodyStr.includes('"^io_lr30s"'); // Last reply 30s (sync)

    // Trigger if:
    // - Has sent flags (^f_bt or ^pfg) OR has action marker (^io_fwd or ^io_re)
    // - AND is not a draft
    // - AND is not just a sync operation
    return (hasSentFlags || hasActionMarker) && !isDraft && !hasSyncOnlyMarkers;
  } catch (_err) {
    return false;
  }
};

// Helper function to check if Outlook request is a send action
const isOutlookSendRequest = (requestBody) => {
  // Outlook uses a more structured JSON format in their API
  try {
    const bodyStr = decodeRequestBody(requestBody);
    if (!bodyStr) return false;

    // The key marker for actual send (vs draft save) is MessageDisposition
    const isSendAndSave = bodyStr.includes(
      '"MessageDisposition":"SendAndSaveCopy"',
    );

    // Verify it's a compose operation (not some other action)
    const isComposeOperation = bodyStr.includes('"ComposeOperation":"newMail"');

    // Trigger if both conditions are met:
    // - MessageDisposition is SendAndSaveCopy (actual send, not just save)
    // - ComposeOperation is newMail
    return isSendAndSave && isComposeOperation;
  } catch (_err) {
    return false;
  }
};

// Helper function to check if Yahoo request is a send action
const isYahooSendRequest = (requestBody, url) => {
  // Yahoo uses a batch API with a clear URL pattern
  try {
    // The URL parameter is the most reliable indicator
    // Send: name=messages.saveAndSend
    // Draft: name=messages.save (without AndSend)
    if (!url.includes("name=messages.saveAndSend")) {
      return false;
    }

    if (
      !requestBody ||
      !requestBody.formData ||
      !requestBody.formData.batchJson
    ) {
      return false;
    }
    return requestBody.formData.batchJson.some((b) => {
      return b.includes("/send") && b.includes('"id":"SendMessage"');
    });
  } catch (_err) {
    return false;
  }
};

// Listen for network requests to Gmail sync endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isGmailSendRequest(details.requestBody)) {
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

// Listen for network requests to Outlook service endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isOutlookSendRequest(details.requestBody)) {
      chrome.tabs
        .sendMessage(details.tabId, { action: "emailSent" })
        .catch(() => {});
    }
  },
  {
    urls: ["https://outlook.live.com/owa/*/service.svc?action=CreateItem*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Listen for network requests to Yahoo batch endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isYahooSendRequest(details.requestBody, details.url)) {
      chrome.tabs
        .sendMessage(details.tabId, { action: "emailSent" })
        .catch(() => {});
    }
  },
  {
    urls: ["https://mail.yahoo.com/ws/v3/batch?name=messages.saveAndSend*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);
