const API_BASE_URL = new URL('../../../../backend/public/api', import.meta.url).pathname;

async function request(endpoint, options ={}) {
    const {
         method = 'GET',
         body,
         headers = {}, 
    } = options;

    const requestHeaders = {
        Accept: 'application/json',
        ...headers,
    };

    const config = {
        method,
        headers: requestHeaders,
    };

    if (body !== undefined) {
        if (body instanceof FormData) {
            config.body = body;
        } else {
            requestHeaders['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);

        }
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        config
    );

    let result;

    try {
        result = await response.json();

    } catch {
        throw new Error(
            `Invalid API response (HTTP ${response.status}).`
        );
    }

    if (!response.ok || result.success !== true){
        const error = new Error(
            result.message || 'API request failed.'
        );

        error.status = response.status;
        error.data = result.data ?? null;

        throw error;
    }

    return result
}

export const api = {
    get(endpoint) {
        return request(endpoint);
    },

    post(endpoint, body) {
        return request(endpoint, {
            method: 'POST',
            body,
        });
    },

    put(endpoint, body){
        return request(endpoint, {
            method: 'PUT',
            body,
        });
    },

    patch(endpoint, body) {
        return request(endpoint, {
            method: 'PATCH',
            body,
        });
    },

    delete(endpoint) {
        return request(endpoint, {
            method: 'DELETE',
        });
    },
}