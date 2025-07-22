const { AppError } = require('../utils/AppError');

const errorMiddleware = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message
        });
    }

    console.error('UNEXPECTED ERROR:', err);
    res.status(500).json({
        success: false,
        status: 'error',
        message: 'Something went wrong!'
    });
};

module.exports = errorMiddleware;