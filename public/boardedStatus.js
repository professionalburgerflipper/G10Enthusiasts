// Error margin of GPS (in meters)
const GPS_ERROR_MARGIN = 15;
// How many successful updates until considered on board.
const BOARDED_THRESHOLD = 4;
// Maximum amount boardScore can have.
const BOARDED_MAX = 10;
// Threshold distance spike to give a strike.
const DISTANCE_STRIKE_THRESHOLD = 100;
// Allowed strikes user can have before considered offboard.
const ALLOWED_DISTANCE_STRIKES = 1;

let offboardCol = '#f22929';
let trackingCol = '#F2AF29';
let onboardCol = '#3dcb1d';


let boardScore = 0;
let boardStatus = "offboard";

let distanceStrikes = 0;

function updateBoardStatus(distance) {
	if (boardStatus == "onboard") __onboardHandling(distance);
	else __offboardHandling(distance);

	const display = document.querySelector('#boarded-status')

	let currentCol = offboardCol;
	if (boardStatus == `Maybe on the ${cache.mainRoute}?`) currentCol = trackingCol;
	else if (boardStatus == `ON THE ${cache.mainRoute}!`) currentCol = onboardCol;

    display.style.setProperty('--boarded-status', `"${boardStatus}"`);
	display.style.setProperty('--boarded-col', currentCol);
}

function __offboardHandling(distance) {
	if (distance < GPS_ERROR_MARGIN) {
		boardScore += 1;
		boardStatus = `Maybe on the ${cache.mainRoute}?`;
	}
	else if (boardScore > 0) boardScore -= 2;
	else boardStatus = `Not on the ${cache.mainRoute} >:(`;

	if (boardScore >= BOARDED_THRESHOLD) boardStatus = `ON THE ${cache.mainRoute}!`;
}

function __onboardHandling(distance) {
	if (distance < GPS_ERROR_MARGIN && boardScore < BOARDED_MAX) {
		boardScore += 1;
	} else boardScore -= 2;

	if (boardScore < BOARDED_THRESHOLD) boardStatus = `Maybe on the ${cache.mainRoute}?`;

	if (distance >= DISTANCE_STRIKE_THRESHOLD) distanceStrikes += 1;
	else if (distanceStrikes > 0) distanceStrikes -= 1;
	if (distanceStrikes > ALLOWED_DISTANCE_STRIKES) {
		boardStatus = `Not on the ${cache.mainRoute} >:(`;
		boardScore = 0;
	}
}
