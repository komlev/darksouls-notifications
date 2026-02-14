// Popup script for quick volume control

const volumeSlider = document.getElementById("volume");
const volumeValue = document.getElementById("volumeValue");
const testButton = document.getElementById("testSound");
const status = document.getElementById("status");

// Load saved volume setting
chrome.storage.sync.get(["volume"], (result) => {
  const volume = result.volume !== undefined ? result.volume : 75;
  volumeSlider.value = volume;
  volumeValue.textContent = `${volume}%`;
});

// Update volume value display when slider moves (but don't save yet)
volumeSlider.addEventListener("input", () => {
  const volume = volumeSlider.value;
  volumeValue.textContent = `${volume}%`;
});

// Save to storage only when user finishes adjusting (releases slider)
volumeSlider.addEventListener("change", () => {
  const volume = Number.parseInt(volumeSlider.value);
  chrome.storage.sync.set({ volume }, () => {
    status.textContent = "Saved!";
    status.classList.add("success");
    setTimeout(() => {
      status.textContent = "Auto-saved";
      status.classList.remove("success");
    }, 1500);
  });
});

// Test sound button
testButton.addEventListener("click", () => {
  try {
    const volume = Number.parseInt(volumeSlider.value) / 100;
    const sound = new Audio(chrome.runtime.getURL("sound.mp3"));
    sound.volume = volume;
    sound.play();

    status.textContent = "Playing...";
    status.classList.add("success");

    sound.addEventListener("ended", () => {
      status.textContent = "Auto-saved";
      status.classList.remove("success");
    });
  } catch (err) {
    status.textContent = "Error playing sound";
    status.classList.remove("success");
    console.error("Error playing test sound:", err);
  }
});
