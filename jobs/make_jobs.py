from datetime import datetime
import pandas as pd 

df = pd.read_csv('jobs.csv')
print(df.columns)
"""
'id', 'site', 'job_url', 'job_url_direct', 'title', 'company',          
'location', 'date_posted', 'job_type', 'salary_source', 'interval',     
'min_amount', 'max_amount', 'currency', 'is_remote', 'job_level',       
'job_function', 'listing_type', 'emails', 'description',                
'company_industry', 'company_url', 'company_logo', 'company_url_direct',
'company_addresses', 'company_num_employees', 'company_revenue',        
'company_description'],                                                 
"""


locs = [
    # Core locations
    'London', 'England', 'UK', 'United Kingdom', 'Hackney',

    # Areas around Hackney
    'Dalston', 'Clapton', 'Homerton', 'Stoke Newington', 'Shoreditch',
    'Haggerston', 'Bethnal Green', 'Islington', 'De Beauvoir Town',
    'Hoxton', 'Bow', 'Victoria Park', 'Finsbury Park', 'Lower Clapton',
    'Upper Clapton', 'Leyton', 'Hackney Wick', 'Stratford', 'Walthamstow',

    # Central London
    'City of London', 'Westminster', 'Soho', 'Covent Garden', 'Mayfair',
    'Fitzrovia', 'Bloomsbury', 'Holborn', 'South Bank', 'Waterloo',
    'Marylebone', 'King’s Cross', 'Clerkenwell', 'Bermondsey',

    # West London
    'Notting Hill', 'Kensington', 'Chelsea', 'Hammersmith', 'Fulham',
    'Shepherd’s Bush', 'Earl’s Court', 'Paddington', 'Bayswater',

    # South London
    'Brixton', 'Clapham', 'Peckham', 'Dulwich', 'Greenwich', 'Lewisham',
    'Camberwell', 'Elephant and Castle', 'Battersea',

    # North London
    'Camden', 'Hampstead', 'Highgate', 'Muswell Hill', 'Kentish Town',
    'Hornsey', 'Crouch End',

    # East London (wider)
    'Canary Wharf', 'Poplar', 'Canning Town', 'Plaistow', 'Forest Gate',
    'East Ham', 'West Ham', 'Ilford', 'Dagenham'
]

df['is_junior'] = df['title'].str.contains('junior|intern|internship|Junior', case=False)
df['is_senior'] = df['title'].str.contains('senior|lead|head', case=False)


lines = []
junior_jobs = []
senior_jobs = []
other_jobs = []

max_ts = 75# df['title'].str.len().max()
max_c = 40#df['company'].str.len().max()
max_l = 25

def trim_str(string, max_len):
    if isinstance(string, float):
        return ''
    if len(string) > max_len:
        return string[:max_len - 3] + '...'
    return string


for i, r in df.iterrows():
    try:
        if not any(l in r["location"] for l in locs):
            continue
    except:
        continue

    ts = r["title"]
    c  = r["company"]
    l  = r["location"]
    ts = trim_str(ts, max_ts)
    c  = trim_str(c, max_c)
    l  = trim_str(l, max_l)

    job_line = f'<a href="{r["job_url"]}" style="color: {"green" if r["is_junior"] else "red" if r["is_senior"] else "white"};">{ts:<{max_ts}} {c:<{max_c}} {l:<{max_l}} {r["field"]:<20}{r["site"]}</a>'

    if r["is_junior"]:
        junior_jobs.append(job_line)
    elif r["is_senior"]:
        senior_jobs.append(job_line)
    else:
        other_jobs.append(job_line)

# Combine the jobs in the correct order
lines = junior_jobs + other_jobs + senior_jobs

with open('index.html', 'w+') as f:
    f.write('<html>\n')                                                          
    f.write('<head>\n')                                                          
    f.write('<title>nx1.info | Jobs</title>\n')                              
    f.write('<link rel="icon" type="image/x-icon" href="../favicon.png">\n') 
    f.write('<link rel="stylesheet" type="text/css" href="../style.css">\n') 
    f.write('</head>\n')                                                         
    f.write('<body>\n')                                                          
    f.write('<pre>\n')                                                           
    f.write('<h1>nx1.info | Jobs</h1>\n\n')                                      
    f.write(f'Last updated: {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}\n')
    f.write('<a href="https://www.timeshighereducation.com/unijobs/listings/london-greater-/">University & Academic Jobs in London (Greater)</a>\n')
    f.write('<a href="https://www.jobs.ac.uk/categories/london-jobs/1">jobs.ac.uk</a>\n')
    f.write('<a href="https://aas.org/jobregister">AAS Job Register</a>\n')
    f.write('<a href="https://app.welcometothejungle.com/">WTTJ</a>\n')
    f.write('<a href="https://www.unlistedjobs.com/">Unlisted Jobs</a>\n')
    f.write('<h3>Jobs:</h3>\n')                                                           
    for l in lines:
        f.write(l + '\n')
    f.write('<hr>\n')
    f.write('<div id="clock" onload="currentTime()"></div>\n')
    f.write('<script type="text/javascript" src="../clock.js"></script>\n')
    f.write('</pre>\n')
    f.write('</body>\n')
    f.write('</html>\n')

print('File written to: index.html')
print(df)

