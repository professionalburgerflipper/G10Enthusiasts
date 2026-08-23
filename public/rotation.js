/**
 * I can't add any documentation to this it's too good as is
 */

document.addEventListener("DOMContentLoaded", () => {
	const spinnyBoy = document.querySelector("#rotation");
	const honk = new Audio("/audio/honk.mp3");
	honk.volume = 0.5;
	spinnyBoy.addEventListener(
		'click', () => {
			honk.play();
		}
	);
});