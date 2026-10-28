# DONO API Contract

## 1. Base URL

http://localhost/dono/backend/public/api

## 2. Standard Response Format

### Success

{
  "success": true,
  "message": "Request successful.",
  "data": {}
}

### Error

{
  "success": false,
  "message": "Request failed.",
  "data": null
}

## 3. HTTP Methods

| Method | Purpose |
|---|---|
| GET | Retrieve data |
| POST | Create a resource or perform an action |
| PUT | Replace/update a resource |
| PATCH | Partially update a resource |
| DELETE | Delete a resource |

## 4. Existing Endpoint

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health | Check API and database connection |

## 4.1  Health Check
Endpoint: /api/health

Method: GET

Request Body: None

Purpose: Verifies that the API can connect to the database.

## Success Response — HTTP 200

{
  "success": true,
  "message": "DONO API is runnung.",
  "data": {
    "database": "connected"
  }
}

The message above reflects the current backend code, including its existing spelling.

## Possible Error Responses

- HTTP 404: Route not found.

- HTTP 500: Internal server error, including database connection failures.

Error response examples:

{
  "success": false,
  "message": "Route not found."
}

{
  "success": false,
  "message": "Internal server error."
}

## 5. Frontend Integration

- Use the shared `api.js` service for API requests.
- Handle errors using `try/catch`.
- Use paths relative to the configured API_BASE_URL.
- Do not assume an endpoint exists until it is implemented.
- Successful responses are returned as parsed JSON.
- Failed HTTP responses or responses where success !== true throw an error containing the response status and, when available, response data.

import { api } from './assets/js/services/api.js';

try {
    const result = await api.get('/health');
    console.log(result);
} catch (error) {
    console.error(error.message);
}

## 6. Rules

- Validate incoming data in the backend.
- Never trust frontend-provided prices, totals, roles, or payment statuses.
- Document each endpoint's request fields, response format, HTTP status codes, and required permissions.
- Use prepared statements for database queries involving user-provided values.
- Do not expose internal exception details in API responses.