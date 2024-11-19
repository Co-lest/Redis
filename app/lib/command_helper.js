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
const validateStreamEntry = (streamKey, id) => {
  if (id <= "0-0")
    return "-ERR The ID specified in XADD must be greater than 0-0\r\n";
  else {
    const lastAddedId = cache[streamKey]["lastAddedId"];
    // console.log(`Last added ${lastAddedId} and current id ${id}`, id <= lastAddedId)
    if (id <= lastAddedId)
      return "-ERR The ID specified in XADD is equal or smaller than the target stream top item\r\n";
  }
  return "valid";
};

/**
 * @param {string} command - Command that is requesting the stream
 * @param {string} streamKey
 * @param {string} range1 - Starting range
 * @param {string} range2 - Ending range
 * @returns {array} Multi dimentional array containing values of a stream key.
 * */
const getStreamWithInRange = (
  command,
  streamKey,
  range1,
  range2 = "99999999999999-9",
) => {
  const entries = [];

  Object.keys(cache[streamKey]).forEach((id) => {
    if (
      (id > range1 || (command === "xrange" && id >= range1)) &&
      id <= range2
    ) {
      const subObj = cache[streamKey][id];
      const subArr = [];
      Object.keys(subObj).forEach((key) => {
        subArr.push(key);
        subArr.push(subObj[key]);
      });
      const entry = [id, subArr];
      entries.push(entry);
    }
  });

  return entries;
};

/**
 * Blocks execution of xread command until spacifed amount.
 * @param {int} delay
 * */
const blockXread = async (delay) => {
  if (delay === 0) {
    console.log("Blocking xread until receiving a new stream");
    serverInfo.xreadWaiting = true;
    await new Promise(async (r) => {
      while (true) {
        await sleep(100);
        if ((serverInfo.xreadWaiting === false)) {
          console.log("Got a new stream continuing xread execution");
          r();
          break;
        }
      }
    });
  } else {
    await sleep(delay);
  }
};

module.exports = {
  validateStreamEntry,
  generateStreamSequence,
  getStreamWithInRange,
  blockXread,
};
