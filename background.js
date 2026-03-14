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

// Helper function to check if a value is a smartlabels array (based on gmail.js)
// Smartlabels are arrays of strings starting with ^ (like ^pfg, ^f_bt, ^r, etc.)
const isSmartlabelsArray = (obj) => {
  if (!obj || !Array.isArray(obj) || obj.length === 0) {
    return false;
  }
  for (const item of obj) {
    if (typeof item !== "string" || !/^\^[a-z_]+/.test(item)) {
      return false;
    }
  }
  return true;
};

// Helper function to recursively search for smartlabels in parsed JSON (based on gmail.js)
const findSmartlabelsInObject = (obj) => {
  const smartlabels = [];

  const searchRecursive = (item) => {
    if (isSmartlabelsArray(item)) {
      smartlabels.push(item);
      return;
    }

    if (Array.isArray(item)) {
      for (const element of item) {
        searchRecursive(element);
      }
    } else if (item && typeof item === "object") {
      for (const key in item) {
        searchRecursive(item[key]);
      }
    }
  };

  searchRecursive(obj);
  return smartlabels;
};

// Helper function to check if Gmail request is a send action
// Based on gmail.js detection logic
const isGmailSendRequest = (requestBody) => {
  try {
    const bodyStr = decodeRequestBody(requestBody);
    if (!bodyStr) return false;

    // Try to parse as JSON for more robust detection (gmail.js approach)
    let parsedData = null;
    try {
      parsedData = JSON.parse(bodyStr);
    } catch {
      // If JSON parsing fails, fall back to string matching
    }

    // Method 1: Parse JSON structure and look for smartlabels (gmail.js approach)
    if (parsedData) {
      const smartlabelsArrays = findSmartlabelsInObject(parsedData);

      for (const smartlabels of smartlabelsArrays) {
        const hasSentFlag =
          smartlabels.includes("^pfg") || smartlabels.includes("^f_bt");
        const isDraft =
          smartlabels.includes("^r") || smartlabels.includes("^r_bt");

        // If we find a smartlabels array with sent flag and no draft flag, it's a send
        if (hasSentFlag && !isDraft) {
          return true;
        }
      }
    }

    // Method 2: Fallback to string matching (original approach)
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

// Helper function to check if ProtonMail request is a send action
const isProtonMailSendRequest = (url, method) => {
  // ProtonMail uses POST method for sending messages
  // Draft saves and other operations use different methods (GET, PUT)
  try {
    // Send: POST to /api/mail/v4/messages/ with Source=composer
    // Draft/other: GET or PUT to same endpoint
    return (
      method === "POST" &&
      url.includes("/api/mail/v4/messages/") &&
      url.includes("?Source=composer")
    );
  } catch (_err) {
    return false;
  }
};

// Helper function to check if GitHub request is a PR creation
const isGitHubPRCreationRequest = (url, method) => {
  // GitHub creates PRs via POST to /pull/create
  try {
    return method === "POST" && url.includes("/pull/create");
  } catch (_err) {
    return false;
  }
};

// ============================================================================
// Network Listeners - Email Detection
// ============================================================================

// Listen for network requests to Gmail sync endpoint (/i/s)
// This endpoint is used for most Gmail actions including sending emails
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isGmailSendRequest(details.requestBody)) {
      chrome.tabs.sendMessage(details.tabId, { action: "emailSent" }, () => {});
    }
  },
  {
    urls: ["https://mail.google.com/sync/u/*/i/s*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Listen for network requests to Gmail fetch endpoint (/i/fd)
// This endpoint is also used for email operations (based on gmail.js)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isGmailSendRequest(details.requestBody)) {
      chrome.tabs.sendMessage(details.tabId, { action: "emailSent" }, () => {});
    }
  },
  {
    urls: ["https://mail.google.com/sync/u/*/i/fd*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Listen for network requests to Outlook service endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isOutlookSendRequest(details.requestBody)) {
      chrome.tabs.sendMessage(details.tabId, { action: "emailSent" }, () => {});
    }
  },
  {
    urls: [
      "https://outlook.live.com/owa/*/service.svc?action=CreateItem*",
      "https://outlook.office.com/owa/service.svc?action=CreateItem*",
      "https://outlook.office.com/owa/*/service.svc?action=CreateItem*",
      "https://outlook.office365.com/owa/service.svc?action=CreateItem*",
      "https://outlook.office365.com/owa/*/service.svc?action=CreateItem*",
    ],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Listen for network requests to Yahoo batch endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isYahooSendRequest(details.requestBody, details.url)) {
      chrome.tabs.sendMessage(details.tabId, { action: "emailSent" }, () => {});
    }
  },
  {
    urls: ["https://mail.yahoo.com/ws/v3/batch?name=messages.saveAndSend*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Listen for network requests to ProtonMail messages endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isProtonMailSendRequest(details.url, details.method)) {
      chrome.tabs.sendMessage(details.tabId, { action: "emailSent" }, () => {});
    }
  },
  {
    urls: ["https://mail.proton.me/api/mail/v4/messages/*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Listen for network requests to Yandex Mail send endpoint
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isYandexSendRequest(details.url, details.method)) {
      chrome.tabs.sendMessage(details.tabId, { action: "emailSent" }, () => {});
    }
  },
  {
    urls: ["https://mail.yandex.ru/web-api/do-send/*"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"],
);

// Store PR creation timestamps so we can show notification after navigation
const prCreationTimestamps = {};

// Message listener to provide tab ID to content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getTabId") {
    sendResponse({ tabId: sender.tab.id });
  }
  return true;
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isGitHubPRCreationRequest(details.url, details.method)) {
      // Store the timestamp so we know a PR was created
      prCreationTimestamps[details.tabId] = Date.now();
    }
  },
  {
    urls: ["https://github.com/*/pull/create*"],
    types: ["main_frame"],
  },
);

// Listen for when we navigate to the PR page after creation
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Check if we just created a PR and now we're viewing it
    if (
      details.method === "GET" &&
      /github\.com\/.+\/.+\/pull\/\d+/.test(details.url) &&
      details.type === "main_frame"
    ) {
      const tabId = details.tabId;
      const justCreated = prCreationTimestamps[tabId];

      if (justCreated && Date.now() - justCreated < 5000) {
        // Use tab-specific storage key to avoid cross-tab interference
        const storageKey = `prCreated_${tabId}`;
        chrome.storage.local.set({ [storageKey]: true }, () => {});

        // Clean up
        delete prCreationTimestamps[tabId];
      }
    }
  },
  {
    urls: ["https://github.com/*/pull/*"],
    types: ["main_frame"],
  },
);

