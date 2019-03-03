var omnimap = L.map('map-container', {
	zoomSnap: 0.25
}).setView([51.0486, -114.0708], 11);

// Basemaps

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	name: 'Street Map',
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var Thunderforest_OpenCycleMap = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=b49f917275a84bef912e3c72bc4612ef', {
	attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	maxZoom: 22
});

var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
});

OpenStreetMap_Mapnik.addTo(omnimap); // Set OSM as the default basemap

// LAYERS

// DRIVING

var drivingLayer = L.featureGroup(); // Master layer for road features

var incidentMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'car-crash', markerColor: 'red', iconColor: 'white'})
};
var incidentLayer = L.featureGroup.subGroup(drivingLayer);
trafficIncidents = L.realtime({
		url: 'https://data.calgary.ca/resource/y5vq-u678.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 60 * 1000,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, incidentMarkerOptions).bindPopup(feature.properties.incident_info + '<br>' + feature.properties.description);
		},
		getFeatureId: function(featureData){
			return featureData.properties.latitude + featureData.properties.longitude;
		}
	}
).addTo(incidentLayer);


var detourMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'car', markerColor: 'orange', iconColor: 'white'})
};
var detourLayer = L.featureGroup.subGroup(drivingLayer);
trafficDetours = L.realtime({
		url: 'https://data.calgary.ca/resource/q5fe-imxj.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 60 * 60 * 1000, //1 hour
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, detourMarkerOptions).bindPopup('<h2>Traffic Detour</h2>' + feature.properties.description);
		},
		getFeatureId: function(featureData){
			return featureData.properties.latitude + featureData.properties.longitude;
		}
	}
).addTo(detourLayer);


//Traffic monitoring cameras. Uses a flask-based API for reading AB camera listing as GeoJSON.
var cameraMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'camera', markerColor: 'gray', iconColor: 'white'})
};
var cameraLayer = L.featureGroup.subGroup(drivingLayer);
cameras = L.realtime({
		url: '/omnimap/api/cameras',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, cameraMarkerOptions).bindPopup(feature.properties.popup);
		}
	}
).addTo(cameraLayer);

//WALKING
var walkingLayer = L.featureGroup(); // Master layer for walking features

//Plus 15 polygons
function hashCode(s) { //Hashing function for an upcoming messy hack
	for(var i = 0, h = 0; i < s.length; i++)
		h = Math.imul(31, h) + s.charCodeAt(i) | 0;
	return h;
}
var plus15Layer = L.featureGroup.subGroup(walkingLayer);
var plus15StyleUnknown = {
	color: '#222222',
	weight: 1
};
var plus15StyleExposed = {
	color: '#2222FE',
	weight: 2
};
var plus15StyleEnclosed = {
	color: '#FE2222',
	weight: 2
};
plus15 = L.realtime({ // Doesn't really need to be realtime right now, but it streamlines development, and makes things easier if I want to color code closed sections later
		url: 'https://data.calgary.ca/resource/3u3x-hrc7.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		getFeatureId: function(featureData){ //DIRTY HACK, NEED A BETTER WAY TO MAKE IDs THAN HASHES OF OBJECTS
			return hashCode(JSON.stringify(featureData));
		},
		style: function(featureData) {
			if (typeof featureData.properties.type === 'undefined'){ //No labelled type of structure
				return plus15StyleUnknown;
			} else if (featureData.properties.type == 'Open to Sky') {
				return plus15StyleExposed;
			} else {
				return plus15StyleEnclosed;
			}
		},
		onEachFeature: function(feature, layer){
			layer.bindPopup('<h2>Plus 15</h2>Hours: ' + feature.properties.access_hours + '<br>Type: ' + feature.properties.type);
		}
	}
).addTo(plus15Layer);


// Map setup
// Enable default layers
drivingLayer.addTo(omnimap);
incidentLayer.addTo(omnimap);
detourLayer.addTo(omnimap);

walkingLayer.addTo(omnimap);
plus15Layer.addTo(omnimap);

//Add basemaps to control
var baseMaps = {
	"Street Map": OpenStreetMap_Mapnik,
	"Bike Map": Thunderforest_OpenCycleMap,
	"Satellite": Esri_WorldImagery,
	"Dark": CartoDB_DarkMatter
};

//Add all controlable layers to control
var overlayMaps = {
	'<b>Driving</b>': drivingLayer,
	'Traffic Incidents': incidentLayer,
	'Construction Detours': detourLayer,
	'Traffic Cameras': cameraLayer,
	'<b>Walking</b>': walkingLayer,
	'Plus 15': plus15Layer,
};

L.control.layers(baseMaps, overlayMaps).addTo(omnimap);