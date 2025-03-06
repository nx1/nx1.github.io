import csv
import pandas as pd
from jobspy import scrape_jobs

df1 = scrape_jobs(
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

df1.to_csv('jobs1.csv')

df2 = scrape_jobs(
    site_name=["indeed", "linkedin", "glassdoor", "google"],
    search_term="Data Engineer",
    google_search_term="Data Engineer",
    location="E2 8SG",
    distance = 10,
    results_wanted=200,
    # hours_old=24*7,
    country_indeed='UK',
    verbose=1,
    # linkedin_fetch_description=True # gets more info such as description, direct job url (slower)
    # proxies=["208.195.175.46:65095", "208.195.175.45:65095", "localhost"],
)

df2.to_csv('jobs1.csv')

df3 = scrape_jobs(
    site_name=["indeed", "linkedin", "glassdoor", "google"],
    search_term="Signal Processing",
    google_search_term="Signal Processing",
    location="E2 8SG",
    distance = 10,
    results_wanted=200,
    # hours_old=24*7,
    country_indeed='UK',
    verbose=1,
    # linkedin_fetch_description=True # gets more info such as description, direct job url (slower)
    # proxies=["208.195.175.46:65095", "208.195.175.45:65095", "localhost"],
)

df3.to_csv('jobs1.csv')


df1['field'] = 'Data Scientist'
df2['field'] = 'Data Engineer'
df3['field'] = 'Signal Processing'

df = pd.concat([df1,df2,df3])

print(f"Found {len(df)} jobs")
print(df)
df.to_csv("jobs.csv", quoting=csv.QUOTE_NONNUMERIC, escapechar="\\", index=False) # to_excel
