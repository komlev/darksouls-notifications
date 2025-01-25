const PREFIX = "email-sent-";
const TEXT = "EMAIL SENT";

// playing sound
const playSound = () => {
  try {
    var sound = new Audio(chrome.runtime.getURL("sound.mp3"));
    sound.play();
  } catch (err) {}
};

// show email sent text
const showText = () => {
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
        <span class="${PREFIX}title">${TEXT}</span>
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
      startPolling();
      // 20 secs cooldown
    }, 20000);
  }, 5000);
};

let pollId;
// looking for indication that email is sent
const startPolling = () => {
  clearInterval(pollId);
  pollId = setInterval(() => {
    const link = document.getElementById("link_vsm");
    if (link) {
      showText();
      clearInterval(pollId);
    }
  }, 1000);
};

startPolling();
