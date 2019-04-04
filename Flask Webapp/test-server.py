import flask
from flask_caching import Cache
import omnimap

config = {
    "DEBUG": True,
    "CACHE_TYPE": "simple",
    "CACHE_DEFAULT_TIMEOUT": 300
}

app = flask.Flask(__name__)
app.config.from_mapping(config)
cache = Cache(app)


# Routes
@app.route('/')
@app.route('/omnimap')
def index():
    return app.send_static_file('omnimap.html')


@app.route('/omnimap/api/cameras')
def cameras():
    return omnimap.get_camera_geojson()


@app.route('/omnimap/api/abwinterroads')
@cache.cached(timeout=900)  # 15 min cache. 511 only updates on a scale of hours anyways, frequent polling is wasteful.
def ab_winter_roads():
    return omnimap.get_ab_roads_geojson()


@app.route('/omnimap/api/abevents')
def ab_road_events():
    return omnimap.get_ab_road_events_geojson()


@app.route('/omnimap/api/lime')
def lime():
    return omnimap.get_lime_geojson()


@app.route('/omnimap/api/parking')
@cache.cached(timeout=43200)  # 12 hour cache
def parking():
    return omnimap.get_parking_geojson()


@app.route('/omnimap/api/streetfood')
@cache.cached(timeout=60)  # Minutely cache
def streetfood():
    return omnimap.get_street_food_geojson()


@app.route('/omnimap/api/playgrounds')
@cache.cached(timeout=60)  # Minutely cache
def playgrounds():
    return omnimap.get_playground_geojson()


# Begin server
if __name__ == '__main__':
    app.run('0.0.0.0', 8083, use_reloader=True, use_debugger=True)
