# kushkoirala.github.io

This repository hosts a static HTML page that can be served locally or in a container.

## Containerized local preview

You can serve the site with the open-source Docker Engine:

1. Build the container image:
   ```bash
   docker build -t kushkoirala-site .
   ```
2. Run the container and map port 80 to your host (for example, port 8080):
   ```bash
   docker run --rm -p 8080:80 kushkoirala-site
   ```
3. Open `http://localhost:8080` in your browser to view the page.

## Without Docker

You can also preview the site with any static file server. For example, with Python:

```bash
python -m http.server
```

Then navigate to `http://localhost:8000`.
