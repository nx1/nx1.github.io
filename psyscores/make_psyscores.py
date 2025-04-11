# Psyscores
import pandas as pd
import eyed3
from io import BytesIO
from mutagen.id3 import ID3
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
import matplotlib.pyplot as plt
from PIL import Image
from pathlib import Path

psy_path   = Path('/mnt/d/Music/psych')
#music_path = Path('/mnt/c/Users/norma/Music')

def get_album_art(tags):
    d = tags.getall('APIC')[0].data
    im = Image.open(BytesIO(d))
    return im

def get_flac_album_art(tags):
    d = tags.pictures[0].data
    im = Image.open(BytesIO(d))
    return im

def plot_image(im, plot=False):
    if not plot:
        return None
    plt.figure()
    plt.title(song_path.stem)
    plt.imshow(im, interpolation='none')
    plt.show()

ratings = {1   : 1,
           64  : 2,
           128 : 3,
           196 : 4,
           255 : 5}

all_res   = []

last_dir = None
for i, song_path in enumerate(psy_path.glob('*/*.flac')):
    if '_Singles' in str(song_path):
        continue

    print(i, song_path)
    tags   = FLAC(song_path)
    artist = str(tags.get('artist')[0])
    album  = str(tags.get('album')[0])
    track  = str(tags.get('title')[0])
    date   = int(tags.get('date')[0])
    title  = str(tags.get('title')[0])
    rating = int(tags.get('rating')[0])
    try:
        album_artist = str(tags.get('albumartist')[0])
    except:
        album_artist = artist


    d = {'artist' : artist,
         'album'  : album,
         'album_artist' : album_artist,
         'title'  : title,
         'date'   : date,
         'title'  : title,
         'rating' : rating,
         'bitrate': int(tags.info.bitrate/1000),
         }

    all_res.append(d)
    print(d)

    if last_dir != song_path.parent:
        im = get_flac_album_art(tags)
        plot_image(im)
        last_dir = song_path.parent
    d['image'] = im


last_dir = None
for i, song_path in enumerate(psy_path.glob('*/*.mp3')):
    if '_Singles' in str(song_path):
        continue
    print(i, song_path)
    mp3    = MP3(song_path)
    tags   = ID3(song_path)
    artist = str(tags.getall('TPE1')[0].text[0])
    album  = str(tags.getall('TALB')[0].text[0])
    date   = int(str(tags.getall('TDRC')[0].text[0]))
    title  = str(tags.getall('TIT2')[0].text[0])
    rating = int(str(tags.getall('POPM')[0].rating))
    rating = ratings[int(rating)]
    try:
        album_artist = str(tags.getall('TPE2')[0].text[0])
    except:
        album_artist = artist 

    d = {'artist' : artist,
         'album'  : album,
         'album_artist': album_artist,
         'date'   : date,
         'title'  : title,
         'rating' : rating,
         'bitrate': int(mp3.info.bitrate/1000)}
    all_res.append(d)
    print(d)

    if last_dir != song_path.parent:
        print(song_path)
        im = get_album_art(tags)
        plot_image(im)
        # plt.close()
        last_dir = song_path.parent
    d['image'] = im
            
df = pd.DataFrame(all_res)
df.to_csv('psyscores.csv')
print(df)

df = df.sort_values('album').reset_index(drop=True)
df_grouped = df.groupby(['album_artist', 'album']).agg({'date':'first', 'image':'first', 'rating': 'mean'})
df_sorted = df_grouped.sort_values(by='rating', ascending=False).reset_index()
df_sorted['rank'] = df_sorted['rating'].rank(method='dense', ascending=False).astype(int)


for i, (idx, row) in enumerate(df_sorted.iterrows()):
    im = row['image']
    im = im.resize((200,200), Image.LANCZOS)
    im.save(f'cover_art/{i}.jpg', format='jpeg', optimize=True, quality=70, progressive=True)
    print(row)

with open('index.html', 'w+') as f:
    f.write("""<html>
<head>
<title>nx1.info | Psyscores</title>
<link rel="icon" type="image/x-icon" href="../favicon.png">
<link rel="stylesheet" type="text/css" href="../style.css">
<style>
.image-wrapper {
      width: 90vw; /* 90% of the viewport width */
      margin: 0 auto; /* center horizontally */
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      align-items: center;
}
.image-container{
         position: relative;
         display: inline-block;
 		padding:0;
 		margin:0;
}
.image-container img {
         display: block;
         border-radius: 4px;
         transition: transform 0.2s;
}
.image-container img:hover {
    transform: scale(1.1);
}
.full-size-image {
     display: none;
     position: absolute;
     top: 0;
     left: 50%;
     transform: translateX(-50%);
     max-width: 90vw;
     z-index: 10;
     border: 5px solid #000;
     background-color: #000; /* fallback for 'none' */
     padding: 0;
     margin: 0;
     box-shadow: 0 0 20px #000;
}
.image-container:hover .full-size-image{
         display: block;
}
</style>
</head>
<body>
<pre>
<h1>nx1.info | Psyscores</h1>

5 star Dupes are 1 star, ambient is 1 star (which can be good), full-on and or darkpsy usually get 2 stars.
</pre>
""")
    f.write('<div class="image-wrapper">\n')
    for i, (idx, row) in enumerate(df_sorted.iterrows()):
        #l = f'<a href="#{i}"<div class="image-container"><img src="./cover_art/{i}.jpg" height=75 width=75><div class="full-size-image"><img src="./cover_art/{i}.jpg"></div></div></a>'
       l = f'<div class="image-container"><img src="./cover_art/{i}.jpg" height=75 width=75><div class="full-size-image"><img src="./cover_art/{i}.jpg"></div></div>'
       print(l)
       f.write(l+'\n')
    f.write('</div>\n')
    f.write('<pre>\n')
    f.write('Album Rankings\n')
    f.write('==============\n')
    for i, r in df_sorted.iterrows():
       l = f'{r["rank"]:<2} {r["album_artist"]:<38} {r["album"]:<55} {r["date"]:<5} {r["rating"]:.2f}'
       f.write(l+'\n')
    f.write('\n\n\n\n')
    f.write('Stats\n')
    f.write('=====\n')
    f.write(str(df['rating'].value_counts().sort_index()))
    f.write('\n')
    f.write(str(df['date'].value_counts().sort_index()))
    f.write('\n\n\n\n')
    f.write('Track Rankings\n')
    f.write('==============\n')
    
    for i, r in df.iterrows():
        l = f'{r["artist"]:<39} {r["title"]:<70} {r["album"]:<56} {r["date"]:<5} {r["rating"]:<2} {r["bitrate"]}</div>'
        print(l)
        f.write(l+'\n')
    f.write("""
<hr>
<div id="clock" onload="currentTime()"></div>
<script type="text/javascript" src="../clock.js"></script>
</pre>
</body>
</html>""")
