const jwt = require("jsonwebtoken");

const generateToken = (payload, expiresIn = process.env.JWT_EXPIRIES || "24h") => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;