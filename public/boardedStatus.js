// -- BOARDING SYS. --

// The boarding system works with points,
// each function call where the user is deemed within the maximum radius adds a point to the 'board score',
// likewise, if the user is not within the maximum radius, points are taken away.
// if the user's 'board score' is above a threshold, the user can safely be considered on the bus.

// This system also dynamically updates the maximum range to be 'boarded' using the 95% confidence interval
// of the geoloc, and the speed of the bus.

// --

// Error margin of GPS (in meters).
const GPS_ERROR_MARGIN = 15;
// Max radius the dynamic radius can have (in meters).
const MAX_RAD = 115;

// How many successful updates until considered on board.
const BOARDED_THRESHOLD = 4;
// Maximum amount boardScore can have.
const BOARDED_MAX = 10;

// Colours for each stage of boarding.
let offboardCol = '#f22929';
let trackingCol = '#F2AF29';
let onboardCol = '#3dcb1d';

// Score and status.
let boardScore = 0;
let boardStatus = "offboard";

let distanceStrikes = 0;

/**
 * Calculates and updates board status of the user.
 * @param {*} distance Distance from the bus and user. *(Estimated distance recommended)*.
 * @param {*} busSpeed Speed of the closest bus to calculate dynamic radius. *(Use cache.closestVehicle.speed.at(-1))*.
 * @param {*} acc 95% Confidence interval of the gps used to calculate dynamic radius *(Use cache.geoloc.accuracy.at(-1))*.
 */
function updateBoardStatus(distance, busSpeed, acc) {

	const latencyBuffer = 2.5; // Buffer time (in sec).
	// Dynamic radius threshold that the user has to be within to be considered boarded.
	// r = (Geoloc95%CI / 2) + (BusSpeedMPS * latencyBufferConstant)
	let radius = (acc / 2) + ((busSpeed * 3.6) * latencyBuffer);
	// Max out radius to avoid too high of a radius.
	if (radius > MAX_RAD) radius = MAX_RAD;

	// Figure out which function to handle board score depending on status
	if (boardStatus == `ON THE ${cache.mainRoute}!`) __onboardHandling(distance, radius); 
	else __offboardHandling(distance, radius);

	// HTML updates.
	const display = document.querySelector('#boarded-status');
	const prism = document.querySelector("#prism");

	let currentCol = offboardCol; 
	if (boardStatus == "tracking") currentCol = trackingCol;
	else if (boardStatus == "onboard") currentCol = onboardCol;

	let boardMsg = boardStatus
	if (boardStatus == "offboard") boardMsg = `Not on the ${cache.mainRoute}.`
	else if (boardStatus == "tracking") boardMsg = `Maybe on the ${cache.mainRoute}?`
	else boardMsg = `ON THE ${cache.mainRoute}!`

    display.style.setProperty('--boarded-status', `"${boardMsg}"`);
	display.style.setProperty('--boarded-col', currentCol);
	prism.style.setProperty('--rtX', boardStatus == "onboard" ? "90deg" : "0deg");
}

// Handle board score when not on the bus, or being tracked.
function __offboardHandling(distance, radius) {
	// If user is within threshold, add to score and transition to tracking phase.
	if (distance < radius + GPS_ERROR_MARGIN) {
		boardScore += 1;
		boardStatus = "tracking";
	}
	// Else, remove score if above 0.
	else if (boardScore > 0) boardScore -= 2;
	// If the board score is 0, then return to offboard phase.
	else boardStatus = "offboard";

	if (boardScore >= BOARDED_THRESHOLD) boardStatus = "onboard";
}

function __onboardHandling(distance, radius) {
	if (distance < radius + GPS_ERROR_MARGIN && boardScore < BOARDED_MAX) {
		boardScore += 1;
	} else boardScore -= 2;

	if (boardScore < BOARDED_THRESHOLD) boardStatus = "tracking";

	if (distance >= radius + DISTANCE_STRIKE_THRESHOLD) {
		boardStatus = "offboard";
		boardScore = 0;
	}
}
