const cache = {};

const multi = {
	isMulti: false,
	commandQueue: [],
}

const expiry = {}; // Will store unix timestamp for expiry of a key from .rdb file

module.exports = { cache, expiry, multi };
