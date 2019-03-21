var mapboxToken = "sk.eyJ1IjoiaGV4YWd1aW4iLCJhIjoiY2p0YWhoOTliMGIxdTQzc3pzZnJjMnZ3dCJ9.Dp8AM1s5MunEf1f7nn9yEQ"

var omnimap = L.map('map-container', {
	zoomSnap: 0.25,
	maxBounds: [[50.4645218901, -114.9776127585],
	           [51.5463584332, -113.1511357077]],
	minZoom: 10
}).setView([51.0486, -114.0708], 11);

// Basemaps

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	name: 'Street Map',
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var Mapbox_Streets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token={token}', {
	name: 'Street Map (Modern)',
	maxZoom: 20,
	token: mapboxToken,
	tileSize: 512, // Mapbox uses 512px tiles instead of 256px to save on API calls
	zoomOffset: -1,
	attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

Mapbox_Streets.addTo(omnimap); // Set mapbox as the default basemap

/*
██       █████  ██    ██ ███████ ██████  ███████
██      ██   ██  ██  ██  ██      ██   ██ ██
██      ███████   ████   █████   ██████  ███████
██      ██   ██    ██    ██      ██   ██      ██
███████ ██   ██    ██    ███████ ██   ██ ███████
*/

/*
██████  ██████  ██ ██    ██ ██ ███    ██  ██████
██   ██ ██   ██ ██ ██    ██ ██ ████   ██ ██
██   ██ ██████  ██ ██    ██ ██ ██ ██  ██ ██   ███
██   ██ ██   ██ ██  ██  ██  ██ ██  ██ ██ ██    ██
██████  ██   ██ ██   ████   ██ ██   ████  ██████
*/



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
		interval: 60 * 1000, // 1 minute
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, incidentMarkerOptions).bindPopup('<h2>Traffic Incident</h2>' + feature.properties.incident_info + '<br>' + feature.properties.description);
		},
		getFeatureId: function(featureData){
			return featureData.properties.latitude + featureData.properties.longitude;
		}
	}
).addTo(incidentLayer);
abIncidents = L.realtime({ //TODO prevent redundant call to API?
		url: '/omnimap/api/abevents'
	}, {
		interval: 15 * 60 * 1000, //15 minutes
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, incidentMarkerOptions).bindPopup(feature.properties.popup);
		},
		filter: function(feature) {
			return feature.properties.eventtype === 'accidentsAndIncidents'; // Incidents only
		}
	}
).addTo(incidentLayer);


var detourMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'car', markerColor: 'orange', iconColor: 'white'})
};
var roadworkMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'hard-hat', markerColor: 'orange', iconColor: 'white'})
};
var closureMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'times-circle', markerColor: 'orange', iconColor: 'white'})
};
var detourLayer = L.featureGroup.subGroup(drivingLayer);
trafficDetours = L.realtime({
		url: 'https://data.calgary.ca/resource/q5fe-imxj.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 15 * 60 * 1000, //15 minutes
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			if ( feature.properties.description.includes('The road is closed')) {
				return L.marker(latlng, closureMarkerOptions).bindPopup('<h2>Traffic Detour</h2>' + feature.properties.description);
			} else {
				return L.marker(latlng, detourMarkerOptions).bindPopup('<h2>Traffic Detour</h2>' + feature.properties.description);
			}
		},
		getFeatureId: function(featureData){
			return featureData.properties.latitude + featureData.properties.longitude;
		}
	}
).addTo(detourLayer);
abDetours = L.realtime({ //TODO: New layer for closures
		url: '/omnimap/api/abevents'
	}, {
		interval: 15 * 60 * 1000, //15 minutes
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			if (feature.properties.eventtype === 'closure'){
				return L.marker(latlng, closureMarkerOptions).bindPopup(feature.properties.popup);
			} else {
				return L.marker(latlng, roadworkMarkerOptions).bindPopup(feature.properties.popup);
			}
		},
		filter: function(feature) {
			return feature.properties.eventtype !== 'accidentsAndIncidents'; // Roadwork and closures only
		}
	}
).addTo(detourLayer);


//Traffic monitoring cameras. Uses a flask-based API for reading AB camera listing as GeoJSON.
var cameraMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'camera', markerColor: 'gray', iconColor: 'white'})
};
var cameraLayer = L.featureGroup.subGroup(drivingLayer);
cameras = L.realtime({
		url: '/omnimap/api/cameras'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, cameraMarkerOptions).bindPopup(feature.properties.popup).on('popupopen', function(e){
				$('.cam-slideshow').not('.slick-initialized').slick({ //Exclude existing slideshows from old popups so we don't scare slick.
					dots: true,
					speed: 100
				}); 
				$('.cam-hidden').removeClass('cam-hidden'); //Slideshows start hidden so the stack of img tags don't scroll the page up. Now that we have initialized it, we can display the slideshow.
			});
		}
	}
).addTo(cameraLayer);

setInterval(function(){
		$(".cam-img img").each(function(index){
		$(this).attr("src", $(this).attr("src").split("?")[0] + '?' + new Date().getTime());
})},15000); //Refreshes any visible cameras every 15 seconds

var highwayGoodStyle = {
	color: '#4C8C2B',
	weight: 8,
	opacity: 0.8
}
var highwayWetStyle = {
	color: '#0085AD',
	weight: 8,
	opacity: 0.8
}
var highwayMediumStyle = {
	color: '#FFC600',
	weight: 8,
	opacity: 0.8
}
var highwayBadStyle = {
	color: '#c8102e',
	weight: 8,
	opacity: 0.8
}
var highwayClosedStyle = {
	color: '#222222',
	weight: 8,
	opacity: 0.8
}
var highwayNullStyle = {
	color: '#888888',
	weight: 8,
	opacity: 0.8
}
var roadConditionLayer = L.featureGroup.subGroup(drivingLayer);
abRoadConditions = L.realtime({
		url:'/omnimap/api/abwinterroads'
	}, {
		interval: 15 * 60 * 1000, //15 minutes, matches server cache.
		removeMissing: true,
		start: false,
		getFeatureId: function(featureData){
			return featureData.properties.EncodedPolyline; //I think this is the best I can do for IDs for now
		},
		style: function(featureData){
			condition = featureData.properties['Primary Condition'];
			if (condition == 'Closed'){
				return highwayClosedStyle;
			} else if (condition.includes('Ptly Cvd')) {
				return highwayMediumStyle;
			} else if (condition.includes('Cvd')) {
				return highwayBadStyle;
			} else if (condition.includes('Wet')) {
				return highwayWetStyle;
			} else if (condition.includes('Bare')) {
				return highwayGoodStyle;
			} else {
				return highwayNullStyle;
			}
		},
		onEachFeature: function(feature, layer){
			layer.bindPopup('<h2 class=\"titlecase\">'+feature.properties.AreaName.toLowerCase() +
			                '</h2><h3>' + feature.properties.LocationDescription +
			                '</h3>Visibility: ' + feature.properties.Visibility + '<br>' +
			                feature.properties['Primary Condition'] + '<br>' + feature.properties['Secondary Conditions']);
		}
	}
).addTo(roadConditionLayer);

var parkingMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'parking', markerColor: 'blue', iconColor: 'white'})
};

var parkingLayer = L.featureGroup.subGroup(drivingLayer);
parking = L.realtime({
		url:'/omnimap/api/parking'
	}, {
		interval: 60 * 60 * 1000, //hourly
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, parkingMarkerOptions).bindPopup(feature.properties.popup);
		},
	}
).addTo(parkingLayer);

/*
██     ██  █████  ██      ██   ██ ██ ███    ██  ██████
██     ██ ██   ██ ██      ██  ██  ██ ████   ██ ██
██  █  ██ ███████ ██      █████   ██ ██ ██  ██ ██   ███
██ ███ ██ ██   ██ ██      ██  ██  ██ ██  ██ ██ ██    ██
 ███ ███  ██   ██ ███████ ██   ██ ██ ██   ████  ██████
*/


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

/*
██████  ██ ██   ██ ███████
██   ██ ██ ██  ██  ██
██████  ██ █████   █████
██   ██ ██ ██  ██  ██
██████  ██ ██   ██ ███████
*/


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
var limeBikeClusters = L.markerClusterGroup({
	iconCreateFunction: function(cluster) {
		var count = cluster.getChildCount();
		if (count > 50) { // Large
			return L.divIcon({ html: '<div><i class="fas fa-bicycle"></i><br><span>' + cluster.getChildCount() + '</span></div>', className: 'marker-cluster lime-cluster-large', iconSize: new L.Point(40, 40) });
		} else if (count > 10) { // Medium
			return L.divIcon({ html: '<div><i class="fas fa-bicycle"></i><br><span>' + cluster.getChildCount() + '</span></div>', className: 'marker-cluster lime-cluster-med', iconSize: new L.Point(40, 40) });
		} else { // Small
			return L.divIcon({ html: '<div><i class="fas fa-bicycle"></i><br><span>' + cluster.getChildCount() + '</span></div>', className: 'marker-cluster lime-cluster-small', iconSize: new L.Point(40, 40) });
		}
	},
	maxClusterRadius: 50
});
limeBikeClusters.addTo(limeBikeLayer);
limeBike = L.realtime({
		url: '/omnimap/api/lime',
	}, {
		interval: 10 * 1000, //10 seconds
		removeMissing: true,
		start: false, //Don't automatically start loading geojson
		container: limeBikeClusters, //Wrap in cluster group
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, limeBikeMarkerOptions).bindPopup('<h2>Lime Bike</h2><h3>' + feature.properties.plate_number + '</h3>');
		},
		getFeatureId: function(featureData){
			return featureData.properties.BICYCLE_ID;
		}
	}
).addTo(limeBikeLayer);

/*
███    ███  █████  ██████      ███████ ███████ ████████ ██    ██ ██████
████  ████ ██   ██ ██   ██     ██      ██         ██    ██    ██ ██   ██
██ ████ ██ ███████ ██████      ███████ █████      ██    ██    ██ ██████
██  ██  ██ ██   ██ ██               ██ ██         ██    ██    ██ ██
██      ██ ██   ██ ██          ███████ ███████    ██     ██████  ██
*/

// Routing

routingControl = L.Routing.control({
	router: L.Routing.mapbox(mapboxToken, {
		profile: 'mapbox/driving-traffic'
	}),
	geocoder: L.Control.Geocoder.mapbox(mapboxToken, {
		autocomplete: true,
		geocodingQueryParams: {bbox: '-114.45260148479741,50.66596875349393,-113.6475824946525,51.317842186832365'}
	}),
	collapsible: true,
}).addTo(omnimap);
routingControl.hide();
$('leaflet-routing-container').attr('title','Navigation'); // Add title text to the button

// Inject controls for switching profiles. TODO try getting Bootstrap buttons (or button tags in general) to play nicely with leaflet?
$('.leaflet-routing-geocoders').append(`
	<div id="routing-modes">
		<span id="routing-driving-button" class="routing-mode-button routing-mode-button-selected"><i class="fas fa-car"></i> Drive</span>
		<span id="routing-cycling-button" class="routing-mode-button"><i class="fas fa-bicycle"></i> Bike</span>
		<span id="routing-walking-button" class="routing-mode-button"><i class="fas fa-walking"></i> Walk</span>
	</div>
`); // HTML for mode buttons

// Bind click events to routing mode buttons
$('#routing-driving-button').click(function(){
	$('.routing-mode-button').removeClass('routing-mode-button-selected'); //Strip all buttons of active status
	$(this).addClass('routing-mode-button-selected'); //Give active status to this button 
	routingControl.getRouter().options.profile = "mapbox/driving-traffic"; //Switch profiles
	routingControl.route(); //Update router
});
$('#routing-cycling-button').click(function(){
	$('.routing-mode-button').removeClass('routing-mode-button-selected'); //Strip all buttons of active status
	$(this).addClass('routing-mode-button-selected'); //Give active status to this button 
	routingControl.getRouter().options.profile = "mapbox/cycling"; //Switch profiles
	routingControl.route(); //Update router
});
$('#routing-walking-button').click(function(){
	$('.routing-mode-button').removeClass('routing-mode-button-selected'); //Strip all buttons of active status
	$(this).addClass('routing-mode-button-selected'); //Give active status to this button 
	routingControl.getRouter().options.profile = "mapbox/walking"; //Switch profiles
	routingControl.route(); //Update router
});

// "Jump to GPS" button HACK using CSS psudoelements and pixel counting. 
$('.leaflet-routing-container').on('click', '.leaflet-routing-geocoder:first-child', function(e){ //Bind to the entire container so that when the DOM shifts around inside the container we don't lose the binding
	if (userMarker && e.pageX-$(this).offset().left < 24 && e.pageY-$(this).offset().top < 24) { //Only activate if the click is on the first 24x24 pixels (where our :before is)
		var waypoints = routingControl.getWaypoints();
		waypoints[0] = userMarker._latlng;
		routingControl.setWaypoints(waypoints);
	}
});

// Layer control

// Enable default layers
drivingLayer.addTo(omnimap);
incidentLayer.addTo(omnimap);
detourLayer.addTo(omnimap);

walkingLayer.addTo(omnimap);
plus15Layer.addTo(omnimap);

parkAndBikeLayer.addTo(omnimap);
cpaBikeLayer.addTo(omnimap);

var baseTree = {
	label: 'Base Maps',
	children: [
		{label: '<b>Street Maps</b>', children: [
			{label: 'Modern', layer: Mapbox_Streets},
			{label: 'Dark', layer: CartoDB_DarkMatter},
			{label: 'Classic', layer: OpenStreetMap_Mapnik},
		]},
		{label: 'Bike Map', layer: Thunderforest_OpenCycleMap},
		{label: 'Satellite', layer: Esri_WorldImagery}
	]
};

var overlayTree = {
	label: 'Overlays',
	children: [
		{
			label: '<b>Driving</b>',
			layer: drivingLayer,
			children: [
				{label: '<i class="fas fa-car-crash p-red"></i> Traffic Incidents', layer: incidentLayer},
				{label: '<i class="fas fa-car p-orange"></i> Closures and Detours', layer: detourLayer},
				{label: '<i class="fas fa-camera"></i> Traffic Cameras', layer: cameraLayer},
				{label: '<i class="fas fa-square c-green"></i> Road Conditions', layer: roadConditionLayer},
				{label: '<i class="fas fa-parking p-blue"></i> Parking', layer: parkingLayer},
			]
		},
		{
			label: '<b>Walking</b>',
			layer: walkingLayer,
			children: [
				{label: '<i class="fas fa-square c-blue"></i> Plus 15', layer: plus15Layer},
				{label: '<i class="fas fa-square c-green"></i> Off Leash Areas', layer: offLeashLayer}
			]
		},
		{
			label: '<b>Cycling</b>',
			layer: bikeLayer,
			children: [
				{label: '<i class="fas fa-bicycle p-blue"></i> Park and Bike', layer: parkAndBikeLayer},
				{label: '<i class="fas fa-bicycle p-darkgreen"></i> CPA Bike Parking', layer: cpaBikeLayer},
				{label: '<i class="fas fa-bicycle p-green"></i> Lime Rental Bikes', layer: limeBikeLayer}
			]
		}
	]
}

controlTree = L.control.layers.tree(baseTree, overlayTree, {
	closedSymbol: '<i class="fas fa-plus-square"></i>',
	openedSymbol: '<i class="fas fa-minus-square"></i>'
}).addTo(omnimap).collapseTree(true).collapseTree(false);

//Switch background color to match basemaps. This makes loading less jarring, and also hides Blink and Webkit's CSS subpixel bug (Leaflet issue 6101)
omnimap.on('baselayerchange', function(layer) { 
	switch (layer.layer) {
		case Mapbox_Streets:
			$('#map-container').css('background-color', '#efe9e1');
			break;
		case OpenStreetMap_Mapnik:
			$('#map-container').css('background-color', '#f2efe9');
			break;
		case CartoDB_DarkMatter:
			$('#map-container').css('background-color', '#090909');
			break;
		case Thunderforest_OpenCycleMap:
			$('#map-container').css('background-color', '#dedecd');
			break;
		case Esri_WorldImagery:
			$('#map-container').css('background-color', '#808080');
			break;
	}
});

$('#map-container').css('background-color', '#efe9e1'); //Mapbox background by default. NOTE must change if default basemap changes.

// Logic to only poll heavy layers when visible
omnimap.on('overlayadd', function(layer) {
	switch (layer.layer) {
		case limeBikeLayer:
			limeBike.start();
			break;
		case roadConditionLayer:
			abRoadConditions.start();
			break;
		default:
			break;
	}
});
omnimap.on('overlayremove', function(layer) {
	switch (layer.layer) {
		case limeBikeLayer:
			limeBike.stop();
			break;
		case roadConditionLayer:
			abRoadConditions.stop();
			break;
		default:
			break;
	}
});

//User GPS
var userMarker;
var userCircle;

var followingGps = false;

function panToUser() {
	if(userMarker && followingGps){
		omnimap.panTo(userMarker._latlng, {duration: 0.2});
	}
}

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
	panToUser();
}

omnimap.on('locationfound', onLocationFound);
omnimap.locate({setView: false, watch: true, enableHighAccuracy: true}); //Start repeat tracking

//GPS Follow Toggle 
var gpsToggle = L.easyButton({
	states: [{
	stateName: 'enable-gps',
	icon: 'fa-crosshairs',
	title: 'Follow GPS',
	onClick: function(control) {
		omnimap.locate({setView: false, watch: true, enableHighAccuracy: true}); //Make sure we're following the user
		followingGps = true;
		if(omnimap._zoom < 15 && userMarker){
			omnimap.flyTo(userMarker._latlng, 15, {duration: 0.2});
		} else {
			panToUser();
		}
		control.state('disable-gps');
	}
}, {
		icon: 'fa-crosshairs c-blue',
		stateName: 'disable-gps',
		title: 'Stop following GPS',
		onClick: function(control) {
			followingGps = false;
			control.state('enable-gps');
		}
	}]
}).addTo(omnimap);

omnimap.on("dragstart", function () { //Stop following GPS when the user pans
	followingGps = false;
	gpsToggle.state('enable-gps');
});
