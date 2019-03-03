import pandas as pd
import json

def set_or_value(x):
    if len(set(x)) > 1:
        return set(x)
    else:
        return x.iloc[0]

camera_link_format = '<a href=\"{0}\" target=\"_blank\"> <img src=\"{0}\" width=100%> </a>' # HTML format string for an image that links to its source

def make_camera_image_list(cameras):
    if type(cameras) is str:
        return camera_link_format.format(cameras)
    else:
        return '<br>'.join([camera_link_format.format(x) for x in cameras])

#API endpoint for static data from non-geojson sources. TODO output geojson?
def generateStaticData(): #TODO cache this using CRON. Also filter out stuff outside Calgary (probably just with a radius) for less client load
    traffic_cameras = pd.read_json("https://511.alberta.ca/api/v2/get/cameras")
    traffic_cameras.columns = [s.lower() for s in traffic_cameras.columns]
    traffic_cameras['id_prefix'] = [s.split('.')[0] for s in traffic_cameras['id']]
    traffic_cameras = traffic_cameras.groupby('id_prefix').aggregate(set_or_value) # Aggregate any entries of the same camera ID prefix for multiple rows (usually 3 camera setups at interchanges). These entries consistently share the same lat/long.
    
    camera_popups = []
    
    for index, row in traffic_cameras.iterrows():
        popup = '<h2>' + row['name'] + '</h2>' + \
                make_camera_image_list(row['url']) + '<br>' + \
                str(row['description']) # TODO better handling of sets of differing descriptions
        
        camera_popups.append(popup)
    
    traffic_cameras['popup'] = camera_popups
    
    traffic_cameras_dict = {
        'points': traffic_cameras[['latitude', 'longitude', 'popup']].to_dict(orient='records')
    }
    return json.dumps(traffic_cameras_dict)
