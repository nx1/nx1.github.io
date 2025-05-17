import os
import requests
from datetime import datetime
import requests
import signal
import feedparser
import pandas as pd
import xml.etree.ElementTree as ET
rss_feeds = {
    'Google News': 'https://news.google.com/rss',
    'BBC News': 'http://feeds.bbci.co.uk/news/rss.xml',
    'Financial Times (World)': 'https://www.ft.com/world?format=rss',
    'Financial Times (UK)': 'https://ft.com/world/uk?format=rss',
    'The New York Times': 'http://feeds.nytimes.com/nyt/rss/Technology',
    'The Guardian': 'https://www.theguardian.com/world/rss',
    'Hacker News': 'https://hnrss.org/frontpage',
    'Arxiv astro-ph.HE': 'https://rss.arxiv.org/rss/astro-ph.HE',
    'Arxiv cs.LG': 'https://rss.arxiv.org/rss/cs.LG',
    'Arxiv cs.AI': 'https://rss.arxiv.org/rss/cs.AI',
    'Github Trending (Python)' : 'https://mshibanami.github.io/GitHubTrendingRSS/daily/python.xml',
    'Github Trending (C)' : 'https://mshibanami.github.io/GitHubTrendingRSS/daily/c.xml',
    'Nature': 'https://www.nature.com/nature.rss',
    'CNN': 'http://rss.cnn.com/rss/cnn_topstories.rss',
    'NPR News': 'https://www.npr.org/rss/rss.php?id=1001',
    'The Atlantic': 'https://www.theatlantic.com/feed/all/',
    'Vox': 'https://www.vox.com/rss/index.xml',
    'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
    'Ars Technica': 'http://feeds.arstechnica.com/arstechnica/index',
    'Slashdot': 'http://rss.slashdot.org/Slashdot/slashdotMain',
    'Gizmodo': 'https://gizmodo.com/rss',
    'Smithsonian Magazine': 'https://www.smithsonianmag.com/rss/latest_articles/',
    'InfoQ' : 'https://feed.infoq.com/',
    'Dynomight': 'https://dynomight.net/feed.xml',
    'Marginal Revolution': 'https://marginalrevolution.com/feed',
    'Astral Codex Ten': 'https://astralcodexten.substack.com/feed',
    'Not Boring': 'https://www.notboring.co/feed',
    'Coding Horror': 'https://blog.codinghorror.com/rss/',
    'NASA Breaking News': 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    'Quanta Magazine': 'https://api.quantamagazine.org/feed/',
    'Science Daily': 'https://www.sciencedaily.com/rss/all.xml',
    'Spaceflight Now':'https://spaceflightnow.com/feed',
    'Space Daily': 'http://spacedaily.com/spacedaily.xml',
    'Space News': 'http://spacenews.com/feed',
    'Martin Fowler': 'https://martinfowler.com/feed.atom',
    'Python Insider': 'https://feeds.feedburner.com/PythonInsider',
    'Embedded Artistry': 'https://embeddedartistry.com/feed/',
    'Attack Magazine': 'https://www.attackmagazine.com/feed/',
    'DJ TechTools': 'https://djtechtools.com/feed/'
    }

def read_rss_feed(site_name, url):
    feed = feedparser.parse(url)
    entries = feed.entries
    df = pd.DataFrame(entries)
    df['site_name'] = site_name
    print(f'{len(df)} results for {site_name}')
    return df

def rss_df_to_html(df, output_file):
    with open(output_file, 'w') as file:
        file.write('<html>\n')
        file.write('<head>\n')
        file.write('    <title>nx1.info | News</title>\n')
        file.write('    <link rel="icon" type="image/x-icon" href="../favicon.png">\n')
        file.write('    <link rel="stylesheet" type="text/css" href="../style.css">\n')
        file.write('    <meta name="viewport" content="width=device-width, initial-scale=1">\n')
        file.write('</head>\n')
        file.write('<body>\n')
        file.write('<pre>\n')
        file.write('<h1>nx1.info | News</h1>\n\n')
        file.write(f'Last updated: {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}\n')

        last = None
        for i, r in df.iterrows():
            if last != r['site_name']:
                file.write(f'<h1>{r.site_name}</h1>\n\n')
            file.write(f'<a href="{r.link}">{r.title}</a>\n')
            last = r['site_name']

        file.write('<hr>\n')
        file.write('<div id="clock" onload="currentTime()"></div>\n')
        file.write('<script type="text/javascript" src="../clock.js"></script>\n')
        file.write('</pre>\n')
        file.write('</body>\n')
        file.write('</html>\n')

output_file = os.path.join(os.path.dirname(__file__), 'index.html')

dfs = [read_rss_feed(site_name, url) for site_name, url in rss_feeds.items()]
df = pd.concat(dfs)
#df = read_rss_feed(url)
rss_df_to_html(df, output_file)
print(f'File saved to: {output_file}')
