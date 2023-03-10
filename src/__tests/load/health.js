config:
  target: https://my.microservice.internal
  phases:
    - duration: 600
      arrivalRate: 10
  defaults:
    headers:
      x-api-key: "{{ $processEnvironment.SERVICE_API_KEY }}"
scenarios:
  - flow:
      - get:
          url: "/"