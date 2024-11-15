const { redisMagic, codes } = require('./data.js');

function handleLengthEncoding(data, cursor) {
  if (cursor >= data.length) {
    throw new RangeError(`Cursor out of bounds at ${cursor}`);
  }

  const byte = data[cursor];
  const lengthType = (byte & 0b11000000) >> 6;

  switch (lengthType) {
    case 0:
      return [byte & 0b00111111, cursor + 1]; // 6-bit length
    case 1:
      if (cursor + 1 >= data.length) throw new RangeError(`Cursor out of bounds at ${cursor + 1}`);
      return [((byte & 0b00111111) << 8) | data[cursor + 1], cursor + 2]; // 14-bit length
    case 2:
      if (cursor + 4 >= data.length) throw new RangeError(`Cursor out of bounds at ${cursor + 4}`);
      return [data.readUInt32BE(cursor + 1), cursor + 5]; // 32-bit length
    default:
      throw new Error(`Invalid length encoding type ${lengthType} at cursor ${cursor}`);
  }
}


function getKeysValues(data) {
  const { REDIS_MAGIC_STRING, REDIS_VERSION } = redisMagic;
  let cursor = REDIS_MAGIC_STRING + REDIS_VERSION;

  while (cursor < data.length) {
    if (data[cursor] === codes.SELECTDB) {
      cursor++; // Skip SELECTDB opcode
      continue;
    }

    cursor++;

    // Decode key length
    let keyLength;
    [keyLength, cursor] = handleLengthEncoding(data, cursor);

    // Extract key and trim unwanted characters
    const key = data.subarray(cursor, cursor + keyLength).toString().replace(/\x00|\t/g, "");
    console.log("Extracted key:", key);
    cursor += keyLength;

    // Decode value length
    let valueLength;
    [valueLength, cursor] = handleLengthEncoding(data, cursor);

    // Extract value (not used in `KEYS *` but extracted for completeness)
    const value = data.subarray(cursor, cursor + valueLength).toString();
    console.log("Extracted value:", value);
    cursor += valueLength;

    // Handle expiration time if present
    if (data[cursor] === codes.EXPIRETIME || data[cursor] === codes.EXPIRETIMEMS) {
      cursor++;
      cursor += 4; // Skip expiration timestamp
    }

    return [key, value];
  }

  throw new Error("Reached end of data without finding a key-value pair.");
}


module.exports = {
	getKeysValues,
};
