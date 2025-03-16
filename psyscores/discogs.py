import requests

class Discogs:
    def __init__(self, **kwargs):
        self.base_url = 'https://api.discogs.com/database/search'
        self.token = kwargs['token']
        self.response = None

    @property
    def headers(self):
        headers = {"User-Agent": "DiscogsAPI/1.0"}
        return headers

    def query(self, **kwargs):
        params = { 
            "token"     : self.token,
            "style"     : kwargs.get("style"),
            "format"    : kwargs.get("format"),
            "year"      : kwargs.get("year"),
            "sort"      : kwargs.get("sort"),
            "sort_order": kwargs.get("sort_order"),
            "page"      : kwargs.get("page") ,
            "per_page"  : kwargs.get("per_page"),
        }
        self.response = requests.get(self.base_url,
                                     headers=self.headers,
                                     params=params)

    @property
    def json(self):
        return self.response.json()

if __name__ == "__main__":
    DISCOGS_TOKEN = "lJDcuYISVbWSuzzUScAcGJbUxpmhPbqshwQrnuPv"
    d = Discogs(token=DISCOGS_TOKEN)
    d.query(
       style="Psy-Trance,Progressive Trance",
       format="Compilation",
       year="2000-2009",
       sort="have",
       sort_order="desc",
       page=1,
       per_page=200,
       )
    print(d.response)
