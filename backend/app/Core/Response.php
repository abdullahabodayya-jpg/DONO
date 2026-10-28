<?php

declare(strict_types=1);

final class Response 
{
    public static function success(
        string $message = 'Request successful.',
        mixed $data = null,
        int $statusCode = 200 
   ): never {
    self::send(true, $message, $data, $statusCode);
   }


   public static function send(
    bool $success,
    string $message, 
    mixed $data,
    int $statusCode
   ): never {

    http_response_code($statusCode);

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'=>$data,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
   exit;
   }

}