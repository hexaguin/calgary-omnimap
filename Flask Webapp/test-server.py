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
    return omnimap.get_camera_geojson();

if __name__ == '__main__':
    app.run('0.0.0.0', 8083, use_reloader=True, use_debugger=True)
