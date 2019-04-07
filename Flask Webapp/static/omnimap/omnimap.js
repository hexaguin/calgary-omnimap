var mapboxToken = 'sk.eyJ1IjoiaGV4YWd1aW4iLCJhIjoiY2p0YWhoOTliMGIxdTQzc3pzZnJjMnZ3dCJ9.Dp8AM1s5MunEf1f7nn9yEQ';

var omnimap = L.map('map-container', {
	zoomSnap: 0.25,
	maxBounds: [[50.4645, -115.5],
	           [51.5464, -112.5]],
	minZoom: 10
}).setView([51.0486, -114.0708], 11);

// Basemaps

var basemapOSMMapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	name: 'Street Map',
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var basemapMapboxStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token={token}', {
	name: 'Street Map (Modern)',
	maxZoom: 20,
	token: mapboxToken,
	tileSize: 512, // Mapbox uses 512px tiles instead of 256px to save on API calls
	zoomOffset: -1,
	attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var basemapEsriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var basemapOpenCycleMap = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=b49f917275a84bef912e3c72bc4612ef', {
	attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	maxZoom: 22
});

var basemapCartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
});

basemapMapboxStreets.addTo(omnimap); // Set mapbox as the default basemap

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
var trafficIncidents = L.realtime({
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
var abIncidents = L.realtime({ //TODO prevent redundant call to API?
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
var abDetours = L.realtime({
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
var cameras = L.realtime({
		url: '/omnimap/api/cameras'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, cameraMarkerOptions).bindPopup(feature.properties.popup).on('popupopen', function(){
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
		$(".cam-img img").each(function(){
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
var abRoadConditions = L.realtime({
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
}
var parkingClusterOptions = {
	iconCreateFunction: function(cluster) {
		var count = cluster.getChildCount();
		if (count > 50) { // Large
			return L.divIcon({ html: '<div><i class="fas fa-parking"></i><br><span>' + cluster.getChildCount() +
			                         '</span></div>', className: 'marker-cluster parking-cluster-large', iconSize: new L.Point(40, 40) });
		} else if (count > 10) { // Medium
			return L.divIcon({ html: '<div><i class="fas fa-parking"></i><br><span>' + cluster.getChildCount() +
			                         '</span></div>', className: 'marker-cluster parking-cluster-med', iconSize: new L.Point(40, 40) });
		} else { // Small
			return L.divIcon({ html: '<div><i class="fas fa-parking"></i><br><span>' + cluster.getChildCount() +
			                         '</span></div>', className: 'marker-cluster parking-cluster-small', iconSize: new L.Point(40, 40) });
		}
	},
	maxClusterRadius: 80,
	disableClusteringAtZoom: 15
}

var parkingLayer = L.featureGroup.subGroup(drivingLayer);
var parkingDeflated = L.deflate({minSize: 5, markerCluster: true, markerOptions: parkingMarkerOptions, markerClusterOptions: parkingClusterOptions});
parkingDeflated.addTo(parkingLayer);

// WARN Leaflet.Pattern depends on deprecated features and SVG rendering. Replace with another shading method if updating Leaflet.
var parkingStripesFree = new L.StripePattern({angle: 45, color: '#3388ff'}); 
parkingStripesFree.addTo(omnimap);
var parkingStripesPaid = new L.StripePattern({angle: 45, color: '#1B3FBD'});
parkingStripesPaid.addTo(omnimap);

var parking = L.realtime({
		url:'/omnimap/api/parking'
	}, {
		interval: 60 * 60 * 1000, //hourly
		removeMissing: true,
		start: false,
		container: parkingDeflated,
		style: function(feature) {
			style = {
				weight: 2,
				color: '#3388ff'
			}
			if (feature.properties.fee == 'yes') {
				style.color = '#1B3FBD'
			}
			if (feature.properties.access == 'private') {
				if (feature.properties.fee == 'yes') {
					style.fillPattern = parkingStripesPaid;
				} else {
					style.fillPattern = parkingStripesFree;
				}
			}
			return style
		},
		onEachFeature: function(feature, layer){
			var popup = '<h2>Parking</h2>'
			if (feature.properties.name !== undefined) {
				popup += '<h3>' + feature.properties.name + '</h3>'
			}
			['access', 'capacity', 'description', 'fee', 'operator', 'surface'].forEach(function(key) { // Itterate over all relevant properties
				if (feature.properties[key] !== undefined) {
					popup += key + ': ' + feature.properties[key] + '<br>'
				}
			})
			if (feature.properties.website !== undefined) {
				popup += '<a href="' + feature.properties.website + '" target="_blank"> website </a>'
			}
			layer.bindPopup(popup)
		}
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
var plus15 = L.realtime({ // Doesn't really need to be realtime right now, but it streamlines development, and makes things easier if I want to color code closed sections later
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
var offLeash = L.realtime({
		url: 'https://data.calgary.ca/resource/enr4-crti.geojson',
		crossOrigin: true,
		type: 'json'
	}, {
		interval: 24 * 60 * 60 * 1000, //24 hours
		removeMissing: true,
		getFeatureId: function(featureData){
			return featureData.properties.off_leash_area_id
		},
		style: function(){
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
var parkAndBike = L.realtime({
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
			return L.divIcon({ html: '<div><i class="fas fa-bicycle"></i><br><span>' + cluster.getChildCount() + '</span></div>',
			                   className: 'marker-cluster lime-cluster-large', iconSize: new L.Point(40, 40) });
		} else if (count > 10) { // Medium
			return L.divIcon({ html: '<div><i class="fas fa-bicycle"></i><br><span>' + cluster.getChildCount() + '</span></div>',
			                   className: 'marker-cluster lime-cluster-med', iconSize: new L.Point(40, 40) });
		} else { // Small
			return L.divIcon({ html: '<div><i class="fas fa-bicycle"></i><br><span>' + cluster.getChildCount() + '</span></div>',
			                   className: 'marker-cluster lime-cluster-small', iconSize: new L.Point(40, 40) });
		}
	},
	maxClusterRadius: 50
});
limeBikeClusters.addTo(limeBikeLayer);
var limeBike = L.realtime({
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
 █████  ███    ███ ███████ ███    ██ ██ ████████ ██ ███████ ███████
██   ██ ████  ████ ██      ████   ██ ██    ██    ██ ██      ██
███████ ██ ████ ██ █████   ██ ██  ██ ██    ██    ██ █████   ███████
██   ██ ██  ██  ██ ██      ██  ██ ██ ██    ██    ██ ██           ██
██   ██ ██      ██ ███████ ██   ████ ██    ██    ██ ███████ ███████
*/


var amenitiesLayer = L.featureGroup();


var libraryMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'book', markerColor: 'blue', iconColor: 'white'})  // We can't use the CPL logo, as we don't have rights to it.
}
var libraryLayer = L.featureGroup.subGroup(amenitiesLayer);
var libraries = L.realtime({
		url: 'https://data.calgary.ca/resource/j5v6-8bqr.geojson'
	}, {
		interval: 24 * 60 * 60 * 1000, // Daily
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, libraryMarkerOptions).bindPopup(
				'<h2>' + feature.properties.library + '</h2>' +
				'<table class="hours-table">' +
				'<tr><td>Monday:</td><td>'    + feature.properties.monday_open     + '</td><td>-</td><td>' + feature.properties.monday_close     + '</td></tr>' +
				'<tr><td>Tuesday:</td><td>'   + feature.properties.tuesday_open    + '</td><td>-</td><td>' + feature.properties.tuesday_close    + '</td></tr>' +
				'<tr><td>Wednesday:</td><td>' + feature.properties.wednesday_open  + '</td><td>-</td><td>' + feature.properties.wednesday_close  + '</td></tr>' +
				'<tr><td>Thursday:</td><td>'  + feature.properties.thursday_open   + '</td><td>-</td><td>' + feature.properties.thursday_close   + '</td></tr>' +
				'<tr><td>Friday:</td><td>'    + feature.properties.friday_open     + '</td><td>-</td><td>' + feature.properties.friday_close     + '</td></tr>' +
				'<tr><td>Saturday:</td><td>'  + feature.properties.saturday_open   + '</td><td>-</td><td>' + feature.properties.saturday_close   + '</td></tr>' +
				'<tr><td>Sunday:</td><td>'    + feature.properties.sunday_open     + '</td><td>-</td><td>' + feature.properties.sunday_close     + '</td></tr>' +
				'</table><br>' + 
				feature.properties.location_1_address + '<br>' + feature.properties.postal_code + '<br><br>' +
				feature.properties.phone_number
			);
		},
		getFeatureId: function(featureData){
			return featureData.properties.library;
		}
}).addTo(libraryLayer);


var streetfoodMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'hotdog', markerColor: 'red', iconColor: 'white'})
}
var streetfoodUpcomingMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'hotdog', markerColor: 'red', iconColor: 'orange'})
}

var streetfoodLayer = L.featureGroup.subGroup(amenitiesLayer);
var streetfood = L.realtime({
		url: '/omnimap/api/streetfood'
	}, {
		interval: 5 * 60 * 1000, // 5 minutes
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			return L.marker(latlng, (feature.properties.open ? streetfoodMarkerOptions : streetfoodUpcomingMarkerOptions)).bindPopup(feature.properties.popup).on('popupopen', function(){
				$('.cam-slideshow').not('.slick-initialized').slick({ //Exclude existing slideshows from old popups so we don't scare slick.
					dots: true,
					speed: 100
				});
				$('.cam-hidden').removeClass('cam-hidden'); //Slideshows start hidden so the stack of img tags don't scroll the page up. Now that we have initialized it, we can display the slideshow.
			})
		}
}).addTo(streetfoodLayer);



var playgroundMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'child', markerColor: 'purple', iconColor: 'white'})
}
var playgroundClusterOptions = {
	iconCreateFunction: function(cluster) {
		var count = cluster.getChildCount();
		if (count > 50) { // Large
			return L.divIcon({ html: '<div><i class="fas fa-child"></i><br><span>' + cluster.getChildCount() +
			                         '</span></div>', className: 'marker-cluster playground-cluster-large', iconSize: new L.Point(40, 40) });
		} else if (count > 10) { // Medium
			return L.divIcon({ html: '<div><i class="fas fa-child"></i><br><span>' + cluster.getChildCount() +
			                         '</span></div>', className: 'marker-cluster playground-cluster-med', iconSize: new L.Point(40, 40) });
		} else { // Small
			return L.divIcon({ html: '<div><i class="fas fa-child"></i><br><span>' + cluster.getChildCount() +
			                         '</span></div>', className: 'marker-cluster playground-cluster-small', iconSize: new L.Point(40, 40) });
		}
	},
	maxClusterRadius: 80,
	disableClusteringAtZoom: 15
}

var playgroundStyle = {
	color: '#8B32A3',
	weight: 2
}

var playgroundLayer = L.featureGroup.subGroup(amenitiesLayer);
var playgroundDeflated =  L.deflate({minSize: 20, markerCluster: true, markerOptions: playgroundMarkerOptions, markerClusterOptions: playgroundClusterOptions});
playgroundDeflated.addTo(playgroundLayer);

var playgrounds = L.realtime({
		url:'/omnimap/api/playgrounds'
	}, {
		interval: 12 * 60 * 60 * 1000, //12 hours
		removeMissing: true,
		container: playgroundDeflated,
		style: function() { // For some reason this needs to be a function
			return playgroundStyle;
		},
		onEachFeature: function(feature, layer){
			var popup = '<h2>Playground</h2>'
			if (feature.properties.name !== undefined) {
				popup += '<h3>' + feature.properties.name + '</h3>'
			}
			['description', 'surface', 'wheelchair', 'operator'].forEach(function(key) { // Itterate over all relevant properties
				if (feature.properties[key] !== undefined) {
					popup += key + ': ' + feature.properties[key] + '<br>'
				}
			})
			if (feature.properties.website !== undefined) {
				popup += '<a href="' + feature.properties.website + '" target="_blank"> website </a>'
			}
			layer.bindPopup(popup)
		},
		pointToLayer: function(feature, latlng){
			feature // This is purely to get Theia to stop yelling at me. TODO find a way to disable the variable unused warning.
			return L.marker(latlng, playgroundMarkerOptions);
		}
}).addTo(playgroundLayer);

//Calgary events dataset

function offsetToday(offset){ //Returns a Date of today + offset.
	var today = new Date();
	var nextweek = new Date(today.getFullYear(), today.getMonth(), today.getDate()+offset);
	return nextweek;
}

function soqlDateRange(url, start, end){ // Appends a between soql filter to a Socrata URL
	return url +  encodeURIComponent(" AND next_date between '") + start.toISOString().split('T')[0] + encodeURIComponent("' and '") + end.toISOString().split('T')[0] + '%27'
}

function calgaryEventToHTML(properties){
	var popup = 
		'<h2>' + properties.title + '</h2>' +
		'<p>' + properties.all_dates + '</p>'
	if (properties.host_organization != null) {
		popup += '<h3> Hosted by ' + properties.host_organization + '</h3>';
	}
	popup += '<p>' + properties.notes + '</p>'
	if (properties.address != null) {
		popup += '<p>' + properties.address + '</p>';
	}
	if (properties.more_info_url != null) {
		popup += '<a href="' + properties.more_info_url + '" target="_blank"><p>Website</p></a>';
	}
	return popup
}


var festivalLayer =  L.featureGroup.subGroup(amenitiesLayer);
var festivalMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'star', markerColor: 'white', iconColor: 'purple'})
};
var currentFestivalMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'star', markerColor: 'purple', iconColor: 'white'})
};

var festivals = L.realtime({
		url: soqlDateRange('https://data.calgary.ca/resource/rbmk-85cw.geojson?$query=' + encodeURIComponent("SELECT * WHERE event_type = 'Festivals / major events'"), offsetToday(0), offsetToday(7))
	}, {
		interval: 3 * 60 * 60 * 1000, //3 hours
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			popup = calgaryEventToHTML(feature.properties);
			eventDate = new Date(feature.properties.next_date);
			var markerOptions = (eventDate < offsetToday(2)) ? currentFestivalMarkerOptions : festivalMarkerOptions;
			return L.marker(latlng, markerOptions).bindPopup(popup);
		},
		getFeatureId: function(feature){
			return feature.properties.title;
		}
}).addTo(festivalLayer);


var communityEventLayer =  L.featureGroup.subGroup(amenitiesLayer);
var communityEventMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'star', markerColor: 'white', iconColor: 'green'})
};
var currentCommunityEventMarkerOptions = {
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'star', markerColor: 'green', iconColor: 'white'})
};

var communityEvents = L.realtime({
		url: soqlDateRange('https://data.calgary.ca/resource/rbmk-85cw.geojson?$query=' + encodeURIComponent("SELECT * WHERE event_type = 'Community event'"), offsetToday(0), offsetToday(7))
	}, {
		interval: 3 * 60 * 60 * 1000, //3 hours
		removeMissing: true,
		pointToLayer: function(feature, latlng) {
			popup = calgaryEventToHTML(feature.properties);
			eventDate = new Date(feature.properties.next_date);
			var markerOptions = (eventDate < offsetToday(2)) ? currentCommunityEventMarkerOptions : communityEventMarkerOptions;
			return L.marker(latlng, markerOptions).bindPopup(popup);
		},
		getFeatureId: function(feature){
			return feature.properties.title;
		}
}).addTo(communityEventLayer);


// Auto-update date-based Socrata URLs here
setInterval(function(){
	festivals.setUrl(soqlDateRange('https://data.calgary.ca/resource/rbmk-85cw.geojson?$query=' + encodeURIComponent("SELECT * WHERE event_type = 'Festivals / major events'"), offsetToday(0), offsetToday(7)))
}, 6 * 60 * 60 * 1000); // Update every 6 hours

/*
███    ███  █████  ██████      ███████ ███████ ████████ ██    ██ ██████
████  ████ ██   ██ ██   ██     ██      ██         ██    ██    ██ ██   ██
██ ████ ██ ███████ ██████      ███████ █████      ██    ██    ██ ██████
██  ██  ██ ██   ██ ██               ██ ██         ██    ██    ██ ██
██      ██ ██   ██ ██          ███████ ███████    ██     ██████  ██
*/

L.control.scale().addTo(omnimap); //Scale

// Routing

var NavFromMarkerOptions = {
	draggable: true,
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'play', markerColor: 'green', iconColor: 'white'})
};
var NavViaMarkerOptions = {
	draggable: true,
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'step-forward', markerColor: 'blue', iconColor: 'white'})
};
var NavToMarkerOptions = {
	draggable: true,
	icon: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'stop', markerColor: 'red', iconColor: 'white'})
};

routingControl = L.Routing.control({
	router: L.Routing.mapbox(mapboxToken, {
		profile: 'mapbox/driving-traffic'
	}),
	createMarker: function(i, waypoint, n) {
		if (i == 0) {
			return L.marker(waypoint.latLng, NavFromMarkerOptions);
		} else if (i == n-1) {
			return L.marker(waypoint.latLng, NavToMarkerOptions);
		} else {
			return L.marker(waypoint.latLng, NavViaMarkerOptions);
		}
	},
	geocoder: L.Control.Geocoder.mapbox(mapboxToken, {
		autocomplete: true,
		geocodingQueryParams: {bbox: '-114.45260148479741,50.66596875349393,-113.6475824946525,51.317842186832365'}
	}),
	collapsible: true,
}).addTo(omnimap);
routingControl.hide();
$('leaflet-routing-container').attr('title','Navigation'); // Add title text to the button

routingControl.on('routingstart', function(e){ // Automatically switch between driving-traffic and driving based on number of waypoints
	if (e.waypoints.length > 3 && routingControl.getRouter().options.profile == "mapbox/driving-traffic") { // If we're using traffic and have 4+ points...
		routingControl.getRouter().options.profile = "mapbox/driving"; // Switch to non-traffic mode
		routingControl.route(); //Update router
	} else if (e.waypoints.length <= 3 && routingControl.getRouter().options.profile == "mapbox/driving") { /// If we have few points and aren't using traffic...
		routingControl.getRouter().options.profile = "mapbox/driving-traffic"; // Switch to non-traffic mode
		routingControl.route(); //Update router
	}
},)

// Inject controls for switching profiles.
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



// "Jump to GPS" button *HACK* using CSS psudoelements and pixel counting. 
var routingSideButtonSize    = 32; // Size of buttons next to text boxes
var routingSideButtonYOffset = 9;
$('.leaflet-routing-container').on('click', '.leaflet-routing-geocoder:first-child', function(e){ //Bind to the entire container so that when the DOM shifts around inside the container we don't lose the binding
	//Only activate if the click is on the first 24x24 pixels (where our :before is)
	if (userMarker && e.pageX-$(this).offset().left < routingSideButtonSize && e.pageY-$(this).offset().top-routingSideButtonYOffset < routingSideButtonSize) { 
		var waypoints = routingControl.getWaypoints();
		waypoints[0] = userMarker._latlng;
		routingControl.setWaypoints(waypoints);
	}
});

$('.leaflet-routing-container').on('click', '.leaflet-routing-geocoder:nth-last-child(3)', function(e){ //Bind to the entire container so that when the DOM shifts around inside the container we don't lose the binding
	if (e.pageX-$(this).offset().left < routingSideButtonSize && e.pageY-$(this).offset().top-routingSideButtonYOffset < routingSideButtonSize) {
		var waypoints = routingControl.getWaypoints();
		routingControl.setWaypoints(waypoints.reverse());
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

festivalLayer.addTo(omnimap);
communityEventLayer.addTo(omnimap);

var baseTree = {
	label: 'Base Maps',
	children: [
		{label: '<b>Street Maps</b>', children: [
			{label: 'Modern', layer: basemapMapboxStreets},
			{label: 'Dark', layer: basemapCartoDark},
			{label: 'Classic', layer: basemapOSMMapnik},
		]},
		{label: 'Bike Map', layer: basemapOpenCycleMap},
		{label: 'Satellite', layer: basemapEsriWorldImagery}
	]
};

var overlayTree = {
	label: 'Overlays',
	children: [
		{
			label: '<b id="l-driving">Driving</b>',
			layer: drivingLayer,
			children: [
				{label: '<span id="l-incidents"><i class="fas fa-fw fa-car-crash p-red"></i> Traffic Incidents</span>', layer: incidentLayer},
				{label: '<span id="l-detour"><i class="fas fa-fw fa-car p-orange"></i> Closures and Detours</span>', layer: detourLayer},
				{label: '<span id="l-camera"><i class="fas fa-fw fa-camera"></i> Traffic Cameras</span>', layer: cameraLayer},
				{label: '<span id="l-conditions"><i class="fas fa-fw fa-square c-green"></i> Road Conditions</span>', layer: roadConditionLayer},
				{label: '<span id="l-parking"><i class="fas fa-fw fa-parking p-blue"></i> Parking</span>', layer: parkingLayer},
			]
		},
		{
			label: '<b id="l-walking">Walking</b>',
			layer: walkingLayer,
			children: [
				{label: '<span id="l-plus15"><i class="fas fa-fw fa-square c-blue"></i> Plus 15</span>', layer: plus15Layer},
				{label: '<span id="l-offleash"><i class="fas fa-fw fa-square c-green"></i> Off Leash Areas</span>', layer: offLeashLayer}
			]
		},
		{
			label: '<b id="l-cycling">Cycling</b>',
			layer: bikeLayer,
			children: [
				{label: '<span id="l-parkandbike"><i class="fas fa-fw fa-bicycle p-blue"></i> Park and Bike</span>', layer: parkAndBikeLayer},
				{label: '<span id="l-cpabike"><i class="fas fa-fw fa-bicycle p-darkgreen"></i> CPA Bike Parking</span>', layer: cpaBikeLayer},
				{label: '<span id="l-lime"><i class="fas fa-fw fa-bicycle p-green"></i> Lime Rental Bikes</span>', layer: limeBikeLayer}
			]
		},
		{
			label: '<b id="l-amenities">Amenities</b>',
			layer: amenitiesLayer,
			children: [
				{label: '<span id="l-libraries"><i class="fas fa-fw fa-book p-blue"></i> Libraries</span>', layer: libraryLayer},
				{label: '<span id="l-streetfood"><i class="fas fa-fw fa-hotdog p-red"></i> Street Food</span>', layer: streetfoodLayer},
				{label: '<span id="l-playgrounds"><i class="fas fa-fw fa-child p-purple"></i> Playgrounds</span>', layer: playgroundLayer},
				{label: '<span id="l-festivals"><i class="fas fa-fw fa-star p-purple"></i> Festivals</span>', layer: festivalLayer},
				{label: '<span id="l-communityevents"><i class="fas fa-fw fa-star p-green"></i> Community Events</span>', layer: communityEventLayer},
			]
		}
	]
}

controlTree = L.control.layers.tree(baseTree, overlayTree, {
	closedSymbol: '<i class="fas fa-plus-square"></i>',
	openedSymbol: '<i class="fas fa-minus-square"></i>'
}).addTo(omnimap).collapseTree(true).collapseTree(false); // Add to map and collapse both the overlay and basemap menus.


function updateLayerTreeShading(tree, disabled) { // Tree to check, and whether the parent of this tree is disabled
	if (tree.children !== undefined) {
		tree.children.forEach( branch => {
			branchID = branch.label.split('id="')[1].split('"')[0]; // HTML ID of the layer's label
			var branchDisabled = !omnimap.hasLayer(omnimap._layers[branch.layer._leaflet_id]) || disabled; // If this branch or the parent is disabled
			if (branchDisabled) {
				$('#'+branchID).addClass('tree-disabled');
			} else {
				$('#'+branchID).removeClass('tree-disabled');
			}
			updateLayerTreeShading(branch, branchDisabled); // Recurse into child nodes
		});
	}
}
updateLayerTreeShading(controlTree._overlaysTree, false); // Perform initial update of tree

//Switch background color to match basemaps. This makes loading less jarring, and also hides Blink and Webkit's CSS subpixel bug (Leaflet issue 6101)
omnimap.on('baselayerchange', function(layer) { 
	switch (layer.layer) {
		case basemapMapboxStreets:
			$('#map-container').css('background-color', '#efe9e1');
			break;
		case basemapOSMMapnik:
			$('#map-container').css('background-color', '#f2efe9');
			break;
		case basemapCartoDark:
			$('#map-container').css('background-color', '#090909');
			break;
		case basemapOpenCycleMap:
			$('#map-container').css('background-color', '#dedecd');
			break;
		case basemapEsriWorldImagery:
			$('#map-container').css('background-color', '#808080');
			break;
	}
});

$('#map-container').css('background-color', '#efe9e1'); // Mapbox background by default. NOTE must change if default basemap changes.

// Logic to only poll heavy layers when visible
omnimap.on('overlayadd', function(layer) {
	updateLayerTreeShading(controlTree._overlaysTree, false); // Update the tree's "disabled" shading
	
	switch (layer.layer) {
		case limeBikeLayer:
			limeBike.start();
			break;
		case roadConditionLayer:
			abRoadConditions.start();
			break;
		case parkingLayer:
			parking.start();
			break;
		default:
			break;
	}
});
omnimap.on('overlayremove', function(layer) {
	updateLayerTreeShading(controlTree._overlaysTree, false); // Update the tree's "disabled" shading
	
	switch (layer.layer) {
		case limeBikeLayer:
			limeBike.stop();
			break;
		case roadConditionLayer:
			abRoadConditions.stop();
			break;
		case parkingLayer:
			parking.stop();
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
		userMarker = L.circleMarker(e.latlng, {color: 'white', fillColor: '#006298', fillOpacity: 1, radius: 8, weight: 2}).addTo(omnimap)
			.bindPopup("You are within " + radius + " meters of this point");
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

// GPS Follow Toggle 
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

omnimap.on('dragstart', function () { // Stop following GPS when the user pans
	followingGps = false;
	gpsToggle.state('enable-gps');
});


// Context Menu
var contextMenu = L.popup().setContent(
	`<h2><i class="fas fa-directions"></i> Navigate:</h2>
	<span id="context-nav-from" class="context-button">From here</span>
	<span id="context-nav-to" class="context-button">To here</span>`
);

omnimap.on('contextmenu', function(e){
	contextMenu.setLatLng(e.latlng).openOn(omnimap); // Open at cursor
	
	// Set up button listeners for our newly created buttons
	$('#context-nav-from').click(function(){
		var waypoints = routingControl.getWaypoints();
		waypoints[0] = contextMenu.getLatLng(); // Set first point
		routingControl.setWaypoints(waypoints);
		omnimap.closePopup();
	});
	$('#context-nav-to').click(function(){
		var waypoints = routingControl.getWaypoints();
		waypoints[waypoints.length-1] = contextMenu.getLatLng(); // Set last point
		routingControl.setWaypoints(waypoints);
		omnimap.closePopup();
	});
});
