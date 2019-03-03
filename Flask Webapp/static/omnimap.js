var omnimap = L.map('map-container').setView([51.0486, -114.0708], 11);

// Basemaps

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	name: 'Street Map',
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

OpenStreetMap_Mapnik.addTo(omnimap); // Set OSM as the default basemap

// layers

var incidentMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'car-crash', markerColor: 'red', iconColor: 'white'})
};

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
).addTo(omnimap);

var detourMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'car', markerColor: 'orange', iconColor: 'white'})
};

trafficDetours = L.realtime({
		url: 'https://data.calgary.ca/resource/q5fe-imxj.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 60 * 60 * 1000,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, detourMarkerOptions).bindPopup('<h2>Traffic Detour</h2>' + feature.properties.description);
		},
		getFeatureId: function(featureData){
			return featureData.properties.latitude + featureData.properties.longitude;
		}
	}
).addTo(omnimap);

var baseMaps = {
	"Street Map": OpenStreetMap_Mapnik,
	"Satellite": Esri_WorldImagery
};

var overlayMaps = {
	'Traffic Incidents': trafficIncidents,
	'Construction Detours': trafficDetours
};

L.control.layers(baseMaps, overlayMaps).addTo(omnimap);
