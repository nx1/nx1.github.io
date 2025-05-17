import numpy as np
import pandas as pd
import ast 

from make_proghouse import trim_str, colorize

df = pd.read_csv('psyprog.csv')
df['have'] = df['community'].apply(lambda s: ast.literal_eval(s)['have'])
df['want'] = df['community'].apply(lambda s: ast.literal_eval(s)['want'])
df['ratio'] = df['have'] / df['want']
df['ratio'] = df['ratio'].replace([np.inf, -np.inf], 0).fillna(0)
df = df.sort_values(['year', 'have'], ascending=[True, False])

min_have, max_have = 0, 50
min_want, max_want = 0, 50
min_ratio, max_ratio = 0, 1


cols = ['country', 'year', 'format', 'label', 'type', 'genre', 'style', 'id', 'barcode', 'user_data', 'master_id', 'master_url', 'uri', 'catno', 'title', 'thumb', 'cover_image', 'resource_url', 'community', 'format_quantity', 'formats']

lines = []
ly = None 
for i, r in df.iterrows():
    if ly!=r["year"] and ly!=None:
        lines.append('')

    print(r)
    h_color     = colorize(r['have'], min_have, max_have)
    w_color     = colorize(r['want'], min_want, max_want)
    ratio_color = colorize(r['ratio'], min_ratio, max_ratio)
    
    # Get Label
    l_max = 35
    n_lab  = len(r["label"].split(',')) - 1
    to_append = f'(+{n_lab})'
    lab    = r["label"].split(',')[0][2:-1]
    labstr = f'{lab}'
    labstr = trim_str(labstr, l_max - len(to_append)-4)
    labstr = f'{labstr} {to_append}'

    # Get Title
    t_max = 100
    t_str = trim_str(r['title'], t_max)

    # Get catno 
    c_max = 10
    c_str = r['catno']
    c_str = trim_str(c_str, c_max)
    
    img = f'<img src="{r["thumb"]}" width="16" height="16">'
    l = (
        f'{img} <a href="https://www.discogs.com{r["uri"]}">{r["year"]} - '
        f'[{c_str:<{c_max}}] - {t_str:<{t_max}} - {labstr:<{l_max}}</a>'
        f'have=<span style="color:{h_color}">{r["have"]:<4}</span> '
        f'want=<span style="color:{w_color}">{r["want"]:<4}</span> '
        f'ratio=<span style="color:{ratio_color}">{r["ratio"]:.2f}</span> {r["country"]:<15} {r["format"]}'
    )

    lines.append(l)

    ly = r["year"]



with open('psyprog.html', 'w+') as f:
    f.write("""
<html>
<head>
    <title>nx1.info | Psy-Trance,Progressive Trance Compilations 2000-2009</title>
    <link rel="icon" type="image/x-icon" href="../favicon.png">
	<link rel="stylesheet" type="text/css" href="../style.css">
<style>
        .image-container{
                position: relative;
                display: inline-block;
				padding:0;
				margin:0;
        }
        .full-size-image{
                display: none;
                position: absolute;
                top: 0;
                left: 200px;
                z-index: 10;
                border: 5px solid #ddd;
                background-color: none;
                padding:0px;
				margin:0;
        }
        .image-container:hover .full-size-image{
                display: block;
        }
     </style>
</head>

<body>
<pre>
<h1>nx1.info | Psy-Trance,Progressive Trance Compilations 2000-2009</h1>

""")
    for l in lines:
        f.write(l+'\n')
    f.write("""
<hr>
<div id="clock" onload="currentTime()"></div>
<script type="text/javascript" src="../clock.js"></script>
</pre>
</body>
</html>""")
