import requests
import pandas as pd
from discogs import Discogs 

def scrape(**kwargs):
    releases = []
    page = 1
    
    while True:
        d.query(page=page,
                style=kwargs['style'],
                format=kwargs['format'],
                year=kwargs['year'],
                sort=kwargs['sort'],
                sort_order=kwargs['sort_order'],
                per_page=kwargs['per_page']
                )
        
        response = d.response
        if response.status_code != 200:
            print(f"Failed to retrieve data on page {page}, status code: {d.response.status_code}")
            break
        
        data = response.json()
        results = data.get("results", [])
        if not results:
            break
        
        for item in results:
            releases.append(item)
        
        pagination   = data.get("pagination", {})
        current_page = pagination.get("page", page)
        total_pages  = pagination.get("pages", page)
        print(f"Page {current_page} of {total_pages} processed.")
        
        if current_page >= total_pages:
            break
        
        page += 1
    
    
    df = pd.DataFrame(releases)

    filename = kwargs['filename']
    df.to_csv(filename, index=False)
    print(f"Saved {len(releases)} releases to {filename}")


DISCOGS_TOKEN = "lJDcuYISVbWSuzzUScAcGJbUxpmhPbqshwQrnuPv"
d = Discogs(token=DISCOGS_TOKEN)
scrape(discogs=d,
       style="Psy-Trance,Progressive Trance",
       format="Compilation",
       year="2000-2009",
       sort="have",
       sort_order="desc",
       per_page=200,
       filename='psyprog.csv')

scrape(discogs=d,
       style="Progressive House",
       format="Vinyl",
       year="2000-2009",
       sort="have",
       sort_order="desc",
       per_page=200,
       filename='proghouse.csv')

