import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from tqdm import tqdm
tqdm.pandas()

geolocator = Nominatim(user_agent="my_bulk_geocoder")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)
df = pd.read_csv('./Companies-House-search-results.csv')
df['loc'] = df["registered_office_address"].progress_apply(geocode)
df['lon'] = df['loc'].apply(lambda l: l.longitude if l else None)
df['lat'] = df['loc'].apply(lambda l: l.latitude if l else None)
print(df)
df.to_csv('./geocoded_addresses.csv')
