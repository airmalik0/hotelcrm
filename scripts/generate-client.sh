#! /usr/bin/env bash

set -e
set -x

# Generate OpenAPI schema directly in frontend directory
cd backend
uv run python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > ../frontend/openapi.json

# Generate TypeScript client
cd ../frontend
npm run generate-client
npx biome format --write ./src/client
