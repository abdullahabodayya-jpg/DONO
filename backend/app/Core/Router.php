<?php

declare(strict_types=1);

final class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler):void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, callable $handler):void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function put(string $path, callable $handler):void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function patch(string $path, callable $handler):void
    {
        $this->addRoute('PATCH', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    private function addRoute(
        string $method,
        string $path,
        callable $handler
    ): void {
        $this->routes[$method][$path] = $handler;
    }

    public function dispatch(string $method, string $path): void
    {
        $routes = $this->routes[$method] ?? [];
        error_log("DEBUG METHOD: " . $method);
        error_log("DEBUG PATH: " . $path);
        
        if (isset($routes[$path])) {
            ($routes[$path])();
            return;
        }

        
        foreach ($routes as $routePath => $handler) {
            $segments = explode('/', trim($routePath, '/'));
            $regexSegments = [];

            foreach ($segments as $segment) {
                if (
                    preg_match(
                        '/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/',
                        $segment,
                        $parameter
                    ) === 1
                ) {
                    $regexSegments[] =
                        '(?P<' . $parameter[1] . '>[^/]+)';
                } else {
                    $regexSegments[] = preg_quote($segment, '#');
                }
            }

            $regex = '#^/' . implode('/', $regexSegments) . '$#';

            if (preg_match($regex, $path, $matches) === 1) {
                $parameters = [];

                foreach ($matches as $key => $value) {
                    if (is_string($key)) {
                        $parameters[] = $value;
                    }
                }

                $handler(...$parameters);
                return;
            }
        }

        http_response_code(404);

        echo json_encode([
            'success' => false,
            'message' => 'Route not found.',
            'data' => null,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
}
