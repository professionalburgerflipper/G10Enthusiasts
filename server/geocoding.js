const NG = require('node-geocoder');
const geocoder = NG({ provider: 'openstreetmap' });

module.exports = {
	getAddressFromCoords
};

async function getAddressFromCoords(lat, lon) {
	try {
		const CompLocation = await geocoder.reverse(
			{ lat: lat, lon: lon }
		);

		let addr = CompLocation.split(', ');
		let addrline = addr[0];
		let suburb = addr[1];
		console.log(addrline, suburb); 

		return await CompLocation;
	} 
	catch(err) {
		console.error(err);
	}
	} 