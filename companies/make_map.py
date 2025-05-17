import numpy as np
import folium
import pandas as pd

df = pd.read_csv('./geocoded_addresses.csv')
print(df)


map = folium.Map(location=(51.5288579,-0.0618763), zoom_start=14)

markers = []
for i, r in df.iterrows():
    lat, lon = r['lat'], r['lon']
    print(type(lat))
    if lat == None:
        print('test')
        continue
    m = folium.Marker(location=[lat, lon],
                      tooltip="Test",
                      popup="popup",
                      icon=folium.Icon(icon="cloud"))
    markers.append(m)
    print(r)

for m in markers:
    m.add_to(map)

map.save('index.html')
