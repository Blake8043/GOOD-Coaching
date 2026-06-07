const crypto = require("crypto");

function createOrderNumber(prefix = "PBC") {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

module.exports = { createOrderNumber };
