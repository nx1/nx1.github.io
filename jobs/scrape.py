import csv
from jobspy import scrape_jobs

df = scrape_jobs(
    site_name=["indeed", "linkedin", "glassdoor", "google"],
    search_term="Data Scientist",
    google_search_term="Data Scientist",
    location="E2 8SG",
    distance = 10,
    results_wanted=200,
    # hours_old=24*7,
    country_indeed='UK',
    verbose=1,
    # linkedin_fetch_description=True # gets more info such as description, direct job url (slower)
    # proxies=["208.195.175.46:65095", "208.195.175.45:65095", "localhost"],
)
print(f"Found {len(df)} jobs")
print(df)
df.to_csv("jobs.csv", quoting=csv.QUOTE_NONNUMERIC, escapechar="\\", index=False) # to_excel
