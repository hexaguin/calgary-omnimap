# Calgary Omnimap
## A unified map of Calgary, built using municipal and provincial open data resources.
### (Better name pending)

A web-based, mobile-friendly map of Calgary, Alberta developed using the excellent [Leaflet](https://leafletjs.com/) mapping library. All resources are updated in near-realtime, meaning that it can be used as a live dashboard without ever having to reload the page.

Current features include:
* Multiple basemaps:
	* A standard street map (OpenStreetMap)
	* A bike map (OpenBikeMap)
	* Satellite imagery (Esri World Imagery)
	* A dark theme for better highlighting overlay layers (CartoDB)
* Driving info:
	* Live traffic incidents, detours, and roadwork, from both the City of Calgary and the Government of Alberta
	* Up-to-the-minute road camera feeds, from both the City of Calgary and the Government of Alberta
	* Provincial road conditions
* Walking info:
	* Plus 15 map (with color coding for enclosed vs open)
	* Locations and boundaries of off-leash areas
* Cycling info:
	* Park and Bike locations
	* Calgary Parking Authority bike parking
	* Live locations of all available Lime bikes
* Mobile-friendly collapsible layer tree (with icon legend)
* Responsive design that works on everything from the iPhone 4 to 4k monitors
* GPS location and following

The backend consists of a handful of Python functions to convert specific non-standard resources into GeoJSON to be consumed by Leaflet, while excluding data outside of Calgary (which greatly reduces client load). These functions simply return GeoJSON strings, meaning they should theoretically be compatible with any Python web server. A simple Flask app is included for development and testing.
