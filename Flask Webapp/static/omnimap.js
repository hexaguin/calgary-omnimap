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
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, incidentMarkerOptions).bindPopup('<h2>Traffic Incident</h2>' + feature.properties.incident_info + '<br>' + feature.properties.description);
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
		removeMissing: true,
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
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, cameraMarkerOptions).bindPopup(feature.properties.popup);
		}
	}
).addTo(cameraLayer);

//WALKING
var walkingLayer = L.featureGroup(); // Master layer for walking features

function hashCode(s) { //Hashing function for messily adding an ID to polygons
	for(var i = 0, h = 0; i < s.length; i++)
		h = Math.imul(31, h) + s.charCodeAt(i) | 0;
	return h;
}

//Plus 15 polygons
var plus15Layer = L.featureGroup.subGroup(walkingLayer);
var plus15StyleUnknown = {
	color: '#222222',
	weight: 1
};
var plus15StyleExposed = {
	color: '#003865',
	weight: 2
};
var plus15StyleEnclosed = {
	color: '#0085AD',
	weight: 2
};
plus15 = L.realtime({ // Doesn't really need to be realtime right now, but it streamlines development, and makes things easier if I want to color code closed sections later
		url: 'https://data.calgary.ca/resource/3u3x-hrc7.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
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


var offLeashStyle = {
	color: '#4C8C2B',
	weight: 2
}
var offLeashLayer = L.featureGroup.subGroup(walkingLayer);
offLeash = L.realtime({
		url: 'https://data.calgary.ca/resource/enr4-crti.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
		getFeatureId: function(featureData){
			return featureData.properties.off_leash_area_id
		},
		style: function(featureData){
			return offLeashStyle;
		},
		onEachFeature: function(feature, layer){
			var popupString = '<h2 class=\"titlecase\">Off-Leash Area</h2><h3 class=\"titlecase\">' + feature.properties.description.toLowerCase() + '</h3>';
			if (feature.properties.fencing_info != null){
				popupString += '<br>Fencing: ' + feature.properties.fencing_info.toLowerCase();
			}
			layer.bindPopup(popupString);
		},
		filter: function(feature){
			return feature.properties.status === 'OPEN';
		}
	}
).addTo(offLeashLayer);

//BIKE
var bikeLayer = L.featureGroup();

//Park and Bike
var parkAndBikeMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'bicycle', markerColor: 'blue', iconColor: 'white'})
};
var parkAndBikeLayer = L.featureGroup.subGroup(bikeLayer);
parkAndBike = L.realtime({
		url: 'https://data.calgary.ca/resource/nc6z-cxzf.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, parkAndBikeMarkerOptions).bindPopup('<h2>Park and Bike</h2><h3>' + feature.properties.name + '</h3>' + feature.properties.general_info);
		},
		getFeatureId: function(featureData){
			return featureData.properties.name;
		}
	}
).addTo(parkAndBikeLayer);

var cpaBikeMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'bicycle', markerColor: 'darkgreen', iconColor: '#e5b03b'})
}
var cpaBikeLayer = L.featureGroup.subGroup(bikeLayer);
cpaBike = L.realtime({
		url: 'https://data.calgary.ca/resource/afcw-kkyc.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, cpaBikeMarkerOptions).bindPopup('<h2>CPA Bike Parking</h2><h3>' +
			                                                        feature.properties.name + '</h3>' + 
			                                                        'Indoor stalls: ' + feature.properties.indoor_stalls +
			                                                        '<br>Outdoor stalls: '+ feature.properties.outdoor_stalls);
		},
		getFeatureId: function(featureData){
			return featureData.properties.name;
		}
	}
).addTo(cpaBikeLayer);

var limeBikeMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'bicycle', markerColor: 'green', iconColor: 'white'})
}
var limeBikeLayer = L.featureGroup.subGroup(bikeLayer);
limeBike = L.realtime({
		url: '/omnimap/api/lime',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 10 * 1000, //10 seconds
		removeMissing: true,
		start: false, //Don't automatically start loading geojson
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, limeBikeMarkerOptions).bindPopup('<h2>Lime Bike</h2><h3>' + feature.properties.plate_number + '</h3>');
		},
		getFeatureId: function(featureData){
			return featureData.properties.BICYCLE_ID;
		}
	}
).addTo(limeBikeLayer);


// Map setup
// Enable default layers
drivingLayer.addTo(omnimap);
incidentLayer.addTo(omnimap);
detourLayer.addTo(omnimap);

walkingLayer.addTo(omnimap);
plus15Layer.addTo(omnimap);

//bikeLayer.addTo(omnimap);
parkAndBikeLayer.addTo(omnimap);
cpaBikeLayer.addTo(omnimap);

//Add basemaps to control
var baseMaps = {
	"Street Map": OpenStreetMap_Mapnik,
	"Bike Map": Thunderforest_OpenCycleMap,
	"Satellite": Esri_WorldImagery,
	"Dark": CartoDB_DarkMatter
};

//Add all controlable layers to layer control
var overlayMaps = {
	'<b>Driving</b>': drivingLayer,
	'Traffic Incidents': incidentLayer,
	'Construction Detours': detourLayer,
	'Traffic Cameras': cameraLayer,
	'<b>Walking</b>': walkingLayer,
	'Plus 15': plus15Layer,
	'Off Leash Areas': offLeashLayer,
	'<b>Cycling</b>': bikeLayer,
	'Park and Bike': parkAndBikeLayer,
	'CPA Bike Parking': cpaBikeLayer,
	'Lime Rental Bikes': limeBikeLayer
};

L.control.layers(baseMaps, overlayMaps).addTo(omnimap);

// Logic to only poll Lime when visible
omnimap.on('overlayadd', function(layer) {
	if (layer.name == "Lime Rental Bikes"){ //TODO find a better way to identify the layer
		limeBike.start();
	}
});
omnimap.on('overlayremove', function(layer) {
	if (layer.name == "Lime Rental Bikes"){
		limeBike.stop();
	}
});

//User GPS
var userMarker;
var userCircle;

function onLocationFound(e) {
	var radius = e.accuracy / 2;
	if (!userMarker) {
		userMarker = L.circleMarker(e.latlng, {color: 'white', fillColor: '#006298', fillOpacity: 1, radius: 8, weight: 2}).addTo(omnimap).bindPopup("You are within " + radius + " meters of this point");
	} else {
		userMarker.setLatLng(e.latlng);
	}
	if (!userCircle) {
		userCircle = L.circle(e.latlng, {color: '#0085AD', weight: 0, radius: radius}).addTo(omnimap);
	} else {
		userCircle.setLatLng(e.latlng);
	}
}

omnimap.on('locationfound', onLocationFound);
omnimap.locate({setView: false, watch: true, maxZoom: 16, enableHighAccuracy: true});
