/**
 * Builder modules index
 * 
 * Re-exports all builder modules for convenient access
 */

const paths = require('./paths');
const parameters = require('./parameters');
const responses = require('./responses');

module.exports = {
    ...paths,
    ...parameters,
    ...responses
};