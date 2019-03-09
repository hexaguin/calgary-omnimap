import flask
from werkzeug.serving import run_simple
import omnimap

app = flask.Flask(__name__)

@app.route('/')
@app.route('/omnimap')
def index():
    print('INDEX')
    return app.send_static_file('omnimap.html')

@app.route('/omnimap/api/cameras')
def cameras():
    return omnimap.get_camera_geojson()

@app.route('/omnimap/api/abwinterroads')
def ab_winter_roads():
    return omnimap.get_ab_roads_geojson()

@app.route('/omnimap/api/abevents')
def ab_road_events():
    return omnimap.get_ab_road_events_geojson()

@app.route('/omnimap/api/lime')
def lime():
    return omnimap.get_lime_geojson()

if __name__ == '__main__':
    app.run('0.0.0.0', 8083, use_reloader=True, use_debugger=True)
