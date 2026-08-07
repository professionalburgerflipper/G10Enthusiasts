// Global tracker to keep track of when the distance counter was last updated. 
let lastUpdatedTime = 0;

document.addEventListener('DOMContentLoaded',
	(event) => {
		// Incrementing the last updated time every second and updating the text content of the last updated element
		const lastUpdatedElement = document.querySelector("#distance-counter-last-updated-time");
		setInterval(() => {
			lastUpdatedTime += 1;
			lastUpdatedElement.innerHTML = `Closest G10 Bus - Updated ${lastUpdatedTime} seconds ago...`;
		}, 1000);
	}
);


// Distance >= 0 when valid
// Distance = -1 when no vehicles are operational or geolocation failed
// Distance < -1 when things go bad because that should never happen
function updateDistanceCounter(distance, fleetNumber) {
	if (distance < -1) return;		// Return when very bad
	const isValid = distance != -1; // Used in checks to determine color and text

	// Transition loading throbber out when ready
	const throbber = document.querySelector("#throbber");
	throbber.style.opacity = 0;

	// Determine accurate distance
	distance = Math.round(distance);
	const counter = document.querySelector("#distance-counter");
	counter.style.setProperty('--distance', `${distance}`);
	// Remove counter when error handling / no vehicles operational 
	counter.style.setProperty('--after', isValid ? 'block' : 'none');


	// Update fleet number counter
	const fleetNumCounter = document.querySelector("#closest-fleet-number");
	fleetNumCounter.style.setProperty('--fleet', fleetNumber);
	// Remove fleet number counter when error handling / no vehicles operational
	fleetNumCounter.style.setProperty('--after', isValid ? 'block' : 'none');
	// Replace counter with text when error handling / no vehicles operational
	fleetNumCounter.textContent = isValid ? '' : fleetNumber;

	// Update color of distance counter and fleet number counter based on validity
	counter.parentNode.style.setProperty('--Color', isValid ? 'var(--BusOrange)' : 'var(--ErrorRed)');

	// Reset last updated time (to -1 since incrementation occurs before first update)
	lastUpdatedTime = -1;
}