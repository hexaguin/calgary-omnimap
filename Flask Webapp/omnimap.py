"""
Generates GeoJSON strings to be served to the Calgary Omnimap client.
"""
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


headers = {
    'User-Agent': 'Omnimap API Server'
}


#  ██████  ███████ ███    ██ ███████ ██████   █████  ██          ███████ ██    ██ ███    ██  ██████ ████████ ██  ██████  ███    ██ ███████
# ██       ██      ████   ██ ██      ██   ██ ██   ██ ██          ██      ██    ██ ████   ██ ██         ██    ██ ██    ██ ████   ██ ██
# ██   ███ █████   ██ ██  ██ █████   ██████  ███████ ██          █████   ██    ██ ██ ██  ██ ██         ██    ██ ██    ██ ██ ██  ██ ███████
# ██    ██ ██      ██  ██ ██ ██      ██   ██ ██   ██ ██          ██      ██    ██ ██  ██ ██ ██         ██    ██ ██    ██ ██  ██ ██      ██
#  ██████  ███████ ██   ████ ███████ ██   ██ ██   ██ ███████     ██       ██████  ██   ████  ██████    ██    ██  ██████  ██   ████ ███████


def row_in_calgary(row):
    """Returns True if a given Pandas row is inside calgary_bb."""
    return calgary_bb[0][0] < row['longitude'] < calgary_bb[0][1] and calgary_bb[1][0] < row['latitude'] < calgary_bb[1][1]


def set_or_value(x):
    """If given a set with one member, returns that member. Otherwise, returns the original set as a list."""
    if len(set(x)) > 1:
        return list(set(x))
    else:
        return x.iloc[0]


def name_from_file_url(file_url):
    """Returns the filename, without extension, from a URL in a DF row.
    For example, http://trafficcam.calgary.ca/loc32.jpg becomes loc32."""
    id = file_url.split('/')[-1].split('.')[0]
    return id


# HTML format string for an image that links to its own source
image_link_format = '<a class=\"cam-img\" href=\"{0}\" target=\"_blank\"> <img src=\"{0}\" width=300 height=100%> </a>'
image_nolink_format = '<img src=\"{0}\" width=300 height=100%>'


def make_image_slideshow(images, link=True):
    """Converts a list of images to a slideshow for multiple images or a single image for one."""
    if link:
        if type(images) is str:
            return image_link_format.format(images)
        else:
            return '<div class=\"cam-slideshow cam-hidden\">' + '\n'.join([image_link_format.format(x) for x in images]) + '</div>'
    else:
        if type(images) is str:
            return image_nolink_format.format(images)
        else:
            return '<div class=\"cam-slideshow cam-hidden\">' + '\n'.join([image_nolink_format.format(x) for x in images]) + '</div>'


timestring = '%I:%M %p'
datestring = '%A, %B %d'


def make_foodtruck_html(row):  # TODO use description_short when possible
    truck_html = '<a href="https://streetfoodapp.com/calgary/{0}" target=\"_blank\"><h2>{1}</h2></a>'.format(row.name, row['name']) + \
                 '<p>' + row['description'] + '</p>' + \
                 '<h3>Current Event</h3><p>' + row['start'].strftime(timestring) + ' - ' + row['end'].strftime(timestring) + \
                 '<br>' + row['start'].strftime(datestring) + \
                 '<br>' + row['location'] + '</p>'
    if 'event' in row and pd.isna(row['event']):
        truck_html += '<p>' + row['event'] + '</p>'
    if 'images' in row and type(row['images']) == list:
        truck_html += make_image_slideshow(row['images'])
    truck_html += '<a href="https://streetfoodapp.com/calgary/{0}" target=\"_blank\">Read more on Street Food App</a>'.format(row.name)

    return truck_html


def polyline_in_bb(line, bb=calgary_bb):
    """Checks if a given polyline overlaps with a bounding box. Used to crop large polyline data."""
    in_bb = False
    for c in line:
        if bb[0][0] < c[0] < bb[0][1] and bb[1][0] < c[1] < bb[1][1]:
            in_bb = True
            break
    return in_bb


def overpass_to_geojson(query):
    """Generates a GeoJSON file for any Overpass query"""
    osm_data = overpass.API().get(query, verbosity='geom')
    for i in osm_data['features']:
        if i['geometry']['type'] == 'LineString' and len(i['geometry']['coordinates']) >= 4:  # WORKAROUND to fix overpass lib's faulty polygon way handling
            i['geometry']['type'] = 'Polygon'
            i['geometry']['coordinates'] = [i['geometry']['coordinates']]
        i['properties']['id'] = i['id']
    return geojson.dumps(rewind(osm_data))


#  █████  ██████  ██     ███████ ███    ██ ██████  ██████   ██████  ██ ███    ██ ████████ ███████
# ██   ██ ██   ██ ██     ██      ████   ██ ██   ██ ██   ██ ██    ██ ██ ████   ██    ██    ██
# ███████ ██████  ██     █████   ██ ██  ██ ██   ██ ██████  ██    ██ ██ ██ ██  ██    ██    ███████
# ██   ██ ██      ██     ██      ██  ██ ██ ██   ██ ██      ██    ██ ██ ██  ██ ██    ██         ██
# ██   ██ ██      ██     ███████ ██   ████ ██████  ██       ██████  ██ ██   ████    ██    ███████


def get_camera_geojson():
    """Generates a Geojson file, complete with popup HTML, of cameras from the 511AB API."""
    # Load AB camera list
    traffic_cameras = pd.read_json('https://511.alberta.ca/api/v2/get/cameras')  # TODO make wrappers for Pandas functions to use Requests and custom UA.
    traffic_cameras.columns = [s.lower() for s in traffic_cameras.columns]
    traffic_cameras = traffic_cameras[traffic_cameras.apply(row_in_calgary, axis=1)]  # Calgary only

    # Load Calgary camera list
    calgary_cameras = pd.read_csv('https://data.calgary.ca/resource/35kd-jzrv.csv')
    calgary_cameras['id'] = calgary_cameras['camera_url'].apply(name_from_file_url)
    calgary_cameras.set_index('id', inplace=True)

    for index, row in traffic_cameras.iterrows():
        if 'AB--loc' in row['id']:  # Check if the ID matches the City of Calgary's id pattern
            id = row['id'].split('--')[1].split('C')[0]
            if id in calgary_cameras.index:
                traffic_cameras.at[index, 'url'] = calgary_cameras.at[id, 'url']
            else:
                print('Could not find camera ' + id)

    traffic_cameras['id_prefix'] = [s.split('.')[0] for s in traffic_cameras['id']]
    traffic_cameras = traffic_cameras.groupby('id_prefix').aggregate(set_or_value).reset_index()  # Aggregate any entries of the same camera ID prefix for multiple rows (usually 3 camera setups at interchanges). These entries consistently share the same lat/long.
    traffic_cameras = traffic_cameras.rename(index=str, columns={"id_prefix": "id", "id": "sub_id"})

    camera_features = []
    for index, row in traffic_cameras.iterrows():
        row['popup'] = '<h2>' + row['name'] + '</h2>' + \
                make_image_slideshow(row['url']) + '<br>' + \
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
    """Generates a GeoJSON file containing all provincial "road events" from 511AB"""
    events_df = pd.read_json('https://511.alberta.ca/api/v2/get/event')
    events_df.columns = [s.lower() for s in events_df.columns]
    events_df = events_df[events_df.apply(row_in_calgary, axis=1)]  # Only items in Calgary
    # Localise timestamps and make them into human-friendly strings
    events_df['start'] = pd.to_datetime(events_df['startdate'], unit='s').dt.tz_localize('UTC').dt.tz_convert('America/Edmonton').dt.strftime('%B %d %Y, %-I:%M %p')
    events_df['end'] = pd.to_datetime(events_df['plannedenddate'], unit='s').dt.tz_localize('UTC').dt.tz_convert('America/Edmonton').dt.strftime('%B %d %Y, %-I:%M %p')
    events_df.fillna('', inplace=True)  # Remove NaN values to meet JSON standards
    events_features = []
    for index, row in events_df.iterrows():
        event_type = row['eventtype']  # Separate variable for displayed event type in popup
        if row['eventtype'] == 'accidentsAndIncidents':
            event_type = 'Incident'
        row['popup'] = '<h2 class=\"titlecase\">' + event_type + '</h2>' + row['description']
        if row['start'] != 'NaT':
            row['popup'] += '<br><br>Start Date: ' + row['start']
        if row['end'] != 'NaT':
            row['popup'] += '<br>Planned End Date: ' + row['end']
        row['popup'] += '<br><br>Source: Alberta Transportation'
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
    """Generates a GeoJSON file of all available Lime bikes in Calgary from the Lime API."""
    bikes = json.loads(requests.get('https://lime.bike/api/partners/v1/gbfs_calgary/free_bike_status.json', headers).text)
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
    """Generates GeoJson polylines for all provincial road conditions in Calgary from 511AB."""
    ab_road_list = json.loads(requests.get('https://511.alberta.ca/api/v2/get/winterroads', headers).text)
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
    """Generates a GeoJSON file of all OpenStreetMap features matching 'amenity=parking' in Calgary."""
    return overpass_to_geojson('way["amenity"="parking"](50.859710441584,-114.27978515625,51.218927150951,-113.86505126953);')


def get_playground_geojson():
    """Generates a geojson file of all OSM features that are leisure=playground without being indoor or paid"""
    return overpass_to_geojson("""
        (
            node["leisure"="playground"]["fee"!="yes"]["indoor"!="yes"](50.859710441584,-114.27978515625,51.218927150951,-113.86505126953);
            way["leisure"="playground"]["fee"!="yes"]["indoor"!="yes"](50.859710441584,-114.27978515625,51.218927150951,-113.86505126953);
            relation["leisure"="playground"]["fee"!="yes"]["indoor"!="yes"](50.859710441584,-114.27978515625,51.218927150951,-113.86505126953);
        );
    """)


def get_street_food_geojson():
    """Generates a GeoJSON file of all active or upcoming trucks on streetfoodapp.com"""
    schedule_json = json.loads(requests.get('http://data.streetfoodapp.com/1.1/schedule/calgary/', headers).text)

    rows = []  # List of dicts to become rows in our DF
    for truck in schedule_json['vendors']:
        truck_data = schedule_json['vendors'][truck]
        if len(truck_data['open']) > 0:  # Don't even bother if the truck isn't scheduled
            row_data = {
                'id':           truck_data['identifier'],
                'name':         truck_data['name'],
                'description':  truck_data['description'],
                'start':        truck_data['open'][0]['start'],
                'end':          truck_data['open'][0]['end'],
                'location':     truck_data['open'][0]['display'],
                'lat':          truck_data['open'][0]['latitude'],
                'lon':          truck_data['open'][0]['longitude']
            }
            if 'images' in truck_data.keys():
                row_data['images'] = truck_data['images']['header']
            if 'special' in truck_data.keys():
                row_data['event'] = truck_data['open'][0]['special']
            rows.append(row_data)

    trucks = pd.DataFrame(rows)
    trucks.set_index('id', inplace=True)
    trucks['url'] = 'https://streetfoodapp.com/calgary/' + trucks.index
    trucks['startEpoch'] = trucks['start']
    trucks['endEpoch'] = trucks['end']
    trucks['start'] = pd.to_datetime(trucks['start'], unit='s').dt.tz_localize('UTC').dt.tz_convert('America/Edmonton')
    trucks['end'] = pd.to_datetime(trucks['end'], unit='s').dt.tz_localize('UTC').dt.tz_convert('America/Edmonton')

    trucks = trucks[trucks['start'] < pd.Timestamp.now('America/Edmonton')+pd.DateOffset(hours=12)]  # Trucks opening in the next 12 hours
    trucks = trucks[trucks['end'] > pd.Timestamp.now('America/Edmonton')]  # Trucks not yet closed

    if trucks.shape[0] == 0:  # If there's no food trucks right now, just give up.
        return json.dumps({
            'type': 'FeatureCollection',
            'features': [],
            'meta': {
                'generated': int(time.time()),
                'message': 'No food trucks at this time'
            }
        })

    trucks['open'] = trucks['start'] < pd.Timestamp.now('America/Edmonton')
    trucks['popup'] = trucks.apply(make_foodtruck_html, axis=1)

    # Start building geojson
    truck_geojson_list = []
    for index, row in trucks.reset_index().drop(columns=['start', 'end']).fillna('').iterrows():
        truck_geojson_list.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [float(row['lon']), float(row['lat'])]
            },
            'properties': row.to_dict()
        })

    truck_geojson_dict = {
        'type': 'FeatureCollection',
        'features': truck_geojson_list,
        'meta': {
            'generated': int(time.time())
        }
    }

    return json.dumps(truck_geojson_dict, allow_nan=False)
