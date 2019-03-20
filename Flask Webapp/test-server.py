import flask
from flask_caching import Cache
from werkzeug.serving import run_simple
import omnimap

config = {
    "DEBUG": True,          # some Flask specific configs
    "CACHE_TYPE": "simple", # Flask-Caching related configs
    "CACHE_DEFAULT_TIMEOUT": 300
}

app = flask.Flask(__name__)
app.config.from_mapping(config)
cache = Cache(app)

@app.route('/')
@app.route('/omnimap')
def index():
    return app.send_static_file('omnimap.html')

@app.route('/omnimap/api/cameras')
def cameras():
    return omnimap.get_camera_geojson()

@app.route('/omnimap/api/abwinterroads')
@cache.cached(timeout=900) # 15 min cache. 511 only updates on a scale of hours anyways, frequent polling is wasteful.
def ab_winter_roads():
    return omnimap.get_ab_roads_geojson()

@app.route('/omnimap/api/abevents')
def ab_road_events():
    return omnimap.get_ab_road_events_geojson()

@app.route('/omnimap/api/lime')
def lime():
    return omnimap.get_lime_geojson()

@app.route('/omnimap/api/parking')
@cache.cached(timeout=43200) # 12 hours
def parking():
    return omnimap.get_parking_geojson()

if __name__ == '__main__':
    app.run('0.0.0.0', 8083, use_reloader=True, use_debugger=True)
