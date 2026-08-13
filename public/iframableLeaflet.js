// added leaflet
import L from leaflet; 

// defining a default view in case location throws an error
const map = L.map('map').setView([0, 0], 2)

// got this from google, uses a public streetmap tiler
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

