const PREFIX = "ds-banner-";
const EMAIL_TEXT = "EMAIL SENT";
const GIT_TEXT = "PR SUBMITTED";



// playing sound
const playSound = () => {
  try {
    // Get volume from storage (default to 75%)
    chrome.storage.sync.get(["volume"], (result) => {
      const volume = result.volume !== undefined ? result.volume / 100 : 0.75;
      const sound = new Audio(chrome.runtime.getURL("sound.mp3"));
      sound.volume = volume;

      // Try to play and handle errors gracefully
      const playPromise = sound.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Audio playback failed (likely due to CSP or browser policy)
          // Silently fail - notification will still display
        });
      }
    });
  } catch (_err) {
    // Silently fail on CSP or other errors
  }
};

// show email sent text
const showText = (text) => {
  const container = document.createElement("div");
  container.classList.add(`${PREFIX}screen`);
  let glow = "";
  // adding glow effect
  for (let i = 0; i < 8; i++) {
    const time = (8 + i / 2).toFixed(1);
    const delay = (i / 15).toFixed(1);
    glow += `<span style="animation-duration: ${time}s; animation-delay: ${delay}s;" class="${PREFIX}glow">${TEXT}</span>`;
  }
  container.innerHTML = `
    <div class="${PREFIX}bg"></div>
    <div style="position:relative;">
        <span class="${PREFIX}title">${text}</span>
        ${glow}
    </div>
  `;
  document.body.appendChild(container);
  playSound();

  setTimeout(() => {
    container.classList.add(`${PREFIX}hide`);

    setTimeout(() => {
      // cleanup
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      // 10 secs cooldown - ready to receive next message
    }, 10000);
  }, 5000);
};

// Listen for email messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "emailSent") {
    showText(EMAIL_TEXT);
  }
});

// Check if a PR was just created (check storage). Redirect on PR submit requires different handling from email.
chrome.runtime.sendMessage({ action: "getTabId" }, (response) => {
  if (response && response.tabId) {
    const storageKey = `prCreated_${response.tabId}`;
    chrome.storage.local.get([storageKey], (result) => {
      if (result[storageKey]) {
        showText(GIT_TEXT);
        // Clear the flag
        chrome.storage.local.remove([storageKey]);
      }
    });
  }
});