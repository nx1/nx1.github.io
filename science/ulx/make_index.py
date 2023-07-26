from time import time
from datetime import datetime
import ads

searchterm = 'ULX*'
paps = ads.SearchQuery(q=searchterm,
                       sort='year',
                       max_pages=60,
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
    <style>
        /* CSS to remove underline from links */
        a {
            text-decoration: none;
        }
    </style>
</head>

<body>
<pre>
""")

    f.write(f'Generated with make_index.py on {date}\n')
    f.write(f'<h1>Papers matching search term: {searchterm}</h1>\n')
    f.write(f'\n')

    lastdate = '2023'
    for p in paps:
        if lastdate != p.year:
            f.write('\n')
            lastdate=p.year
        try:
            authorname = p.author[0].split(',')[0] 
        except TypeError:
            continue
        line = f'{p.year} - {p.citation_count:<3}- {authorname:<11} - {p.title[0]}'
        line = f'<a href="https://ui.adsabs.harvard.edu/abs/{p.bibcode}/abstract">{line}</a>\n'
        f.write(line)

    time_taken = time() - starttime
    f.write('\n')
    f.write(f'Page generated in {time_taken:.5f} seconds')
    f.write("""
</pre>
</body>
</html>
""")



