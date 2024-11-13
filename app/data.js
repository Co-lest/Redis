const redisMagic = {
    redisMagicString: 5,
    redisMagicVersion: 4,
}

const codes = {
    EOF: 0xff,
	SELECTDB: 0xfe,
	EXPIRETIME: 0xfd,
	EXPIRETIMEMS: 0xfc,
	RESIZEDB: 0xfb,
	AUX: 0xfa,
}

module.exports = {
    redisMagic,
    codes,
}