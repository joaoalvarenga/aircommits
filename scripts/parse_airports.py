import pandas as pd


df = pd.read_csv('airports.dat', header=0, names=[
    'airport_id',
    'name',
    'city',
    'country',
    'iata',
    'icao',
    'latitude',
    'longitude',
    'altitude',
    'timezone',
    'dst',
    'tz_database_timezone',
    'type',
    'source'
], keep_default_na=False)

def escape_string(string: str) -> str:
    string = string.replace('\'', '\'\'')
    return string

# code, name, city, country, latitude, longitude

values = []
for i, row in df.iterrows():
    if row['iata'] == '\\N':
        continue

    values.append(
        f"('{row['iata']}','{escape_string(row['name'])}','{escape_string(row['city'])}','{escape_string(row['country'])}',{row['latitude']},{row['longitude']})"
    )


print(',\n'.join(values))




    
