class AppError extends Error {
    constructor(message, statusCode = 406) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation Error') {
        super(message, 406);
    }
}

module.exports = {
    AppError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ValidationError
};