// Global tracker to keep track of when the distance counter was last updated. 
let lastUpdatedTime = 0;

document.addEventListener('DOMContentLoaded',
	(event) => {
		// Incrementing the last updated time every second and updating the text content of the last updated element
		const lastUpdatedElement = document.querySelector("#distance-counter-last-updated-time");
		setInterval(() => {
			lastUpdatedTime += 1;
			lastUpdatedElement.innerHTML = `Closest ${cache.mainRoute} Bus - Updated ${lastUpdatedTime} seconds ago...`;
		}, 1000);
	}
);


// Distance >= 0 when valid
// Distance = -1 when no vehicles are operational or geolocation failed
// Distance < -1 when things go bad because that should never happen
function updateDistanceCounter(route, distance, fleetNumber) {
	if (distance < -1) return;		// Return when very very bad
	const isValid = distance != -1; // Used in checks to determine color and text

	// Transition loading throbber out when ready
	const throbber = document.querySelector("#throbber");
	throbber.style.opacity = 0;

	// Characters to use for animation
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let iterations = 0;

	// Route counter element
	const routeCounter = document.querySelector("#route");

	// Route count animation.
	if (routeCounter.innerText != route && route !== null) const interval = setInterval(() => {
		// Iterate through each character and replace with random letter
		routeCounter.innerText = route.split("").map((letter, index) => {
			// If we have reached the end of the route, stop
			if (index < iterations) return route[index];
			return letters[Math.floor(Math.random() * 26)];
		}).join("");
		
		// Stop when we have iterated through the entire route
		if (iterations >= route.length) clearInterval(interval);
		// Else, increment the iteration counter
		iterations += 1 / 3; 
	}, 100);

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

	// Update container
	const container = document.querySelector("#distance-container");

	// Update colour of everything based on
	// 1. Validity
	// 2. Distance
	// 3. Route
	if (!isValid) container.style.setProperty('--Color', 'var(--ErrorRed)');
	else if (boardStatus == 'onboard') container.style.setProperty('--Color', 'var(--ValidatedGreen)');
	else if (route == 'N10') container.style.setProperty('--Color', 'var(--NightBlue)');
	else container.style.setProperty('--Color', 'var(--BusOrange)');

	// Reset last updated time (to -1 since incrementation occurs before first update)
	lastUpdatedTime = -1;
}