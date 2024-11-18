const fs = require("fs");
const { serverConf } = require("../global_cache/server_conf");
const { cache, expiry } = require("../global_cache/cache");

/**
 * Reads rdb binary file and stores key value pairs in cache.
 * */
const readRdbFile = () => {
  const opCodes = {
    resizeDb: "fb",
    miliExp: "fc",
    eof: "ff",
  };
  let i = 0;
  const dirName = serverConf.rdb_dir;
  const fileName = serverConf.rdb_file;
  const filePath = dirName + "/" + fileName;
  let dataBuffer;
  try {
    dataBuffer = fs.readFileSync(filePath);
  } catch (e) {
    console.log("Error:", e);
    return;
  }
  console.log("Hex data:", dataBuffer.toString("hex"));

  /**
   * @param {int} n - No. Of bytes to get
   * @returns {Buffer} - Next n bytes
   * */
  const getNextNBytes = (n) => {
    let nextNBytes = Buffer.alloc(n);

    for (let k = 0; k < n; k++) {
      nextNBytes[k] = dataBuffer[i];
      i++;
    }

    return nextNBytes;
  };

  const getNextObjLength = () => {
    const firstByte = dataBuffer[i];
    const twoBits = firstByte >> 6;
    let length = 0;
    switch (twoBits) {
      case 0b00:
        length = firstByte ^ 0b00000000;
        i++;
        break;
    }
    return Number(length);
  };

  const getKeyValues = (n) => {
    let expiryTime = "";
    for (let j = 0; j < n; j++) {
      if (dataBuffer[i].toString(16) === opCodes.miliExp) {
        i++;
        expiryTime = dataBuffer.readBigUInt64LE(i);
        i += 8;
        console.log("expiryTime:", expiryTime);
      }
      // console.log("Current buf in hex:",dataBuffer[i].toString(16))
      if (dataBuffer[i].toString(16) === "0") {
        i++; // Skip 00 padding.
      }
      const keyLength = getNextObjLength();
      const key = getNextNBytes(keyLength).toString();
      const valueLength = getNextObjLength();
      const value = getNextNBytes(valueLength).toString();
      console.log(`Setting ${key} to ${value}`);
      cache[key] = value;
      if (expiryTime) {
        expiry[key] = expiryTime;
      }
    }
  };

  const resizeDb = () => {
    console.log("Inside resizedb");
    i++;
    const totalKeyVal = getNextObjLength();
    console.log("Total keyval:", totalKeyVal);
    const totalExpiry = getNextObjLength();
    if (totalExpiry === 0) i++; // There is 00 padding.

    getKeyValues(totalKeyVal);
  };

  while (i < dataBuffer.length) {
    const currentHexByte = dataBuffer[i].toString(16);
    if (currentHexByte === opCodes.resizeDb) {
      console.log("currentHexByte:", currentHexByte);
      resizeDb();
    }
		else if (currentHexByte === opCodes.eof) {
      console.log("Breaking reading rdb buffer");
      break;
    } else {
			i++;
		}
  }

  return null;
};

module.exports = { readRdbFile };
