const { redisMagic, codes } = require('./data.js');

function handleLengthEncoding(data, cursor) {
	const byte = data[cursor];
	const lengthType = (byte & 0b11000000) >> 6;
	const lengthValues = [
		[byte & 0b00111111, cursor + 1],
		[((byte & 0b00111111) << 8) | data[cursor + 1], cursor + 2],
		[data.readUInt32BE(cursor + 1), cursor + 5],
	];
	return (
		lengthValues[lengthType] || new Error(`Invalid length encoding ${lengthType} at ${cursor}`)
	);
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
