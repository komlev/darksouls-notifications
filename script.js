const PREFIX = "email-sent-";
const TEXT = "EMAIL SENT";

// playing sound
const playSound = () => {
	try {
		const sound = new Audio(chrome.runtime.getURL("sound.mp3"));
		sound.volume = 0.75;
		sound.play();
	} catch (_err) {}
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
			// 10 secs cooldown - ready to receive next message
		}, 10000);
	}, 5000);
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
	console.log(message.action);
	if (message.action === "emailSent") {
		showText();
	}
});
