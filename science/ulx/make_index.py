#list(paps) = ads.SearchQuery(q='ULX', sort='citation_count')
#for p in paps:
#    print(p.title)

from time import time
from datetime import datetime
import ads

searchterm = 'ULX'
paps = ads.SearchQuery(q=searchterm,
                       sort='year',
                       max_pages=50,
                       fl=['year', 'bibcode', 'title','author', 'citation_count'])
paps = list(paps)

starttime = time()
date = datetime.today().strftime('%d-%m-%Y, %H:%M:%S')

print('Writing to index.html')
with open('index.html', 'w+') as f:
    f.write("""
<html>
<head>
    <title>nx1.info</title>
    <link rel="icon" type="image/x-icon" href="../../favicon.png">
    <link rel="stylesheet" type="text/css" href="../../style.css">
</head>

<body>
<pre>
""")

    f.write(f'Generated with make_index.py on {date}\n')
    f.write(f'<h1>Papers matching search term: {searchterm}</h1>\n')
    .write(f'\n')

    lastdate = '2023'
    for p in paps:
        if lastdate != p.year:
            f.write('\n')
            lastdate=p.year
        try:
            authorname = p.author[0].split(',')[0] 
        except TypeError:
            continue
        line = f'{p.year} - {p.bibcode} - {p.citation_count:<3}- {authorname:<11} - {p.title[0]}\n'
        f.write(line)

    time_taken = time() - starttime
    f.write('\n')
    f.write(f'Page generated in {time_taken:.5f} seconds')
    f.write("""
</pre>
</body>
</html>
""")



