from pathlib import Path
from glob import glob

path = Path('/mnt/c/Users/norma/Documents/Books/ebooks')
files = list(path.glob('*'))

ignore = ['.git']
for f in files:
    stem = f.stem
    if stem in ignore:
        continue

    pdf_files = list(f.glob('*.pdf'))
    print(f.stem)

    for f  in pdf_files:
        print(f.stem)
    print('')

