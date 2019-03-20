import pandas as pd
import json, requests, polyline, time
import xml.etree.ElementTree as ET

calgary_bb = ((-114.9776127585, -113.1511357077), (50.4645218901, 51.5463584332)) #LONG LAT, not lat long, for Geojson consistency. (min, max) of each axis. 
def row_in_calgary(row):
    return calgary_bb[0][0] < row['longitude'] < calgary_bb[0][1] and calgary_bb[1][0] < row['latitude'] < calgary_bb[1][1]

def set_or_value(x):
    if len(set(x)) > 1:
        return list(set(x))
    else:
        return x.iloc[0]

camera_link_format = '<a class=\"cam-img\" href=\"{0}\" target=\"_blank\"> <img src=\"{0}\" width=100%> </a>' # HTML format string for an image that links to its source

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

#API endpoints
def get_camera_geojson(): 
    traffic_cameras = pd.read_json("https://511.alberta.ca/api/v2/get/cameras")
    traffic_cameras.columns = [s.lower() for s in traffic_cameras.columns]
    traffic_cameras = traffic_cameras[traffic_cameras.apply(row_in_calgary, axis=1)] # Calgary only
    traffic_cameras['id_prefix'] = [s.split('.')[0] for s in traffic_cameras['id']]
    traffic_cameras = traffic_cameras.groupby('id_prefix').aggregate(set_or_value).reset_index() # Aggregate any entries of the same camera ID prefix for multiple rows (usually 3 camera setups at interchanges). These entries consistently share the same lat/long.
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
    events_df = events_df[events_df.apply(row_in_calgary, axis=1)] # Only items in Calgary
    events_df.fillna('', inplace = True) # Remove NaN values to meet JSON standards
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
    ab_road_features = [ # Generate a gejson array of lines
        {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': [(c[1], c[0]) for c in polyline.decode(i['EncodedPolyline'])] # Decode the string and swap lat/long for GeoJSON
            },
            'properties': i
        }
        for i in ab_road_list
    ]
    calgary_road_features = []
    for road in ab_road_features: # Filter for only Calgary. More CPU time when generating, but way less overall load on client and server if cached.
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
    parking_tree = ET.ElementTree(ET.fromstring(requests.get("http://overpass-api.de/api/interpreter?data=node%5B%22amenity%22%3D%22parking%22%5D%2850%2E808104301205%2C%2D114%2E32922363281%2C51%2E226667902153%2C%2D113%2E80599975586%29%3Bout%3B%0A").text)) # Get parking OSM features from Overpass API
    
    nodes = []
    for elem in parking_tree.iter():
        if (elem.tag == 'node'):
            tags = elem.attrib
            for tag in elem.getchildren():
                tags[tag.attrib['k']] = tag.attrib['v']
            nodes.append(tags)
    
    for node in nodes:
        popup_html = '<h2>Parking</h2>'
        if 'name' in node:
            popup_html += '<h3>' + node['name'] + '</h3>'
        for tag in ['access', 'capacity', 'description', 'fee', 'operator', 'surface']:
            if tag in node:
                popup_html += tag + ': ' + node[tag] + '<br>'
        if  'website' in node:
            popup_html += '<a href="' + node['website'] + '" target="_blank"> website </a>'
        node['popup'] = popup_html
    parking_feature_list = []

    for node in nodes:
        parking_feature_list.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [float(node['lon']), float(node['lat'])]
            },
            'properties': node
        })

    parking_dict = {
        'type': 'FeatureCollection',
        'features': parking_feature_list
    }

    return json.dumps(parking_dict)
