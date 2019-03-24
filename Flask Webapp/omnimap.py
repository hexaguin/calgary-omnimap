import time
import json
import requests
import pandas as pd

import polyline
import overpass
import geojson
from geojson_rewind import rewind


# LONG LAT, not lat long, for Geojson consistency. (min, max) of each axis.
calgary_bb = ((-114.9776127585, -113.1511357077),
              (50.4645218901, 51.5463584332))


#  ██████  ███████ ███    ██ ███████ ██████   █████  ██          ███████ ██    ██ ███    ██  ██████ ████████ ██  ██████  ███    ██ ███████
# ██       ██      ████   ██ ██      ██   ██ ██   ██ ██          ██      ██    ██ ████   ██ ██         ██    ██ ██    ██ ████   ██ ██
# ██   ███ █████   ██ ██  ██ █████   ██████  ███████ ██          █████   ██    ██ ██ ██  ██ ██         ██    ██ ██    ██ ██ ██  ██ ███████
# ██    ██ ██      ██  ██ ██ ██      ██   ██ ██   ██ ██          ██      ██    ██ ██  ██ ██ ██         ██    ██ ██    ██ ██  ██ ██      ██
#  ██████  ███████ ██   ████ ███████ ██   ██ ██   ██ ███████     ██       ██████  ██   ████  ██████    ██    ██  ██████  ██   ████ ███████


def row_in_calgary(row):
    return calgary_bb[0][0] < row['longitude'] < calgary_bb[0][1] and calgary_bb[1][0] < row['latitude'] < calgary_bb[1][1]


def set_or_value(x):
    if len(set(x)) > 1:
        return list(set(x))
    else:
        return x.iloc[0]


# HTML format string for an image that links to its own source
camera_link_format = '<a class=\"cam-img\" href=\"{0}\" target=\"_blank\"> <img src=\"{0}\" width=100%> </a>'


def make_camera_image_list(cameras):
    if type(cameras) is str:
        return camera_link_format.format(cameras)
    else:
        return '<div class=\"cam-slideshow cam-hidden\">' + '\n'.join([camera_link_format.format(x) for x in cameras]) + '</div>'


def polyline_in_bb(line, bb=calgary_bb):
    in_bb = False
    for c in line:
        if bb[0][0] < c[0] < bb[0][1] and bb[1][0] < c[1] < bb[1][1]:
            in_bb = True
            break
    return in_bb


#  █████  ██████  ██     ███████ ███    ██ ██████  ██████   ██████  ██ ███    ██ ████████ ███████
# ██   ██ ██   ██ ██     ██      ████   ██ ██   ██ ██   ██ ██    ██ ██ ████   ██    ██    ██
# ███████ ██████  ██     █████   ██ ██  ██ ██   ██ ██████  ██    ██ ██ ██ ██  ██    ██    ███████
# ██   ██ ██      ██     ██      ██  ██ ██ ██   ██ ██      ██    ██ ██ ██  ██ ██    ██         ██
# ██   ██ ██      ██     ███████ ██   ████ ██████  ██       ██████  ██ ██   ████    ██    ███████


def get_camera_geojson():
    traffic_cameras = pd.read_json("https://511.alberta.ca/api/v2/get/cameras")
    traffic_cameras.columns = [s.lower() for s in traffic_cameras.columns]
    traffic_cameras = traffic_cameras[traffic_cameras.apply(row_in_calgary, axis=1)]  # Calgary only
    traffic_cameras['id_prefix'] = [s.split('.')[0] for s in traffic_cameras['id']]
    traffic_cameras = traffic_cameras.groupby('id_prefix').aggregate(set_or_value).reset_index()  # Aggregate any entries of the same camera ID prefix for multiple rows (usually 3 camera setups at interchanges). These entries consistently share the same lat/long.
    traffic_cameras = traffic_cameras.rename(index=str, columns={"id_prefix": "id", "id": "sub_id"})

    camera_features = []
    for index, row in traffic_cameras.iterrows():
        row['popup'] = '<h2>' + row['name'] + '</h2>' + \
                make_camera_image_list(row['url']) + '<br>' + \
                str(row['description'])
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [row['longitude'], row['latitude']]
            },
            'properties': row.to_dict()
        }
        camera_features.append(feature)

    camera_dict = {
        'type': 'FeatureCollection',
        'features': camera_features,
        'meta': {
            'generated': int(time.time())
        }
    }

    return json.dumps(camera_dict)


def get_ab_road_events_geojson():
    events_df = pd.read_json('https://511.alberta.ca/api/v2/get/event')
    events_df.columns = [s.lower() for s in events_df.columns]
    events_df = events_df[events_df.apply(row_in_calgary, axis=1)]  # Only items in Calgary
    events_df.fillna('', inplace=True)  # Remove NaN values to meet JSON standards
    events_features = []
    for index, row in events_df.iterrows():
        row['popup'] = '<h2 class=\"titlecase\">' + row['eventtype'] + '</h2>' + row['description']
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [row['longitude'], row['latitude']]
            },
            'properties': row.to_dict()
        }
        events_features.append(feature)

    event_dict = {
        'type': 'FeatureCollection',
        'features': events_features,
        'meta': {
            'generated': int(time.time())
        }
    }

    return json.dumps(event_dict, allow_nan=False)


def get_lime_geojson():
    bikes = json.loads(requests.get('https://lime.bike/api/partners/v1/gbfs_calgary/free_bike_status.json').text)
    bike_list = [
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [float(i['lon']), float(i['lat'])]
            },
            'properties': i
        }
        for i in bikes['data']['bikes']
    ]
    bike_dict = {
        'type': 'FeatureCollection',
        'features': bike_list,
        'meta': {
            'generated': int(time.time())
        }
    }
    return json.dumps(bike_dict)


def get_ab_roads_geojson():
    ab_road_list = json.loads(requests.get('https://511.alberta.ca/api/v2/get/winterroads').text)
    ab_road_features = [  # Generate a gejson array of lines
        {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': [(c[1], c[0]) for c in polyline.decode(i['EncodedPolyline'])]  # Decode the string and swap lat/long for GeoJSON
            },
            'properties': i
        }
        for i in ab_road_list
    ]
    calgary_road_features = []
    for road in ab_road_features:  # Filter for only Calgary. More CPU time when generating, but way less overall load on client and server if cached.
        if (polyline_in_bb(road['geometry']['coordinates'])):
            calgary_road_features.append(road)

    road_dict = {
        'type': 'FeatureCollection',
        'features': calgary_road_features,
        'meta': {
            'generated': int(time.time())
        }
    }
    return json.dumps(road_dict)


def get_parking_geojson():
    parking = overpass.API().get('way["amenity"="parking"](50.859710441584,-114.27978515625,51.218927150951,-113.86505126953);', verbosity='geom')
    for i in parking['features']:
        if i['geometry']['type'] == 'LineString' and len(i['geometry']['coordinates']) >= 4:  # WORKAROUND to fix overpass lib's faulty polygon way handling
            i['geometry']['type'] = 'Polygon'
            i['geometry']['coordinates'] = [i['geometry']['coordinates']]
        i['properties']['id'] = i['id']

    return geojson.dumps(rewind(parking))
