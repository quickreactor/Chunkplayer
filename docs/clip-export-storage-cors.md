# Clip export storage CORS

Mediabunny reads only the MP4 ranges it needs. The video-storage CORS rule must
allow browser range requests and expose the range response metadata.

The existing `chunkplayer` Backblaze bucket rules retain their current download
origins and operations. On 18 August 2026, the following value was added to both
the native B2 and S3 download rules:

```json
"exposeHeaders": ["content-length", "content-range", "accept-ranges"]
```

If the bucket is later restricted to named origins, retain at least the
following equivalent rule (adjust the development ports if Live Server uses a
different one):

```json
[
  {
    "corsRuleName": "chunkplayer-browser-video",
    "allowedOrigins": [
      "https://chunkplayer.barnaby.tv",
      "https://quickreactor.github.io",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    "allowedHeaders": ["Range"],
    "allowedOperations": [
      "b2_download_file_by_id",
      "b2_download_file_by_name"
    ],
    "exposeHeaders": [
      "Content-Length",
      "Content-Range",
      "Accept-Ranges"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Expected verification response for a chunk request containing
`Range: bytes=0-0`:

- Status `206 Partial Content`
- `Access-Control-Allow-Origin` matching the requesting frontend
- `Content-Range: bytes 0-0/<file-size>`
- `Accept-Ranges: bytes`
- `Access-Control-Expose-Headers` containing `Content-Length`, `Content-Range`,
  and `Accept-Ranges`

This is storage configuration only. The clip exporter adds no Worker endpoint
and requires no weaker Worker origin policy.
