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
    'Financial Times (UK)': 'ft.com/world/uk?format=rss',
    'The New York Times': 'http://feeds.nytimes.com/nyt/rss/Technology',
    'The Guardian': 'https://www.theguardian.com/world/rss',
    'Hacker News': 'https://hnrss.org/frontpage',
    'Arxiv astro-ph.HE': 'https://rss.arxiv.org/rss/astro-ph.HE',
    'Arxiv cs.LG': 'https://rss.arxiv.org/rss/cs.LG',
    'Nature': 'https://www.nature.com/nature.rss',
    'Reuters': 'http://feeds.reuters.com/reuters/topNews',
    'CNN': 'http://rss.cnn.com/rss/cnn_topstories.rss',
    'Push Square': 'http://www.pushsquare.com/feeds/latest',
    'TechCrunch': 'http://feeds.feedburner.com/TechCrunch/',
    'NPR News': 'https://www.npr.org/rss/rss.php?id=1001',
    'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
    'Reddit r/worldnews': 'https://www.reddit.com/r/worldnews/.rss',
    'Reddit r/technology': 'https://www.reddit.com/r/technology/.rss',
    'AP News': 'https://rss.apnews.com/apf-topnews',
    'Ars Technica': 'http://feeds.arstechnica.com/arstechnica/index',
    'Wired': 'https://www.wired.com/feed/rss',
    'NASA Breaking News': 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    'ESPN': 'https://www.espn.com/espn/rss/news',
    'XDA Developers': 'https://www.xda-developers.com/feed/',
    'Lifehacker': 'https://lifehacker.com/rss',
    'The Verge': 'https://www.theverge.com/rss/index.xml',
    'Mashable': 'http://feeds.mashable.com/Mashable',
    'Engadget': 'https://www.engadget.com/rss.xml',
    'ZDNet': 'https://www.zdnet.com/news/rss.xml',
    'Slashdot': 'http://rss.slashdot.org/Slashdot/slashdotMain',
    'Medium Technology': 'https://medium.com/feed/tag/technology',
    'Bloomberg': 'https://www.bloomberg.com/feed/podcast',
    'Economist': 'https://www.economist.com/sections/international/rss.xml',
    'Forbes': 'https://www.forbes.com/real-time/feed2/',
    'Android Police': 'https://www.androidpolice.com/feed/',
    'Polygon': 'https://www.polygon.com/rss/index.xml',
    'Gizmodo': 'https://gizmodo.com/rss',
    'Eurogamer': 'https://www.eurogamer.net/rss',
    'Scientific American': 'https://rss.sciam.com/Scientific-American-News',
    'Space.com': 'https://www.space.com/feeds/all',
    'Inverse': 'https://www.inverse.com/rss',
    'Smithsonian Magazine': 'https://www.smithsonianmag.com/rss/',
    'Kottke.org': 'https://feeds.kottke.org/main',
    'Boing Boing': 'https://boingboing.net/feed',
    'Pocket-lint': 'https://www.pocket-lint.com/rss',
    'CNET': 'https://www.cnet.com/rss/news/',
    'Digital Trends': 'https://www.digitaltrends.com/feed/',
    'AppleInsider': 'https://appleinsider.com/rss/news',
    'MacRumors': 'https://feeds.macrumors.com/MacRumors-All',
    '9to5Mac': 'https://9to5mac.com/feed/',
    '9to5Google': 'https://9to5google.com/feed/',
    'The Atlantic': 'https://www.theatlantic.com/feed/all/',
    'Vox': 'https://www.vox.com/rss/index.xml',
    'Politico': 'https://www.politico.com/rss/politics08.xml',
    'Science Daily': 'https://www.sciencedaily.com/rss/all.xml'
}

def read_rss_feed(site_name, url):
    feed = feedparser.parse(url)
    entries = feed.entries
    df = pd.DataFrame(entries)
    df['site_name'] = site_name
    print(df)
    return df

def rss_df_to_html(df, output_file):
    with open(output_file, 'w') as file:
        file.write('<html>\n')
        file.write('<head>\n')
        file.write('    <title>nx1.info</title>\n')
        file.write('    <link rel="icon" type="image/x-icon" href="../favicon.png">\n')
        file.write('    <link rel="stylesheet" type="text/css" href="../style.css">\n')
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

url = 'https://news.google.com/rss'
output_file = './index.html'

dfs = [read_rss_feed(site_name, url) for site_name, url in rss_feeds.items()]
df = pd.concat(dfs)
#df = read_rss_feed(url)
rss_df_to_html(df, output_file)
print(f'File saved to: {output_file}')
