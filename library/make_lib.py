import json
import re
from pathlib import Path

# Configuration
EBOOKS_DIR = Path('.')
JSON_FILE = Path('library.json')
HTML_FILE = Path('library.html')

# Folder to Category/Subcategory mapping for new files
FOLDER_MAPPING = {
    "Business & Economics": ("Business & Economics", None),
    "Computer Science": ("Science", "Computing & Programming"),
    "Fiction": ("Fiction", None),
    "Music": ("Music", None),
    "Non-Fiction": ("Non-Fiction", None),
    "Psychology & Self-Help": ("Neuroscience & Psychology", None),
    "Science & Maths": ("Science", "Physics, Astronomy & Mathematics")
}

def load_db():
    if JSON_FILE.exists():
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_db(db):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)

def normalize(text):
    if not text: return ""
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()

def parse_filename(filename):
    stem = Path(filename).stem
    # Try YEAR - TITLE - AUTHOR
    match = re.match(r'^(\d{4})\s*-\s*(.*?)\s*-\s*(.*)$', stem)
    if match:
        return match.group(1), match.group(2).strip(), match.group(3).strip()
    
    # Try YEAR - TITLE
    match = re.match(r'^(\d{4})\s*-\s*(.*)$', stem)
    if match:
        return match.group(1), match.group(2).strip(), None
    
    return None, stem, None

def sync_filesystem(db):
    # Map normalized titles to db items for easy lookup
    db_map = {normalize(item['title']): item for item in db}
    
    for folder, (cat, subcat) in FOLDER_MAPPING.items():
        folder_path = EBOOKS_DIR / folder
        if not folder_path.exists(): continue
            
        for file_path in folder_path.rglob('*'):
            if file_path.is_dir() or file_path.suffix.lower() not in ['.pdf', '.epub', '.mobi']:
                continue
            
            year, title, author = parse_filename(file_path.name)
            norm_title = normalize(title)
            
            if norm_title in db_map:
                item = db_map[norm_title]
                item['file_path'] = str(file_path.relative_to(EBOOKS_DIR))
                # Update year/author if they were missing but are now found in filename
                if item.get('year') in [None, 'Unknown'] and year: item['year'] = year
                if not item.get('author') and author: item['author'] = author
            else:
                new_item = {
                    "category": cat,
                    "subcategory": subcat,
                    "year": year or "Unknown",
                    "title": title,
                    "author": author,
                    "status": "unread",
                    "notes_url": None,
                    "file_path": str(file_path.relative_to(EBOOKS_DIR))
                }
                db.append(new_item)
                db_map[norm_title] = new_item
                print(f"Added new book: {title}")

def generate_html(db):
    # Sort: Category, Subcategory, Year, Title
    db.sort(key=lambda x: (
        x.get('category') or 'ZZZ', 
        x.get('subcategory') or '', 
        str(x.get('year') or '9999'), 
        x.get('title') or ''
    ))
    
    html_start = """<!DOCTYPE html>
<html>
<head>
    <title>nx1.info | Library</title>
    <link rel="icon" type="image/x-icon" href="favicon.png">
    <link rel="stylesheet" type="text/css" href="style.css">
	<meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        .red { color: #ff5555; }
        .yellow { color: #f1fa8c; }
        .green { color: #50fa7b; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
        a { color: inherit; text-decoration: none; }
        a:hover { text-decoration: underline; }
        h2 { border-bottom: 1px solid #444; margin-top: 2em; }
        h3 { color: #8be9fd; margin-top: 1.5em; }
    </style>
</head>
<body>
<pre>
<h1>nx1.info | Library</h1>"""

    html_end = """
<hr>
<div id="clock" onload="currentTime()"></div>
<script type="text/javascript" src="clock.js"></script>
</pre>
</body>
</html>"""

    content = []
    last_cat = None
    last_subcat = None
    
    for item in db:
        cat = item.get('category', 'Other')
        subcat = item.get('subcategory')
        
        if cat != last_cat:
            content.append(f"\n<h2>{cat}</h2>")
            last_cat = cat
            last_subcat = None
            
        if subcat != last_subcat and subcat:
            content.append(f"<h3>{subcat}</h3>")
            last_subcat = subcat

        year = item.get('year', 'Unknown')
        title = item.get('title', 'Unknown')
        author = item.get('author')
        status = item.get('status', 'unread')
        notes_url = item.get('notes_url')
        
        color_class = "red"
        if status == "started": color_class = "yellow"
        elif status == "completed": color_class = "green"
        
        display_title = title
        if notes_url:
            display_title = f'<a href="{notes_url}">{title}</a>'
            
        line = f'<span class="{color_class}">{year} - {display_title}'
        if author:
            line += f' - {author}'
        line += '</span>'
        
        content.append(line)

    full_html = html_start + "\n".join(content) + html_end
    
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(full_html)
    print(f"Generated {HTML_FILE}")

if __name__ == "__main__":
    db = load_db()
    sync_filesystem(db)
    save_db(db)
    generate_html(db)
