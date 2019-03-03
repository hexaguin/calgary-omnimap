import flask
from werkzeug.serving import run_simple
import omnimap

app = flask.Flask(__name__)

@app.route('/')
@app.route('/omnimap')
def index():
    print('INDEX')
    return app.send_static_file('omnimap.html')

@app.route('/omnimap/api/static')
def static_points():
    return omnimap.generateStaticData();

if __name__ == '__main__':
    run_simple('0.0.0.0', 8083, app, use_reloader=True, use_debugger=True)
