// Symbol-keyed so capture data rides along on a recommendation result without being
// serialised into the API response (JSON.stringify ignores symbol keys).
module.exports = { CAPTURE: Symbol('recommendationCapture') };
