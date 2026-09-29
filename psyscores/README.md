# Psyscores & Psychedelic Mosaic Lab

Collection scoring, audio metadata extraction, and client-side album art mosaic generator for `nx1.info`.

## Quick Start Commands

```bash
# Update full collection and rebuild mosaic assets
make psyscores

# Rebuild only mosaic art assets (fast)
make art

# Run test suites (pytest + node)
make test

# Start local preview server
./run_local.sh 8000
```

## Documentation

For the complete technical architecture, mathematical foundations (CIE $L^*a^*b^*$, texture atlas packing, distance metrics), and GitHub Pages static hosting constraints, see:
* [/home/x1/nx1.github.io/psyscores/art/README.md](file:///home/x1/nx1.github.io/psyscores/art/README.md)
