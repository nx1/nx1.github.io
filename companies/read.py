import pandas as pd
df = pd.read_csv('./geocoded_addresses.csv')
print(df['registered_office_address'])
