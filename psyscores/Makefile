.PHONY: all psyscores art test samples

all: psyscores

psyscores:
	python3 make_psyscores.py

art:
	python3 build_art_assets.py

samples:
	python3 generate_samples.py

test:
	pytest test_art.py
	node test_mosaic_engine.js
