let lastUpdatedTime = 0;

document.addEventListener('DOMContentLoaded',
	(event) => {
		const lastUpdatedElement = document.querySelector("#distance-counter-last-updated-time");
		setInterval(() => {
			lastUpdatedTime += 1;
			lastUpdatedElement.innerHTML = `Closest G10 Bus - Updated ${lastUpdatedTime} seconds ago...`;
		}, 1000);
	}
);


function updateDistanceCounter(distance, fleetNumber) {
	if (distance >= 0) {
		distance = Math.round(distance);
		const counter = document.querySelector("#distance-counter");
		counter.style.setProperty('--distance', `${distance}`);

		const fleetNumCounter = document.querySelector("#closest-fleet-number");

		fleetNumCounter.style.setProperty('--fleet', fleetNumber);

		lastUpdatedTime = -1;
	}
}