# Calgary Omnimap
## A unified map of Calgary, built using municipal and provincial open data resources.

A web-based, mobile-friendly map of Calgary, Alberta developed using the excellent [Leaflet](https://leafletjs.com/) mapping library. All resources are updated in near-realtime, meaning that it can be used as a live dashboard without ever having to reload the page.

### Try it for yourself [here](https://python.ryan.hattie.codes/omnimap)!

Current features include:
* Multiple basemaps:
	* 3 street map styles (Mapbox Streets, CartoDB DarkMatter, OpenStreetMap Mapnik)
	* A bike map (OpenBikeMap)
	* Satellite imagery (Esri World Imagery)
* Driving info:
	* Live traffic incidents, detours, and roadwork, from both the City of Calgary and the Government of Alberta
	* Up-to-the-minute road camera feeds, from both the City of Calgary and the Government of Alberta
	* Provincial road conditions
	* Parking
* Walking info:
	* Plus 15 map (with color coding for enclosed vs open)
	* Locations and boundaries of off-leash areas
* Cycling info:
	* Park and Bike locations
	* Calgary Parking Authority bike parking
	* Live locations of all available Lime bikes
* Mobile-friendly collapsible layer tree (with icon legend)
* Responsive design that works on everything from the iPhone 4 to 4k monitors
* GPS location (with ability to pan map as the user moves)
* Navigation for driving, biking, and walking

The backend consists of a handful of Python functions to convert specific non-standard resources into GeoJSON to be consumed by Leaflet, while excluding data outside of Calgary (which greatly reduces client load). These functions simply return GeoJSON strings, meaning they should theoretically be compatible with any Python web server. A simple Flask app is included for development and testing.

This project is still in development! Feel free to submit bug reports and suggestions to the issue tracker.
