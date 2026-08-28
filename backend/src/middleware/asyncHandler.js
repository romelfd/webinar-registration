// Wraps an async route handler so rejected promises are forwarded to
// Express's error-handling middleware instead of crashing the process.
// (Express 4 does not do this automatically — Express 5 fixes it natively.)
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
