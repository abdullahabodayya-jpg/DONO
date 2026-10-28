<?php

declare(strict_types=1);

final class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void
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
    public function delete(string $path, callable $handler):void
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
        $handler =  $this->routes[$method][$path] ?? null;

        if ($handler === null) {
            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Route not found.',
            ]);

            return;
        }

        $handler();
    }



}