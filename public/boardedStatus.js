// Error margin of GPS (in meters)
const GPS_ERROR_MARGIN = 15

let boardScore = 0
let boardStatus = "offboard"

function updateBoardScore(distance) {
	if (distance < GPS_ERROR_MARGIN) {
		boardScore += 1;
		boardStatus = "tracking";
	}
	else if (boardScore > 0) boardScore -= 2
}