import requests
import pandas as pd
from discogs import Discogs 
from concurrent.futures import ThreadPoolExecutor

def scrape(**kwargs):
    import time
    import random
    d = kwargs['discogs']
    releases = []
    
    # Fetch first page to get total number of pages with retry logic
    max_retries = 5
    first_response = None
    for attempt in range(max_retries):
        first_response = d.query(page=1,
                                style=kwargs['style'],
                                format=kwargs['format'],
                                year=kwargs['year'],
                                sort=kwargs['sort'],
                                sort_order=kwargs['sort_order'],
                                per_page=kwargs['per_page']
                                )
        if first_response.status_code == 200:
            break
        elif first_response.status_code == 429:
            wait_time = (2 ** attempt) + random.uniform(10, 20)
            print(f"Rate limited on initial request, waiting {wait_time:.1f}s (attempt {attempt+1}/{max_retries})...")
            time.sleep(wait_time)
        else:
            print(f"Failed to retrieve data on page 1, status code: {first_response.status_code}")
            return

    if not first_response or first_response.status_code != 200:
        print(f"Exceeded max retries for initial page request.")
        return

    data = first_response.json()
    results = data.get("results", [])
    releases.extend(results)
    
    pagination = data.get("pagination", {})
    total_pages = pagination.get("pages", 1)
    print(f"Page 1 of {total_pages} processed.")
    
    if total_pages > 1:
        def fetch_page(page_num):
            import time
            import random
            max_retries = 5
            for attempt in range(max_retries):
                # Pacing: ensure we don't hit the 60 req/min limit too fast
                # With 2 workers, sleeping ~2.1s per request keeps us around 57 req/min
                time.sleep(2.1 + random.uniform(0, 0.5))
                
                resp = d.query(page=page_num,
                               style=kwargs['style'],
                               format=kwargs['format'],
                               year=kwargs['year'],
                               sort=kwargs['sort'],
                               sort_order=kwargs['sort_order'],
                               per_page=kwargs['per_page']
                               )
                if resp.status_code == 200:
                    page_data = resp.json()
                    print(f"Page {page_num} of {total_pages} processed.")
                    return page_data.get("results", [])
                elif resp.status_code == 429:
                    # Exponential backoff on rate limit
                    wait_time = (2 ** attempt) + random.uniform(5, 10)
                    print(f"Rate limited on page {page_num}, waiting {wait_time:.1f}s (attempt {attempt+1}/{max_retries})...")
                    time.sleep(wait_time)
                else:
                    print(f"Failed to retrieve data on page {page_num}, status code: {resp.status_code}")
                    return []
            print(f"Exceeded max retries for page {page_num}")
            return []

        # Using a thread pool to fetch remaining pages in parallel
        # 2 workers with ~2s delay each is safe for the 60req/min limit
        with ThreadPoolExecutor(max_workers=2) as executor:
            # Fetch from page 2 to total_pages
            page_results = list(executor.map(fetch_page, range(2, total_pages + 1)))
            
        for res in page_results:
            releases.extend(res)
    
    df = pd.DataFrame(releases)
    filename = kwargs['filename']
    df.to_csv(filename, index=False)
    print(f"Saved {len(releases)} releases to {filename}")


if __name__ == "__main__":
    import time
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

    print("Waiting 10s between scrape jobs to respect rate limits...")
    time.sleep(10)

    scrape(discogs=d,
           style="Progressive House",
           format="Vinyl",
           year="2000-2009",
           sort="have",
           sort_order="desc",
           per_page=200,
           filename='proghouse.csv')
