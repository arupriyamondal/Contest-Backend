const errorMiddleware = (err, req, res, next) => {

    

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        statusCode: statusCode,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
        data: null
    });
};

export default errorMiddleware;