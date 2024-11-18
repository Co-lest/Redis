const { cache } = require("../global_cache/cache");
const { serverInfo } = require("../global_cache/server_info");
const { sleep } = require("./utils");

/**
 * Generated stream key id's sequence if it is not present.
 * @param {string} id
 * @param {string} streamKey
 * @returns id with sequence number attached to it.
 * */
const generateStreamSequence = (streamKey, id) => {
  const seqIndex = id.indexOf("*");
  if (seqIndex === -1) {
    return id;
  } else {
    // Get prefix of id till - Ex. id: 123456-*
    const idPrefix = id.substring(0, seqIndex - 1);
    const sequenceNumber = getSequenceNumber(idPrefix, streamKey);
    if (sequenceNumber === -1) {
      return idPrefix === "0" ? "0-1" : `${idPrefix}-0`;
    } else {
      console.log("sequence:", sequenceNumber, "prefix:", idPrefix);
      return `${idPrefix}-${sequenceNumber + 1}`;
    }
  }
};

/**
 * Get sequence number of a prefix from cache.
 * @param {string} prefix
 * @param {string} streamKey
 * */
const getSequenceNumber = (prefix, streamKey) => {
  const keys = Object.keys(cache[streamKey]);
  let sequenceNumber = -1;

  keys.forEach((key) => {
    const saperatorIndex = key.indexOf("-");
    const keyPrefix = key.substring(0, saperatorIndex);
    const postFix = key.substring(saperatorIndex + 1);
    if (keyPrefix === prefix) sequenceNumber = Number(postFix);
  });

  return sequenceNumber;
};

/**
 * Validates stream entry by comparing id's of current entry and
 * last added entry's id. Current id needs to be greater than last added entry.
 * @param {string} streamKey
 * @param {string} id
 * @returns {string} Whether the entry is valid or not
 * */

module.exports = {
  validateStreamEntry,
  generateStreamSequence,
  getStreamWithInRange,
  blockXread,
};
