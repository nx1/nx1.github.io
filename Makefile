.PHONY: all psyscores art test

all: psyscores

psyscores:
	$(MAKE) -C psyscores psyscores

art:
	$(MAKE) -C psyscores art

test:
	$(MAKE) -C psyscores test
