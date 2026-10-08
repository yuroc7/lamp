/* Vendored QRCode by Kazuhiko Arase, copyright (c) 2009, MIT License.
 * Based on the MIT-licensed QR encoder shipped with qrcode-terminal.
 * Bundled locally so QR pairing works without a third-party CDN.
 */
(function(){
  if(window.Y7QRCode) return;
  var modules={};
  function define(name, factory){var m={exports:{}};factory(m,m.exports,function(k){return modules[k.replace(/^\.\//,'')];});modules[name]=m.exports;}

  define('QRMode',function(module,exports,require){
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

  });
  define('QRMath',function(module,exports,require){
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

  });
  define('QRMaskPattern',function(module,exports,require){
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

  });
  define('QRErrorCorrectLevel',function(module,exports,require){
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


  });
  define('QR8bitByte',function(module,exports,require){
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

  });
  define('QRBitBuffer',function(module,exports,require){
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

  });
  define('QRPolynomial',function(module,exports,require){
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

  });
  define('QRRSBlock',function(module,exports,require){
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

  });
  define('QRUtil',function(module,exports,require){
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

  });
  define('index',function(module,exports,require){
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

  });
  function Y7OfflineQRCode(element,options){
    options=typeof options==='string'?{text:options}:options||{};
    var target=element && element.jquery ? element[0] : element;
    if(!target) throw new Error('Y7 QR container missing');
    var text=String(options.text||'');if(!text)throw new Error('Y7 QR empty URL');
    var encoder=new modules.index(0,modules.QRErrorCorrectLevel.M);
    encoder.addData(text);encoder.make();
    var count=encoder.getModuleCount();
    var width=Math.max(160,Number(options.width)||240),height=Math.max(160,Number(options.height)||240);
    var size=Math.floor(Math.min(width,height)), cell=size/(count+8);
    var canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size;
    canvas.setAttribute('aria-label','Y7 QR');
    var ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas QR not available');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
    ctx.fillStyle='#111111';
    for(var row=0;row<count;row++)for(var col=0;col<count;col++){
      if(!encoder.isDark(row,col))continue;
      var x=Math.floor((col+4)*cell), y=Math.floor((row+4)*cell);
      var x2=Math.ceil((col+5)*cell),y2=Math.ceil((row+5)*cell);
      ctx.fillRect(x,y,x2-x,y2-y);
    }
    target.innerHTML='';target.appendChild(canvas);
    this._canvas=canvas;
  }
  Y7OfflineQRCode.CorrectLevel={L:1,M:0,Q:3,H:2};
  window.Y7QRCode=Y7OfflineQRCode;
  window.__Y7_OFFLINE_QR_AVAILABLE__=true;
})();

/*
 * Y7 Media for Lampa
 * File: 1.js
 * Version: 4.13.11
 *
 * Y7 Core pairing:
 *   QR -> Y7 Core -> Admin PIN -> unique per-TV token
 *
 * Public сервер URL is safe to embed; NO secret token is embedded here.
 */
/* Y7 bootstrap: securely cached client update, activated only after SHA-256 verification. */
(function(K2_HARD){
    var skip=false;
    function vt(v){var a=String(v||'0').match(/\d+/g)||[];return [+(a[0]||0),+(a[1]||0),+(a[2]||0),+(a[3]||0)];}
    function newer(a,b){a=vt(a);b=vt(b);for(var i=0;i<4;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return false;}
    try{
        var cv=localStorage.getItem('k2_client_cache_version')||'';
        var cc=localStorage.getItem('k2_client_cache_code')||'';
        if(cc&&newer(cv,K2_HARD)){(0,eval)(cc);skip=true;}
    }catch(e){}
    if(skip)return;
(function () {
    'use strict';

    var VERSION = '4.13.11';
    var COMPONENT = 'k2_plugin_manager';
    var DEFAULT_FUNNEL = 'https://02-108-prohidna.tail6cc3cf.ts.net';

    var MANAGED_KEY = 'k2pm_managed_urls_v3';
    var RESTART_KEY = 'k2pm_restart_needed';
    var FUNNEL_KEY = 'k2pm_secure_funnel';
    var CLIENT_TOKEN_KEY = 'k2pm_secure_token';
    var DEVICE_ID_KEY = 'k2pm_secure_device_id';
    var DEVICE_NAME_KEY = 'k2pm_secure_device_name';
    var LAMPAC_ON_KEY = 'k2pm_lampac_online';
    var SISI_ON_KEY = 'k2pm_lampac_sisi';
    var REGISTERED_ONLINE_KEY = 'k2pm_registered_lampac_online';
    var REGISTERED_SISI_KEY = 'k2pm_registered_lampac_sisi';
    var PROFILE_VERSION_KEY = 'k2pm_profile_version';
    var START_PAGE_KEY = 'k2pm_start_page';
    var IPTV_PRESET_KEY = 'k2pm_iptv_preset';
    var PROFILE_VERSION = 411;
    var HEALTH_CACHE_KEY = 'k2pm_plugin_health_v1';
    var HEALTH_AUTO_KEY = 'k2pm_plugin_health_auto';
    var HEALTH_TTL = 6 * 60 * 60 * 1000;
    var SYNC_ON_KEY = 'k2pm_lampac_sync';
    var REGISTERED_SYNC_KEY = 'k2pm_registered_lampac_sync';
    var KIDS_MODE_KEY = 'k2pm_kids_mode';
    var QUALITY_MIN_KEY = 'k2pm_quality_min';
    var QUALITY_UA_KEY = 'k2pm_quality_ua';
    var QUALITY_CAM_KEY = 'k2pm_quality_hide_cam';
    var QUALITY_WORKING_KEY = 'k2pm_quality_working';
    var UPDATE_CHANNEL_KEY = 'k2pm_update_channel';
    var EXTRA_PLUGINS_KEY = 'k2pm_extra_plugins';
    var HEALTH_FAIL_KEY = 'k2pm_health_fail_counts';
    var HEALTH_SUPPRESS_KEY = 'k2pm_health_suppressed';
    var TORR_LAST_KEY = 'k2pm_torr_last_ok';
    var KIDS_ADMIN_KEY = 'y7_kids_admin_config_v1';
    var KIDS_PREFS_KEY = 'y7_kids_prefs_v1';
    var ADULT_CLEANUP_KEY = 'y7_adult_cleanup_v47';
    var HEAD_REMOTE_INSTALLED = false;
    var HEARTBEAT_TIMER = null;
    var COMMAND_TIMER = null;
    var REMOTE_ADMIN_UNTIL = 0;
    var REMOTE_GUEST_UNTIL = 0;
    var REMOTE_GUEST_POLLING = false;
    var REMOTE_MUTE_STATE = false;
    var REMOTE_LAST_ACTION = {name:'',at:0};
    var FULL_COMPONENT = 'k2_plugin_manager_full';
    var QR_COMPONENT = 'y7_qr_screen_4139';
    var QR_COMPONENT_READY = false;
    var QR_SCREEN_SEQ = 0;
    var QR_SCREENS = {};
    var PAIRING_KEY_KEY = 'y7_pairing_key_v1';
    var PAIRING_FLOW = {generation:0,active:false,requesting:false,pairId:'',pollTimer:null,closeTimer:null,closeScreen:null};
    var FULL_OPENING = false;
    var healthBusy = false;
    var currentSettingsBody = null;

    var IPTV_PRESETS = {
        ua: {title:'Україна — кращі публічні канали',fallback:'https://iptv-org.github.io/iptv/countries/ua.m3u'},
        ukr: {title:'Україномовні — весь світ',fallback:'https://iptv-org.github.io/iptv/languages/ukr.m3u'},
        football: {title:'Футбол — безкоштовні публічні',fallback:'https://iptv-org.github.io/iptv/categories/sports.m3u'},
        sports: {title:'Спорт — світ',fallback:'https://iptv-org.github.io/iptv/categories/sports.m3u'},
        kids_ua: {title:'Дітям — українське',fallback:'https://iptv-org.github.io/iptv/countries/ua.m3u'},
        kids_world: {title:'Дітям — світ',fallback:'https://iptv-org.github.io/iptv/categories/kids.m3u'},
        animation: {title:'Мультфільми / анімація',fallback:'https://iptv-org.github.io/iptv/categories/animation.m3u'},
        education: {title:'Пізнавальне / освіта',fallback:'https://iptv-org.github.io/iptv/categories/education.m3u'},
        news: {title:'Новини — світ',fallback:'https://iptv-org.github.io/iptv/categories/news.m3u'},
        movies: {title:'Кіно — світ',fallback:'https://iptv-org.github.io/iptv/categories/movies.m3u'},
        music: {title:'Музика — світ',fallback:'https://iptv-org.github.io/iptv/categories/music.m3u'},
        world: {title:'Усі категорії — світ',fallback:'https://iptv-org.github.io/iptv/index.category.m3u'}
    };

    if (window.__K2_PLUGIN_MANAGER_480__) return;
    window.__K2_PLUGIN_MANAGER_480__ = true;

    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.dcma = false;
    window.lampa_settings.disable_features =
        window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.dmca = true;

    var ICON =
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 7h16M7 12h10M9 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';

    var PLUGINS = [
        // ONLINE — багато джерел одразу після встановлення Y7.
        {id:'online_mod',cat:'online',name:'Online MOD',desc:'Основне онлайн-джерело з власним вибором балансерів.',url:'https://nb557.github.io/plugins/online_mod.js',on:true},
        {id:'cinema',cat:'online',name:'Cinema',desc:'Окремий community-плагін для фільмів/серіалів і навігації.',url:'https://bylampa.github.io/cinema.js',on:false},
        {id:'filmix',cat:'online',name:'Filmix',desc:'Окреме джерело Filmix.',url:'https://lampaplugins.github.io/store/fx.js',on:true},
        {id:'prestige',cat:'online',name:'Prestige',desc:'Додаткове онлайн-джерело з актуального community-каталогу.',url:'https://bwa.to/plugins/prestige.js',on:false},
        {id:'nmprs',cat:'online',name:'NMPRS 4K',desc:'Додаткове онлайн-джерело з підтримкою 4K.',url:'https://num.jac-red.ru/plugin/nmprs.js',on:true},
        {id:'smotret24',cat:'online',name:'Smotret24',desc:'Ще одне безкоштовне онлайн-джерело Full HD.',url:'http://smotret24.ru/online.js',on:false},
        {id:'videocdn',cat:'online',name:'VideoCDN',desc:'Резервне відеоджерело. HTTP, тому на окремих збірках може блокуватися.',url:'http://skaz.tv/vcdn.js',on:false},
        {id:'bwa',cat:'online',name:'BWA Online',desc:'Додаткове онлайн-джерело.',url:'https://bwa.to/rc',on:true},
        {id:'showy',cat:'online',name:'Showy',desc:'Додатковий онлайн-кінотеатр. HTTP-джерело.',url:'http://showy.online/m.js',on:false},
        {id:'modss',cat:'online',name:"MODS's",desc:'Колекція балансерів і додаткових онлайн-джерел.',url:'http://lampa.stream/modss',on:true},
        {id:'stream1',cat:'online',name:'Online Stream',desc:'Онлайн-джерело з кількома балансерами.',url:'http://arkmv.ru/vod',on:false},
        {id:'stream2',cat:'online',name:'Online Stream 2',desc:'Додаткове резервне онлайн-джерело.',url:'http://llpp.in/v/vod.js',on:false},

        // TORRENTS — TorrServer уже локально на LG.
        {id:'etor',cat:'torrent',name:'Etor: Parser + TorrServer',desc:'На LG/Tizen відкриває штатні пункти Парсер і TorrServer.',url:'http://cub.red/plugin/etor',on:true},
        {id:'pubtorr',cat:'torrent',name:'PubTorr',desc:'Публічні торрент-парсери без власного Jackett.',url:'https://lampame.github.io/main/pubtorr.js',on:true},
        {id:'ts_settings',cat:'torrent',name:'TorrServer Settings',desc:'Керування налаштуваннями TorrServer з Lampa.',url:'https://lampaplugins.github.io/store/pavelpikta/torrserver-settings.js',on:true},
        {id:'torrent_styles',cat:'torrent',name:'Torrent Styles MOD V2',desc:'Зручніший список торрентів: розмір, сіди, піри, бітрейт.',url:'https://lampaplugins.github.io/store/torrent_styles_v2.js',on:true},
        {id:'ts_preload',cat:'torrent',name:'TS Preload',desc:'Показує буферизацію TorrServer.',url:'https://plugin.rootu.top/ts-preload.js',on:true},
        {id:'no_autostart',cat:'torrent',name:'No Autostart',desc:'Не запускає торрент автоматично — спочатку дає вибір.',url:'https://lampaplugins.github.io/store/no-autostart.js',on:true},

        // 18+
        {id:'bwa18',cat:'adult',name:'BWA 18+',desc:'18+ агрегатор із багатьма джерелами.',url:'http://bwa.ad/re',on:false},
        {id:'xsena18',cat:'adult',name:'Xsena 18+',desc:'18+ агрегатор із великою кількістю джерел.',url:'http://e.xsena.red',on:false},

        // COLLECTIONS
        {id:'collections',cat:'collections',name:'Netflix / Apple TV / HBO Max',desc:'Категорії стримінгових сервісів у каталозі Lampa.',url:'https://tvigl.github.io/plugins/collections.js',on:true},
        {id:'more_categories',cat:'collections',name:'Додаткові категорії',desc:'Ще більше тематичних категорій і підбірок.',url:'https://lampame.github.io/main/nc/nc.js',on:true},
        {id:'dorama_direct',cat:'collections',name:'Дорами',desc:'Окремий розділ дорам. За замовчуванням OFF, щоб не дублювати інші каталоги.',url:'https://tvigl.github.io/plugins/dorama.js',on:false},
        {id:'surs',cat:'collections',name:'SURS',desc:'Динамічні підбірки за жанрами, сервісами та популярністю.',url:'https://aviamovie.github.io/surs.js',on:false},

        // KIDS — light menu/catalog additions; Kids Mode itself is managed by Y7.
        {id:'cartoons_menu',cat:'kids',name:'Мультфільми в меню',desc:'Додає окремий розділ мультфільмів. Опціонально: upstream архівований, тому Y7 не вмикає його примусово.',url:'https://k03mad.github.io/lampa/plugins/add-mult.js',on:false},

        // TV / IPTV / SPORT
        {id:'iptv',cat:'tv',name:'IPTV M3U + EPG',desc:'M3U, групи каналів, EPG, обране, історія й пошук. Y7 має готові безкоштовні пресети.',url:'https://cdn.jsdelivr.net/gh/smackftw/lampa_iptv@main/dist/lampa-iptv.js',on:true},
        {id:'sport',cat:'tv',name:'Sport (CUB)',desc:'Додатковий спортивний розділ CUB.',url:'https://cub.red/plugin/sport',on:true},
        {id:'cinema_archive',cat:'tv',name:'Cinema Archive',desc:'Додатковий TV/архів-плагін.',url:'https://bywolf88.github.io/lampa-plugins/cinemabywolf.js',on:true},
        {id:'diesel_tv',cat:'tv',name:'Diesel TV',desc:'Додатковий TV-плагін; за замовчуванням OFF.',url:'https://andreyurl54.github.io/diesel5/diesel.js',on:false},
        {id:'skaz_tv',cat:'tv',name:'TV by Skaz',desc:'Додаткове IPTV/TV HTTP-джерело.',url:'http://skaz.tv/tv.js',on:false},

        // DESIGN — безпечні модулі ON, агресивні редизайни OFF.
        {id:'logo_title',cat:'design',name:'Logo Instead Title',desc:'Показує логотип замість простого текстового заголовка. Легкий мод.',url:'https://lampaplugins.github.io/store/logo.js',on:true},
        {id:'maxsm_ratings',cat:'design',name:'Maxsm Ratings',desc:'Акуратні рейтинги на картках без повного редизайну.',url:'https://tvigl.github.io/plugins/maxsm_ratings.js',on:true},
        {id:'surs_quality',cat:'design',name:'Surs Quality',desc:'Показує доступну якість на картках.',url:'https://tvigl.github.io/plugins/surs_quality.js',on:true},
        {id:'tv_buttons',cat:'design',name:'TV Buttons',desc:'Зручні кнопки/іконки у виборі джерел.',url:'https://apxubatop.github.io/lmpPlugs/tvbutton.js',on:true},
        {id:'categories_nav',cat:'design',name:'Categories',desc:'Додаткові категорії та зручніша навігація.',url:'https://lampame.github.io/main/newcategory.js',on:true},
        {id:'interface_enhancement',cat:'design',name:'Interface Enhancement',desc:'Сильніше змінює інтерфейс. OFF, щоб не повторити проблему з карткою фільму.',url:'https://bylampa.github.io/interface.js',on:false},
        {id:'gold_theme',cat:'design',name:'Golden Theme',desc:'Золотиста тема оформлення.',url:'https://bazzzilius.github.io/scripts/gold_theme.js',on:false},
        {id:'new_interface',cat:'design',name:'New Interface',desc:'Повний альтернативний інтерфейс — експериментальний.',url:'https://bywolf88.github.io/lampa-plugins/interface_mod_new.js',on:false},
        {id:'cardify',cat:'design',name:'Cardify',desc:'Суттєво змінює картки. OFF через можливі конфлікти.',url:'https://bylampa.github.io/cardify.js',on:false},
        {id:'themes',cat:'design',name:'Themes',desc:'Додаткові теми оформлення.',url:'https://bylampa.github.io/themes.js',on:false},
        {id:'top_bar',cat:'design',name:'Top Bar',desc:'Додаткова верхня інформаційна панель.',url:'https://tvigl.github.io/plugins/top_bar.js',on:false},
        {id:'head_filter',cat:'design',name:'Налаштування шапки',desc:'Дозволяє приховувати зайві елементи верхньої панелі.',url:'https://and7ey.github.io/lampa/head_filter.js',on:false},
        {id:'source_enhancement',cat:'design',name:'Source Enhancement',desc:'Додаткові постери/метадані та оформлення джерел.',url:'https://bylampa.github.io/source.js',on:false},

        // CURATED / DISCOVERY — verified public community URLs.
        {id:'tmdb_networks',cat:'collections',name:'TMDB Networks',desc:'Окремі мережі/стримінги: Netflix, HBO, Apple та інші TMDB networks.',url:'https://levende.github.io/lampa-plugins/tmdb-networks.js',on:true},
        {id:'random_scheduled',cat:'utils',name:'Що подивитись? Random',desc:'Швидкий випадковий вибір контенту без зміни стартового екрану.',url:'https://levende.github.io/lampa-plugins/random-scheduled.js',on:true},
        {id:'trash_filter',cat:'utils',name:'Trash Filter',desc:'Прибирає сміттєві/небажані результати з каталогів.',url:'https://levende.github.io/lampa-plugins/trash-filter.js',on:true},
        {id:'tv_status_color',cat:'utils',name:'TV Status Color',desc:'Легке кольорове позначення статусів серіалів/TV без повного редизайну.',url:'https://levende.github.io/lampa-plugins/tv-status-color.js',on:false},

        // USEFUL
        {id:'subs',cat:'utils',name:'Improved Subtitles',desc:'Покращені субтитри; особливо корисно на LG webOS.',url:'https://adambenhassen.github.io/subs.js',on:true},
        {id:'source_sort',cat:'utils',name:'Сортування онлайн-джерел',desc:'Керує порядком джерел, коли їх багато.',url:'https://tvigl.github.io/plugins/source_sort.js',on:true},
        {id:'balancer_sanitizer',cat:'utils',name:'Очищення балансерів',desc:'Допомагає прибирати непотрібні/проблемні балансери.',url:'https://levende.github.io/lampa-plugins/balancer-sanitizer.js',on:true},
        {id:'history_filter',cat:'utils',name:'Фільтр історії',desc:'Покращує роботу зі списком історії — корисно, бо Y7 стартує з Історії.',url:'https://levende.github.io/lampa-plugins/history-filter.js',on:true},
        {id:'lampac_filter',cat:'utils',name:'Lampac Source Filter',desc:'Фільтр джерел Lampac. OFF, щоб спочатку показувати максимум.',url:'https://levende.github.io/lampa-plugins/lampac-src-filter.js',on:false},
        {id:'itunes_trailers',cat:'utils',name:'Трейлери iTunes',desc:'Додаткове джерело трейлерів.',url:'https://plugin.rootu.top/trailers.js',on:true},
        {id:'yummy',cat:'utils',name:'YummyAnime',desc:'Аніме-каталог, списки, рейтинги та прогрес.',url:'https://yummyanime.github.io/yummy-lampa-plugin/stable/index.js',on:false},
        {id:'qr_keyboard',cat:'utils',name:'QR-клавіатура',desc:'Введення тексту в Lampa з телефона через QR.',url:'https://fv.plymo.ru/p/kb.js',on:false},
        {id:'cub_rating',cat:'utils',name:'Рейтинг CUB',desc:'Додатковий рейтинг CUB. OFF, бо вже є Maxsm Ratings.',url:'https://plugin.rootu.top/cub-rating.js',on:false},
        {id:'record',cat:'utils',name:'Радіо Record',desc:'Радіо Record прямо в Lampa.',url:'https://lampaplugins.github.io/store/record.js',on:false},
        {id:'somafm',cat:'utils',name:'SomaFM',desc:'Безкоштовні інтернет-радіостанції SomaFM.',url:'https://tsynik.github.io/lampa/soma.js',on:false}
    ];

    var CAT_TITLES = {
        online:'ОНЛАЙН-КІНОТЕАТРИ / БАЛАНСЕРИ',
        torrent:'ТОРРЕНТИ / TORRSERVER',
        adult:'18+',
        collections:'NETFLIX / APPLE TV / HBO / ПІДБІРКИ',
        kids:'ДІТЯМ / МУЛЬТФІЛЬМИ',
        tv:'IPTV / ТБ / СПОРТ',
        design:'ДИЗАЙН',
        utils:'КОРИСНЕ'
    };

    function log() {
        try {
            var a = Array.prototype.slice.call(arguments);
            a.unshift('[Y7 ' + VERSION + ']');
            console.log.apply(console, a);
        } catch (e) {}
    }

    function notify(s) {
        try { if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(s); } catch (e) {}
    }

    function canonicalPluginHost(u) {
        var s=String(u||'').trim();
        // Lampa itself rewrites bwa.to -> bwa.ad in Storage during startup.
        // Treat both hosts as the same plugin or Y7 would add a fresh bwa.to copy every boot.
        s=s.replace(/:\/\/bwa\.to(?=\/|$)/i,'://bwa.ad');
        return s;
    }

    function norm(u) {
        return canonicalPluginHost(u).replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
    }

    function dupNorm(u) {
        // Keep token/query variants separate, but collapse addresses that Lampa normalizes itself.
        return canonicalPluginHost(u).replace(/\/+$/, '').toLowerCase();
    }

    function cleanupPluginDuplicates(quiet) {
        var before=registry(), beforeCount=before.length, groups={}, changed=false, removed=0;
        for(var i=0;i<before.length;i++){
            var raw=purl(before[i]),k=dupNorm(raw);if(!k)continue;
            if(!groups[k])groups[k]=[];
            groups[k].push(before[i]);
        }
        Object.keys(groups).forEach(function(k){
            var g=groups[k]; if(g.length<2)return;
            // Lampa.Plugins.remove expects the plugin OBJECT, not a URL string.
            // Keep the first object and remove every later copy from the real runtime registry.
            for(var j=g.length-1;j>=1;j--){
                try{
                    if(Lampa.Plugins&&Lampa.Plugins.remove){Lampa.Plugins.remove(g[j]);removed++;changed=true;}
                }catch(e){log('duplicate remove error',purl(g[j]),e);}
            }
        });
        // Defensive storage pass: old builds may have left duplicates in Storage even if runtime was deduped.
        try{
            var stored=Lampa.Storage.get('plugins','[]')||[];
            if(stored&&stored.push){
                var seenS={},cleanS=[];
                stored.forEach(function(it){var k=dupNorm(purl(it));if(k&&seenS[k]){changed=true;return;}if(k)seenS[k]=1;cleanS.push(it);});
                if(cleanS.length!==stored.length)Lampa.Storage.set('plugins',cleanS);
            }
        }catch(es){}
        // Clean duplicate helper lists too, so Y7 does not recreate them later.
        try{
            var ex=extraPlugins(),seenEx={},cleanEx=[];
            ex.forEach(function(ep){var k=dupNorm(ep&&ep.url);if(!k||seenEx[k])return;seenEx[k]=1;cleanEx.push(ep);});
            if(cleanEx.length!==ex.length){saveExtraPlugins(cleanEx);changed=true;}
        }catch(e3){}
        try{
            var ml=Lampa.Storage.get(MANAGED_KEY,[])||[],seenM={},cleanM=[];
            ml.forEach(function(u){var k=dupNorm(u);if(!k||seenM[k])return;seenM[k]=1;cleanM.push(u);});
            if(cleanM.length!==ml.length){Lampa.Storage.set(MANAGED_KEY,cleanM);changed=true;}
        }catch(e4){}
        if(changed){save();needRestart(true);}
        var after=registry();var actual=Math.max(removed,Math.max(0,beforeCount-after.length));
        if(!quiet)notify(actual>0?('✓ Видалено дублів: '+actual+'. Перезапусти Lampa.'):'✓ Дублів з однаковою адресою не знайдено.');
        return actual;
    }

    function bool(v) {
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    function key(p) { return 'k2pm_' + p.id; }

    function enabled(p) {
        var marker = '__missing__', v;
        try { v = Lampa.Storage.get(key(p), marker); } catch (e) { v = marker; }
        if (v === marker || v === null || typeof v === 'undefined') {
            try { Lampa.Storage.set(key(p), !!p.on); } catch (e2) {}
            return !!p.on;
        }
        return bool(v);
    }

    function setEnabled(p, v) {
        try { Lampa.Storage.set(key(p), !!v); } catch (e) {}
    }

    function purl(x) {
        if (!x) return '';
        return typeof x === 'string' ? x : (x.url || '');
    }

    function registry() {
        try { return Lampa.Plugins.get() || []; } catch (e) { return []; }
    }

    function has(url) {
        var n = norm(url), a = registry();
        for (var i = 0; i < a.length; i++) if (norm(purl(a[i])) === n) return true;
        return false;
    }

    function add(url, meta) {
        if (!url || has(url)) return false;
        try {
            Lampa.Plugins.add({
                url:url,
                status:1,
                name:meta && meta.name ? meta.name : 'Y7 plugin',
                author:'Y7 Media'
            });
            return true;
        } catch (e) { log('add error', url, e); return false; }
    }

    function remove(url) {
        if (!url || !Lampa.Plugins || !Lampa.Plugins.remove) return false;
        var target=norm(url), a=registry(), removed=false;
        // Lampa.Plugins.remove() takes the exact plugin object from its registry.
        // Removing by URL string silently did nothing in previous Y7 builds.
        for(var i=a.length-1;i>=0;i--){
            if(norm(purl(a[i]))===target){
                try{Lampa.Plugins.remove(a[i]);removed=true;}catch(e){log('remove error',url,e);}
            }
        }
        return removed;
    }

    function save() {
        try { Lampa.Plugins.save(); } catch (e) { log('save error', e); }
    }

    function load(urls) {
        if (!urls || !urls.length || !Lampa.Utils || !Lampa.Utils.putScript) return;
        try {
            Lampa.Utils.putScript(
                urls,
                function(){},
                function(url){ log('load error', url); },
                function(){},
                true
            );
        } catch (e) { log('putScript error', e); }
    }

    function needRestart(v) {
        try { Lampa.Storage.set(RESTART_KEY, !!v); } catch (e) {}
    }

    function baseUrl() {
        var u = DEFAULT_FUNNEL;

        // Migration only: if an older version already stored the same server URL,
        // accept it internally, but never expose it in the settings UI.
        try {
            var old = Lampa.Storage.get(FUNNEL_KEY, '');
            if (old) u = old;
        } catch (e) {}

        u = String(u).trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        return u;
    }

    function clientToken() {
        try { return String(Lampa.Storage.get(CLIENT_TOKEN_KEY, '') || '').trim(); } catch (e) { return ''; }
    }

    function secureOnlineUrl() {
        var t = clientToken();
        return t ? baseUrl() + '/online/js/' + encodeURIComponent(t) + '?y7=4100' : '';
    }

    function secureSisiUrl() {
        var t = clientToken();
        return t ? baseUrl() + '/sisi/js/' + encodeURIComponent(t) + '?y7=4100' : '';
    }

    function secureSyncUrl() {
        var t = clientToken();
        return t ? baseUrl() + '/sync/js/' + encodeURIComponent(t) + '?y7=4100' : '';
    }

    function k2Api(path) {
        return baseUrl() + path;
    }

    function registeredValue(k) {
        try { return String(Lampa.Storage.get(k, '') || ''); } catch (e) { return ''; }
    }

    function setRegistered(k, v) {
        try { Lampa.Storage.set(k, v || ''); } catch (e) {}
    }

    function cleanupStaleSecureLampac() {
        var token=clientToken(), base=baseUrl().replace(/\/+$/,'').toLowerCase();
        var keep={};
        [secureOnlineUrl(),secureSisiUrl(),secureSyncUrl()].forEach(function(u){if(u)keep[norm(u)]=1;});
        var changed=false, a=registry();
        for(var i=a.length-1;i>=0;i--){
            var raw=purl(a[i]), clean=canonicalPluginHost(raw).replace(/[?#].*$/,'').replace(/\/+$/,'');
            var low=clean.toLowerCase();
            if(low.indexOf(base+'/')!==0)continue;
            if(!/^\/(online|sisi|sync)\/js\//.test(low.slice(base.length)))continue;
            if(!keep[norm(raw)]){try{Lampa.Plugins.remove(a[i]);changed=true;}catch(e){log('stale secure remove error',raw,e);}}
        }
        // Defensive cleanup of persisted plugin storage in case runtime registry was already normalized.
        try{
            var stored=Lampa.Storage.get('plugins','[]')||[], out=[];
            stored.forEach(function(it){
                var raw=purl(it),clean=canonicalPluginHost(raw).replace(/[?#].*$/,'').replace(/\/+$/,''),low=clean.toLowerCase();
                var stale=low.indexOf(base+'/')===0 && /^\/(online|sisi|sync)\/js\//.test(low.slice(base.length)) && !keep[norm(raw)];
                if(stale){changed=true;return;}
                out.push(it);
            });
            if(out.length!==stored.length)Lampa.Storage.set('plugins',out);
        }catch(e2){}
        if(changed)needRestart(true);
        return changed;
    }

    function syncSecureLampac(loadNow) {
        var token = clientToken();
        cleanupStaleSecureLampac();
        var onlineOn = bool(Lampa.Storage.get(LAMPAC_ON_KEY, true));
        var sisiOn = bool(Lampa.Storage.get(SISI_ON_KEY, false)) && !bool(getStorage(KIDS_MODE_KEY,false));
        var syncOn = bool(Lampa.Storage.get(SYNC_ON_KEY, true));
        var nextOnline = token && onlineOn ? secureOnlineUrl() : '';
        var nextSisi = token && sisiOn ? secureSisiUrl() : '';
        var nextSync = token && syncOn ? secureSyncUrl() : '';
        var prevOnline = registeredValue(REGISTERED_ONLINE_KEY);
        var prevSisi = registeredValue(REGISTERED_SISI_KEY);
        var prevSync = registeredValue(REGISTERED_SYNC_KEY);
        var added = [], changed = false;

        function replaceOne(prev, next, regkey, name) {
            if (prev && norm(prev) !== norm(next)) {
                if (remove(prev)) changed = true;
                setRegistered(regkey, ''); needRestart(true);
            }
            if (next && add(next, {name:name})) { added.push(next); changed = true; }
            if (next) setRegistered(regkey,next); else setRegistered(regkey,'');
        }
        replaceOne(prevOnline,nextOnline,REGISTERED_ONLINE_KEY,'Y7 Core Online');
        replaceOne(prevSisi,nextSisi,REGISTERED_SISI_KEY,'Y7 Core SISI');
        replaceOne(prevSync,nextSync,REGISTERED_SYNC_KEY,'Y7 Core Sync');

        if (changed) save();
        if (loadNow) load(added);
        return changed;
    }

    function managedList() {
        var a = PLUGINS.map(function(p){ return p.url; });
        var x = registeredValue(REGISTERED_ONLINE_KEY);
        var y = registeredValue(REGISTERED_SISI_KEY);
        var z = registeredValue(REGISTERED_SYNC_KEY);
        if (x) a.push(x);
        if (y) a.push(y);
        if (z) a.push(z);
        return a;
    }

    function cleanupAdultDuplicates() {
        var aliases=[
            'http://bwa.ad/re','http://bwa.ad/s','https://bwa.to/s','https://bwa.to/re',
            'http://e.xsena.red','https://e.xsena.red','https://cf.xsena.red',
            'https://pl.xsena.red','http://nl.xsena.red','https://nl.xsena.red'
        ];

        // v4.7 migration: keep server SISI as the single default adult menu source.
        if(!bool(getStorage(ADULT_CLEANUP_KEY,false))){
            for(var i=0;i<PLUGINS.length;i++){
                if(PLUGINS[i].id==='bwa18'||PLUGINS[i].id==='xsena18')setEnabled(PLUGINS[i],false);
            }
            for(var j=0;j<aliases.length;j++)remove(aliases[j]);
            save();
            setStorage(ADULT_CLEANUP_KEY,true);
            needRestart(true);
        }

        // Clean already-rendered duplicates in the left menu too.
        try {
            var seen={};
            $('.menu .menu__list .selector,.menu .selector').each(function(){
                var el=$(this);
                if(el.hasClass('y7-head-remote'))return;
                var t=String(el.text()||'').replace(/\s+/g,' ').trim().toLowerCase();
                var kind='';
                if(/xsena|xena\s*red|ксена/.test(t))kind='xsena';
                else if(/клубнич|клубничка|strawberry/.test(t))kind='strawberry';
                if(!kind)return;
                if(seen[kind])el.remove();
                else seen[kind]=true;
            });
        } catch(e){}
    }

    function extraPlugins() {
        var a=getStorage(EXTRA_PLUGINS_KEY,[]); return a && a.push ? a : [];
    }
    function saveExtraPlugins(a){ setStorage(EXTRA_PLUGINS_KEY,a||[]); }
    function addExtraPlugin(item) {
        if(!item||!item.url||!/^https?:\/\//i.test(item.url))return false;
        var a=extraPlugins();
        for(var i=0;i<a.length;i++)if(norm(a[i].url)===norm(item.url))return false;
        a.push({id:item.id||('extra_'+Date.now()),name:item.name||'Extra plugin',url:item.url,on:true,quarantine:false});
        saveExtraPlugins(a); add(item.url,{name:item.name||'Extra plugin'}); save(); load([item.url]); return true;
    }

    function reconcile(loadNow) {
        cleanupPluginDuplicates(true);
        enforceKidsRestrictions();
        var added=[], changed=false, wanted={}, old=[];
        PLUGINS.forEach(function(p){ wanted[norm(p.url)] = enabled(p); });

        try { old = Lampa.Storage.get(MANAGED_KEY, []) || []; } catch (e) {}

        old.forEach(function(url) {
            var isSecure = norm(url) === norm(registeredValue(REGISTERED_ONLINE_KEY)) ||
                           norm(url) === norm(registeredValue(REGISTERED_SISI_KEY)) ||
                           norm(url) === norm(registeredValue(REGISTERED_SYNC_KEY));
            if (!isSecure && !wanted[norm(url)] && remove(url)) {
                changed = true;
                needRestart(true);
            }
        });

        var suppressed=getStorage(HEALTH_SUPPRESS_KEY,{});
        PLUGINS.forEach(function(p) {
            if (enabled(p) && !suppressed[p.id]) {
                if (add(p.url, p)) { changed=true; added.push(p.url); }
            } else if (remove(p.url)) {
                changed=true; needRestart(true);
            }
        });

        extraPlugins().forEach(function(ep){ if(ep.on!==false && !suppressed[ep.id] && add(ep.url,ep)){changed=true;added.push(ep.url);} else if((ep.on===false||suppressed[ep.id]) && remove(ep.url)){changed=true;needRestart(true);} });
        if (syncSecureLampac(false)) changed=true;
        try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e) {}
        if (changed) save();
        if (loadNow) load(added);
        return {changed:changed,added:added.length};
    }

    function toggle(p,on) {
        setEnabled(p,on);
        if (on) {
            var sup=getStorage(HEALTH_SUPPRESS_KEY,{}),fc=getStorage(HEALTH_FAIL_KEY,{});if(sup[p.id]){delete sup[p.id];setStorage(HEALTH_SUPPRESS_KEY,sup);}if(fc[p.id]){delete fc[p.id];setStorage(HEALTH_FAIL_KEY,fc);}
            if (add(p.url,p)) { save(); load([p.url]); notify('✓ '+p.name+' увімкнено'); }
            else notify('✓ '+p.name+' уже увімкнений');
        } else {
            if (remove(p.url)) save();
            needRestart(true);
            notify('○ '+p.name+' вимкнено. Перезапусти Lampa.');
        }
        try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e) {}
    }

    function ajax(method, url, data, ok, fail) {
        try {
            var x = new XMLHttpRequest();
            x.open(method, url, true);
            x.timeout = 10000;
            x.setRequestHeader('Content-Type','application/json');
            x.onload = function() {
                var j = null;
                try { j = JSON.parse(x.responseText || '{}'); } catch (e) {}
                if (x.status >= 200 && x.status < 300) ok && ok(j || {});
                else fail && fail(j || {error:'HTTP '+x.status});
            };
            x.onerror = function(){ fail && fail({error:'network'}); };
            x.ontimeout = function(){ fail && fail({error:'timeout'}); };
            x.send(data ? JSON.stringify(data) : null);
        } catch (e) { fail && fail({error:String(e)}); }
    }

    function ajaxSimpleGet(url, ok, fail) {
        try {
            var x = new XMLHttpRequest();
            x.open('GET', url, true);
            x.timeout = 10000;
            x.onload = function(){
                var j=null;try{j=JSON.parse(x.responseText||'{}');}catch(e){}
                if(x.status>=200&&x.status<300)ok&&ok(j||{});
                else fail&&fail(j||{error:'HTTP '+x.status,status:x.status});
            };
            x.onerror=function(){fail&&fail({error:'network',status:0});};
            x.ontimeout=function(){fail&&fail({error:'timeout',status:0});};
            x.send(null);
        } catch(e){fail&&fail({error:String(e),status:0});}
    }

    function kidsStoreConfig(rewards){
        if(!rewards||typeof rewards!=='object')return;
        try{Lampa.Storage.set(KIDS_ADMIN_KEY,rewards);}catch(e){try{localStorage.setItem(KIDS_ADMIN_KEY,JSON.stringify(rewards));}catch(e2){}}
        try{window.dispatchEvent(new CustomEvent('y7:kids-config',{detail:rewards}));}catch(e3){}
    }
    function kidsStorePrefs(prefs){
        if(!prefs||typeof prefs!=='object')return;
        try{Lampa.Storage.set(KIDS_PREFS_KEY,prefs);}catch(e){try{localStorage.setItem(KIDS_PREFS_KEY,JSON.stringify(prefs));}catch(e2){}}
        try{window.dispatchEvent(new CustomEvent('y7:kids-prefs',{detail:prefs}));}catch(e3){}
    }
    function kidsGetConfig(){
        try{return Lampa.Storage.get(KIDS_ADMIN_KEY,null)||null;}catch(e){}
        try{return JSON.parse(localStorage.getItem(KIDS_ADMIN_KEY)||'null');}catch(e2){return null;}
    }
    function kidsGetPrefs(){
        try{return Lampa.Storage.get(KIDS_PREFS_KEY,null)||null;}catch(e){}
        try{return JSON.parse(localStorage.getItem(KIDS_PREFS_KEY)||'null');}catch(e2){return null;}
    }

    function kidsRefreshContent(done){
        var t=clientToken();if(!t){if(done)done(null);return;}
        ajax('GET',k2Api('/k2/kids/content?token='+encodeURIComponent(t)),null,function(r){
            if(r&&r.rewards)kidsStoreConfig(r.rewards);
            if(r&&r.prefs)kidsStorePrefs(r.prefs);
            try{window.__Y7_KIDS_CONTENT__=r||{};window.dispatchEvent(new CustomEvent('y7:kids-content',{detail:r||{}}));}catch(e){}
            if(done)done(r||{});
        },function(){if(done)done(null);});
    }

    function kidsReportProgress(progress){
        var t=clientToken();if(!t)return;
        ajax('POST',k2Api('/k2/kids/progress'),{token:t,progress:progress||{}},function(){},function(){});
    }

    function kidsLaunchReward(app,minutes,done){
        var cfg=kidsGetConfig()||{};
        if(app==='playstation'){
            notify('🎮 PlayStation: зароблено '+Math.max(1,parseInt(minutes,10)||30)+' хв. Покажи нагороду дорослому.');
            if(done)done('manual');
            return;
        }
        var key=app==='youtube'?'youtube':'megogo';
        var appId=String(cfg[key+'_app_id']||'').trim(),url=String(cfg[key+'_url']||'').trim();
        function fallback(){
            var ok=false;
            if(url){
                try{if(window.Lampa&&Lampa.Utils&&Lampa.Utils.openURL){Lampa.Utils.openURL(url);ok=true;}}catch(e){}
                if(!ok)try{window.open(url,'_blank');ok=true;}catch(e2){}
            }
            if(done)done(ok?'url':'unavailable');
        }
        function launch(id){
            if(!id)return fallback();
            try{
                webOS.service.request('luna://com.webos.applicationManager',{method:'launch',parameters:{id:id},onSuccess:function(){if(done)done('app');},onFailure:function(){fallback();}});
            }catch(e){fallback();}
        }
        if(window.webOS&&webOS.service&&webOS.service.request){
            if(appId){launch(appId);return;}
            // App ids differ between LG/webOS generations. Detect installed app by title/id first.
            try{
                webOS.service.request('luna://com.webos.applicationManager',{method:'listApps',parameters:{},onSuccess:function(r){
                    var list=(r&&r.apps)||r||[],needle=key==='youtube'?'youtube':'megogo',found='';
                    if(Array.isArray(list))for(var i=0;i<list.length;i++){var a=list[i]||{},hay=(String(a.id||'')+' '+String(a.title||'')+' '+String(a.name||'')).toLowerCase();if(hay.indexOf(needle)>=0){found=String(a.id||'');break;}}
                    if(found)launch(found);else fallback();
                },onFailure:function(){fallback();}});
                return;
            }catch(e2){}
        }
        fallback();
    }

    function installKidsBridge(){
        window.Y7KidsBridge={
            version:'1.0',
            getConfig:kidsGetConfig,
            refreshContent:kidsRefreshContent,
            reportProgress:kidsReportProgress,
            openReward:kidsLaunchReward,
            getPrefs:kidsGetPrefs
        };
        setTimeout(function(){kidsRefreshContent();},700);
    }

    function loadQrLib(done) {
        // QR encoder is embedded in this file; no CDN, CORS, or async race on LG.
        done(!!window.Y7QRCode);
    }

    function pairingDeviceName() {
        var name = 'LG TV / Lampa';
        try {
            if (Lampa.Platform && Lampa.Platform.get) {
                var p = Lampa.Platform.get();
                if (p) name = 'Lampa ' + p;
            }
        } catch (e) {}
        return name;
    }

    function pairingKey() {
        var key='';
        try{key=String(Lampa.Storage.get(PAIRING_KEY_KEY)||'');}catch(e){}
        if(key && key.length>=20)return key;
        try{
            var a=new Uint32Array(4);
            if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(a);
            key='tv-'+Array.prototype.map.call(a,function(x){return ('00000000'+x.toString(16)).slice(-8);}).join('');
        }catch(e2){key='tv-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);}
        try{Lampa.Storage.set(PAIRING_KEY_KEY,key);}catch(e3){}
        return key;
    }

    function clearPairingTimers(){
        try{if(PAIRING_FLOW.pollTimer)clearTimeout(PAIRING_FLOW.pollTimer);}catch(e){}
        try{if(PAIRING_FLOW.closeTimer)clearTimeout(PAIRING_FLOW.closeTimer);}catch(e2){}
        PAIRING_FLOW.pollTimer=null;PAIRING_FLOW.closeTimer=null;
    }

    function endPairingFlow(generation, closeScreen){
        if(generation!=null && generation!==PAIRING_FLOW.generation)return;
        var closer=PAIRING_FLOW.closeScreen;
        clearPairingTimers();
        PAIRING_FLOW.generation++;
        PAIRING_FLOW.active=false;PAIRING_FLOW.requesting=false;PAIRING_FLOW.pairId='';PAIRING_FLOW.closeScreen=null;
        if(closeScreen&&closer){try{closer();}catch(e){}}
    }

    function registerQrScreen() {
        if(QR_COMPONENT_READY)return;
        QR_COMPONENT_READY=true;
        try{
            Lampa.Component.add(QR_COMPONENT,function(object){
                var self=this;
                var id=String((object&&object.y7_qr_id)||'');
                if(!id&&object&&object.url){var m=String(object.url).match(/y7:\/\/qr\/(\d+)/);if(m)id=m[1];}
                var spec=QR_SCREENS[id]||{};
                var root=$('<div class="y7qr-root"></div>');
                var card=$('<div class="y7qr-card"></div>');
                var holder=$('<div class="y7qr-holder"></div>');
                var timer=$('<div class="y7qr-timer"></div>');
                var closeBtn=$('<div class="selector y7qr-close">Закрити · OK / Назад</div>');
                var left=Math.max(10,Math.min(180,Number(spec.seconds)||30));
                var ticker=null,finished=false,closing=false;
                var controllerName=QR_COMPONENT+'_'+id;

                function finish(){
                    if(finished)return;finished=true;
                    try{if(ticker)clearInterval(ticker);}catch(e){}
                    try{if(spec.afterClose)spec.afterClose();}catch(e){}
                    try{delete QR_SCREENS[id];}catch(e){}
                }
                function close(){
                    if(closing)return;
                    try{
                        if(Lampa.Activity.active().activity!==self.activity){spec.pendingClose=true;return;}
                    }catch(_activeErr){}
                    closing=true;
                    try{Lampa.Activity.backward();}catch(e){finish();try{root.remove();}catch(_e){}}
                }
                function detachController(){
                    try{if(Lampa.Controller&&Lampa.Controller.remove)Lampa.Controller.remove(controllerName);}catch(e){}
                }
                function stopTicker(){try{if(ticker)clearInterval(ticker);}catch(e){}ticker=null;}
                spec.close=close;

                this.create=function(){
                    root.attr('style','position:relative;width:100%;height:100%;min-height:100vh;background:rgba(3,8,18,.96);display:flex;align-items:center;justify-content:center;padding:4vh 4vw;box-sizing:border-box;color:#fff;overflow:hidden;');
                    card.attr('style','width:min(760px,92vw);max-height:90vh;overflow:auto;background:#101a2d;border:2px solid rgba(177,211,255,.35);border-radius:24px;padding:24px 28px;text-align:center;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,.55);font-family:Arial,sans-serif;box-sizing:border-box;');
                    card.append($('<div></div>').text(spec.title||'Y7').attr('style','font-size:28px;font-weight:800;margin-bottom:14px'));
                    try{var node=spec.box&&spec.box[0]?spec.box[0]:spec.box;if(node)holder.append(node);}catch(e){}
                    card.append(holder);
                    timer.text('Автозакриття через '+left+' с').attr('style','margin-top:14px;font-size:17px;color:#cfe1ff');
                    closeBtn.attr('style','display:inline-block;margin-top:14px;padding:12px 22px;border-radius:12px;background:#426ef4;color:#fff;font-size:18px;font-weight:800;');
                    closeBtn.on('hover:enter click',function(){close();});
                    card.append(timer).append(closeBtn);root.append(card);
                    try{this.activity.loader(false);}catch(e){}
                    return this.render();
                };
                this.render=function(){return root;};
                this.start=function(){
                    if(Lampa.Activity.active().activity!==this.activity)return;
                    detachController();
                    Lampa.Controller.add(controllerName,{
                        toggle:function(){try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(closeBtn[0],root);}catch(e){}},
                        enter:close,ok:close,back:close,
                        left:function(){},right:function(){},up:function(){},down:function(){}
                    });
                    Lampa.Controller.toggle(controllerName);
                    stopTicker();
                    ticker=setInterval(function(){left--;timer.text('Автозакриття через '+left+' с');if(left<=0)close();},1000);
                    if(spec.pendingClose){spec.pendingClose=false;setTimeout(close,0);}
                };
                this.back=close;
                this.pause=function(){detachController();stopTicker();};
                this.stop=function(){detachController();stopTicker();};
                this.destroy=function(){
                    stopTicker();detachController();
                    finish();try{root.remove();}catch(e){}
                };
            });
        }catch(e){QR_COMPONENT_READY=false;log('QR component register error',e);}
    }

    function openQrModal(title, box, afterClose, seconds) {
        registerQrScreen();
        var id=String(++QR_SCREEN_SEQ);
        var spec={id:id,title:title||'Y7',box:box,afterClose:afterClose,seconds:seconds||30,close:null,pendingClose:false};
        QR_SCREENS[id]=spec;
        try{
            Lampa.Activity.push({url:'y7://qr/'+id,title:title||'Y7',component:QR_COMPONENT,page:1,y7_qr_id:id});
        }catch(e){
            log('QR activity open error',e);
            try{delete QR_SCREENS[id];}catch(_e){}
            try{if(afterClose)afterClose();}catch(_e2){}
            notify('Y7: не вдалося відкрити екран QR');
        }
        return function(){
            if(spec.close)spec.close();
            else spec.pendingClose=true;
        };
    }

    function showPairModal(data, generation) {
        if(generation!==PAIRING_FLOW.generation)return;
        var stopped = false;
        var closeModal = null;
        var expireAt = Date.now() + ((data.expires_in || 300) * 1000);
        PAIRING_FLOW.requesting=false;
        PAIRING_FLOW.active=true;
        PAIRING_FLOW.pairId=String(data.pair_id||'');

        var box = $(
            '<div style="padding:1em;text-align:center">' +
            '<div class="k2-pair-qr" style="width:220px;height:220px;margin:0 auto 1em;background:#fff;padding:8px;box-sizing:content-box"></div>' +
            '<div style="font-size:1.05em;opacity:.8">Код на TV</div>' +
            '<div style="font-size:2.4em;font-weight:700;letter-spacing:.18em;margin:.15em 0 .35em">' + data.code + '</div>' +
            '<div class="k2-pair-state" style="font-size:1.05em">Відскануй QR телефоном і введи Admin PIN.</div>' +
            '<div style="opacity:.85;font-size:1em;margin-top:1em;overflow-wrap:anywhere;color:#bbdcff">Без QR відкрий на телефоні: ' + baseUrl() + '/pair</div>' +
            '</div>'
        );

        function close() {
            if(stopped)return;
            stopped = true;
            clearPairingTimers();
            if (closeModal) closeModal();
            else endPairingFlow(generation,false);
        }

        closeModal = openQrModal('Y7 Media — безпечне підключення', box, function(){
            stopped=true;
            endPairingFlow(generation,false);
        },90);
        PAIRING_FLOW.closeScreen=closeModal;

        loadQrLib(function(ok) {
            if (!ok || stopped || generation!==PAIRING_FLOW.generation) {
                box.find('.k2-pair-qr').html('<div style="color:#111;padding-top:75px">QR недоступний<br>використай код нижче</div>');
                return;
            }
            try {
                var el = box.find('.k2-pair-qr')[0];
                el.innerHTML = '';
                new Y7QRCode(el, {
                    text:data.approve_url,
                    width:220,
                    height:220,
                    correctLevel:Y7QRCode.CorrectLevel.M
                });
            } catch (e) {
                box.find('.k2-pair-qr').html('<div style="color:#111;padding-top:75px">QR недоступний</div>');
            }
        });

        function schedulePoll(ms){
            if(stopped||generation!==PAIRING_FLOW.generation)return;
            try{if(PAIRING_FLOW.pollTimer)clearTimeout(PAIRING_FLOW.pollTimer);}catch(e){}
            PAIRING_FLOW.pollTimer=setTimeout(poll,ms);
        }

        function poll() {
            if (stopped || generation!==PAIRING_FLOW.generation) return;
            if (Date.now() > expireAt) {
                box.find('.k2-pair-state').text('Код протерміновано. Закрий це вікно і створи новий.');
                clearPairingTimers();
                return;
            }

            var url = baseUrl() + '/pair/status/' + encodeURIComponent(data.pair_id) +
                      '?poll=' + encodeURIComponent(data.poll_secret);

            ajax('GET', url, null, function(r) {
                if(stopped||generation!==PAIRING_FLOW.generation)return;
                if (r.status === 'approved' && r.client_token) {
                    clearPairingTimers();
                    try {
                        Lampa.Storage.set(CLIENT_TOKEN_KEY, r.client_token);
                        Lampa.Storage.set(DEVICE_ID_KEY, r.device_id || '');
                        Lampa.Storage.set(DEVICE_NAME_KEY, r.device_name || 'LG TV');
                        Lampa.Storage.set(LAMPAC_ON_KEY, true);
                        Lampa.Storage.set(SYNC_ON_KEY, true);
                    } catch (e) {}

                    syncSecureLampac(true);
                    try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e2) {}

                    box.find('.k2-pair-state').html('✓ <b>Підключено.</b> Lampac Online додано автоматично.');
                    notify('✓ Y7 Core підключено');
                    PAIRING_FLOW.closeTimer=setTimeout(function(){if(generation===PAIRING_FLOW.generation)close();},1200);
                    return;
                }
                if(r.status==='expired'||r.status==='consumed'){
                    clearPairingTimers();
                    box.find('.k2-pair-state').text('Сесію завершено. Закрий вікно та створи новий код.');
                    return;
                }
                schedulePoll(1500);
            }, function() {
                schedulePoll(2200);
            });
        }

        schedulePoll(700);
    }

    function showPairingConnectionHelp(err){
        var reason=String(err&&err.error||'network'),st=Number(err&&err.status||0);
        var statusUrl=baseUrl()+'/k2/status';
        var pairUrl=baseUrl()+'/pair';
        var box=$('<div style="padding:1em;text-align:left;line-height:1.5">'+
            '<div style="font-size:1.15em;font-weight:800;color:#ffcf74;margin-bottom:.65em">Y7 Core не відповідає телевізору</div>'+
            '<div>QR ще не формується, бо TV не отримав сесію спарювання від сервера.</div>'+
            '<div style="margin-top:.8em"><b>Причина:</b> '+reason+(st?' · HTTP '+st:'')+'</div>'+
            '<div style="margin-top:.8em"><b>Перевір з телефона:</b><br><span style="color:#a9d2ff;overflow-wrap:anywhere">'+statusUrl+'</span></div>'+
            '<div style="margin-top:.5em">Якщо там є JSON з <b>version 4.13.11</b> — сервер доступний. Тоді відкрий:<br><span style="color:#a9d2ff;overflow-wrap:anywhere">'+pairUrl+'</span></div>'+
            '<div style="margin-top:.8em;opacity:.82">Якщо адреса не відкривається — на сервері перевір Funnel: він має вести HTTPS на <b>127.0.0.1:9120</b>, не на 9118.</div>'+
            '</div>');
        openQrModal('Y7 — діагностика підключення',box,null,60);
    }

    function startPairing() {
        if(PAIRING_FLOW.active||PAIRING_FLOW.requesting){
            notify(PAIRING_FLOW.pairId?'Код спарювання вже відкритий. Закрий його перед створенням нового.':'Код спарювання вже створюється…');
            return;
        }
        clearPairingTimers();
        var generation=++PAIRING_FLOW.generation;
        PAIRING_FLOW.active=true;PAIRING_FLOW.requesting=true;PAIRING_FLOW.pairId='';PAIRING_FLOW.closeScreen=null;
        var base = baseUrl();
        var pkey=pairingKey();
        var dname=pairingDeviceName();
        notify('Створюю код спарювання…');

        function failCompletely(err){
            if(generation!==PAIRING_FLOW.generation)return;
            endPairingFlow(generation,false);
            showPairingConnectionHelp(err||{error:'network'});
        }
        function accept(r){
            if(generation!==PAIRING_FLOW.generation)return;
            if(!r||!r.ok||!r.pair_id)return false;
            showPairModal(r,generation);
            return true;
        }

        ajax('POST', base + '/pair/start', {device_name:dname,pairing_key:pkey}, function(r){
            if(!accept(r))failCompletely(r||{error:'invalid_response'});
        }, function(firstErr){
            if(generation!==PAIRING_FLOW.generation)return;
            var getUrl=base + '/pair/start?device_name=' + encodeURIComponent(dname) + '&pairing_key=' + encodeURIComponent(pkey) + '&_=' + Date.now();
            ajaxSimpleGet(getUrl, function(r){
                if(!accept(r))failCompletely(r||{error:'invalid_response'});
            }, function(secondErr){
                failCompletely(secondErr||firstErr);
            });
        });
    }

    function checkSecureLampac() {
        var t = clientToken();
        if (!t) return notify('Y7 Core ще не підключений. Використай QR.');
        ajax('GET', baseUrl() + '/k2/me?token=' + encodeURIComponent(t), null, function(r) {
            if (r.ok) notify('✓ Y7 Core: ' + (r.device_name || 'TV') + ' авторизований');
            else notify('✕ Token не прийнято');
        }, function(){ notify('✕ Y7 Core недоступний'); });
    }

    var FORGET_ARMED_UNTIL=0;
    var FORGET_ARMED_ACTION='';
    function confirmForgetSecureLampac(repair){
        var kind=repair?'repair':'forget',now=Date.now();
        if(FORGET_ARMED_ACTION!==kind||now>FORGET_ARMED_UNTIL){
            FORGET_ARMED_ACTION=kind;FORGET_ARMED_UNTIL=now+15000;
            notify(repair?'Ще раз натисни «Переприв’язати» протягом 15 с.':'Ще раз натисни «Забути підключення» протягом 15 с.');
            return;
        }
        FORGET_ARMED_UNTIL=0;FORGET_ARMED_ACTION='';
        forgetSecureLampac(repair?function(){setTimeout(startPairing,350);}:null);
    }

    function forgetSecureLampac(afterClear) {
        var token = clientToken();

        function clearLocal() {
            var a = registeredValue(REGISTERED_ONLINE_KEY);
            var b = registeredValue(REGISTERED_SISI_KEY);
            var c = registeredValue(REGISTERED_SYNC_KEY);
            if (a) remove(a);
            if (b) remove(b);
            if (c) remove(c);
            save();
            setRegistered(REGISTERED_ONLINE_KEY,'');
            setRegistered(REGISTERED_SISI_KEY,'');
            setRegistered(REGISTERED_SYNC_KEY,'');
            try {
                Lampa.Storage.set(CLIENT_TOKEN_KEY,'');
                Lampa.Storage.set(DEVICE_ID_KEY,'');
                Lampa.Storage.set(DEVICE_NAME_KEY,'');
            } catch (e) {}
            needRestart(true);
            notify(afterClear?'Y7 Core відв’язано. Створюю нове підключення…':'Y7 Core відв’язано від цього TV. Перезапусти Lampa.');
            if(afterClear)try{afterClear();}catch(e){}
        }

        if (!token) return clearLocal();

        ajax('POST', baseUrl() + '/k2/revoke', {token:token}, function() {
            clearLocal();
        }, function() {
            clearLocal();
            notify('Token видалено з TV, але сервер був недоступний для відкликання.');
        });
    }

    function getStorage(name, def) {
        try {
            var value = Lampa.Storage.get(name, def);
            return typeof value === 'undefined' || value === null ? def : value;
        } catch (e) {
            return def;
        }
    }

    function setStorage(name, value) {
        try { Lampa.Storage.set(name, value); } catch (e) {}
    }

    function setStartPage(value, quiet) {
        var allowed = {
            'favorite@history':1,
            'main':1,
            'favorite@bookmarks':1,
            'mytorrents':1,
            'last':1
        };
        if (!allowed[value]) value = 'favorite@history';
        setStorage(START_PAGE_KEY, value);
        setStorage('start_page', value);
        if (!quiet) notify('Стартова сторінка змінена. Застосується після наступного запуску Lampa.');
    }

    function iptvUrl(value) {
        var preset=IPTV_PRESETS[value]||IPTV_PRESETS.ua;
        var t=clientToken();
        return t ? (baseUrl()+'/k2/iptv.m3u?preset='+encodeURIComponent(value)+'&token='+encodeURIComponent(t)) : preset.fallback;
    }

    function applyIptvPreset(value, quiet) {
        var preset = IPTV_PRESETS[value] || IPTV_PRESETS.ua;
        value = IPTV_PRESETS[value] ? value : 'ua';
        setStorage(IPTV_PRESET_KEY, value);
        setStorage('liptv_m3u_url', iptvUrl(value));
        setStorage('liptv_epg_source', 'auto');
        if (!getStorage('liptv_view_mode', '')) setStorage('liptv_view_mode', 'list');
        if (!quiet) notify('IPTV: ' + preset.title + '. Y7 обирає/кешує кращі потоки; EPG = Авто.');
    }

    function applyGlassPreset(quiet) {
        setStorage('animation', true);
        setStorage('background', true);
        setStorage('glass_style', true);
        setStorage('glass_opacity', 'medium');
        setStorage('black_style', false);
        setStorage('advanced_animation', false);
        setStorage('card_quality', true);
        setStorage('card_episodes', true);
        if (!quiet) notify('✓ Y7 Glass застосовано. Якщо вигляд не оновився одразу — перезапусти Lampa.');
    }

    function applyOledPreset() {
        setStorage('animation', true);
        setStorage('background', true);
        setStorage('glass_style', true);
        setStorage('glass_opacity', 'blacked');
        setStorage('black_style', true);
        setStorage('advanced_animation', false);
        setStorage('card_quality', true);
        setStorage('card_episodes', true);
        notify('✓ Y7 OLED Black застосовано.');
    }

    function applyStandardLook() {
        setStorage('glass_style', false);
        setStorage('black_style', false);
        setStorage('animation', true);
        setStorage('background', true);
        notify('✓ Повернуто базове оформлення Lampa. Зовнішні дизайн-плагіни керуються окремо.');
    }

    function pluginById(id) {
        for (var i = 0; i < PLUGINS.length; i++) if (PLUGINS[i].id === id) return PLUGINS[i];
        return null;
    }
    function extraPluginById(id) {
        var a=extraPlugins();
        for(var i=0;i<a.length;i++)if(a[i]&&a[i].id===id)return a[i];
        return null;
    }

    function applyV400Migration() {
        var version=parseInt(getStorage(PROFILE_VERSION_KEY,0),10)||0;
        if(version>=PROFILE_VERSION)return;
        ['tmdb_networks','random_scheduled','trash_filter'].forEach(function(id){var p=pluginById(id);if(p)setEnabled(p,true);});
        // 4.13.11 startup hygiene: Lampac/Y7 Core already provides the main cinema sources.
        // Disable legacy/HTTP/known-dead external online plugins that caused startup error storms.
        // They remain visible in Y7 settings and can still be enabled manually.
        ['bwa','modss','cinema','prestige','smotret24','videocdn','showy','stream1','stream2'].forEach(function(id){var p=pluginById(id);if(p)setEnabled(p,false);});
        if(getStorage(SYNC_ON_KEY,'__missing__')==='__missing__')setStorage(SYNC_ON_KEY,true);
        if(getStorage(QUALITY_MIN_KEY,'__missing__')==='__missing__')setStorage(QUALITY_MIN_KEY,720);
        if(getStorage(QUALITY_UA_KEY,'__missing__')==='__missing__')setStorage(QUALITY_UA_KEY,true);
        if(getStorage(QUALITY_CAM_KEY,'__missing__')==='__missing__')setStorage(QUALITY_CAM_KEY,true);
        if(getStorage(QUALITY_WORKING_KEY,'__missing__')==='__missing__')setStorage(QUALITY_WORKING_KEY,true);
        if(getStorage(UPDATE_CHANNEL_KEY,'__missing__')==='__missing__')setStorage(UPDATE_CHANNEL_KEY,'stable');
        setStorage(PROFILE_VERSION_KEY,PROFILE_VERSION);
        sendPolicy(true);
    }

    function showHtmlModal(title, htmlText) {
        try { Lampa.Modal.open({title:title,html:$('<div style="padding:1em;line-height:1.45">'+htmlText+'</div>'),size:'medium',onBack:function(){Lampa.Modal.close();}}); }
        catch(e){ notify(title); }
    }

    function sendPolicy(quiet) {
        var t=clientToken(); if(!t)return;
        var policy={
            ua_first:bool(getStorage(QUALITY_UA_KEY,true)),
            min_quality:parseInt(getStorage(QUALITY_MIN_KEY,720),10)||0,
            hide_cam:bool(getStorage(QUALITY_CAM_KEY,true)),
            only_working:bool(getStorage(QUALITY_WORKING_KEY,true)),
            kids_mode:bool(getStorage(KIDS_MODE_KEY,false)),
            iptv_preset:getStorage(IPTV_PRESET_KEY,'ua'),
            update_channel:getStorage(UPDATE_CHANNEL_KEY,'stable')
        };
        ajax('POST',k2Api('/k2/policy'),{token:t,policy:policy},function(){if(!quiet)notify('✓ Правила Y7 збережено');},function(){if(!quiet)notify('✕ Не вдалося зберегти правила');});
    }

    function showProviderHealthResult(r) {
        if(!r || r.ok===false){
            var err=r&&r.error?String(r.error):'невідома помилка';
            notify('✕ Перевірка балансерів: '+err);
            return;
        }
        var a=r.providers||[], h='<b>Балансери: '+(r.working||0)+'/'+(r.total||0)+'</b><br>';
        if(r.ready===false)h+='<small>Частина джерел ще могла не завершити перевірку.</small><br>';
        h+='<br>';
        for(var i=0;i<a.length;i++){
            h+=(a[i].work?'✓ ':'✕ ')+String(a[i].name||'?')+(a[i].quality?' · '+a[i].quality+'p':'')+'<br>';
        }
        if(!a.length)h+='Немає результатів від Lampac.';
        showHtmlModal('Y7 Core — якість джерел',h);
    }

    function checkProviderHealth() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи Y7 Core.');
        notify('Перевіряю балансери у фоні…');
        var started=Date.now(), tries=0, maxTries=50;

        function poll(){
            tries++;
            ajax('GET',k2Api('/k2/provider-health?token='+encodeURIComponent(t)),null,function(s){
                if(s && s.refreshing){
                    if(tries<maxTries)return setTimeout(poll,900);
                    return notify('✕ Перевірка балансерів перевищила 45 секунд');
                }
                var data=s && s.data ? s.data : s;
                showProviderHealthResult(data||{});
            },function(){
                if(tries<maxTries)return setTimeout(poll,1000);
                notify('✕ Y7 Core не повернув результат перевірки');
            });
        }

        ajax('POST',k2Api('/k2/provider-health'),{token:t,force:true,async:true},function(r){
            if(r && r.error)return notify('✕ Перевірка балансерів: '+String(r.error));
            setTimeout(poll,650);
        },function(){
            notify('✕ Не вдалося запустити перевірку балансерів');
        });
    }

    function checkSystemHealth() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи Y7 Core.');
        ajax('GET',k2Api('/k2/system-health?token='+encodeURIComponent(t)),null,function(r){
            var x=r.runtime||{}, tv=r.tv||{}, p=r.providers||{};
            var h='<b>Y7 SYSTEM</b><br><br>'+ 
                'Gateway: ✓<br>'+ 'Lampac: '+(r.lampac&&r.lampac.ok?'✓':'✕')+(r.lampac&&r.lampac.ms?' · '+r.lampac.ms+' ms':'')+'<br>'+ 
                'Chromium: '+(r.chromium&&r.chromium.ok?'✓':'✕')+'<br>'+ 
                'Lampac providers: '+(p.ok===false?'✕':((p.working||'?')+'/'+(p.total||'?')))+'<br>'+ 
                'TorrServer LG: '+(tv.torrserver?'✓':'?')+'<br>'+ 
                'Uptime: '+Math.floor((x.uptime||0)/3600)+' год<br>'+ 
                'Restarts: Lampac '+((x.restarts||{}).lampac||0)+', Gateway '+((x.restarts||{}).gateway||0)+', bridge '+((x.restarts||{}).bridge||0);
            showHtmlModal('Y7 Health',h);
        },function(){notify('✕ Y7 Health недоступний');});
    }

    function startRemoteAdmin() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи Y7 Core.');
        ajax('POST',k2Api('/k2/admin/start'),{token:t},function(r){
            if(!r.url)return notify('Не отримано URL керування');
            REMOTE_ADMIN_UNTIL = Date.now() + 31*60*1000;
            var box=$('<div style="padding:1em;text-align:center"><div class="k2-admin-qr" style="width:220px;height:220px;margin:0 auto 1em;background:#fff;padding:8px;box-sizing:content-box"></div><div>Скануй QR телефоном і введи Admin PIN.</div><div style="opacity:.65;font-size:.8em;margin-top:1em;overflow-wrap:anywhere">'+r.url+'</div></div>');
            openQrModal('Y7 Admin',box);
            loadQrLib(function(ok){if(ok){try{new Y7QRCode(box.find('.k2-admin-qr')[0],{text:r.url,width:220,height:220,correctLevel:Y7QRCode.CorrectLevel.M});}catch(e){}}});
        },function(){notify('✕ Не вдалося відкрити Y7 Admin');});
    }


    function startGuestRemote() {
        var tok=clientToken(); if(!tok)return startPairing();
        function showRemote(r){
            if(!r||!r.url)return notify('Y7 TV Manager: сервер не повернув URL');
            REMOTE_GUEST_UNTIL=Date.now()+((r.expires_in||43200)*1000);
            ensureGuestRemotePoll();
            var hours=Math.max(1,Math.ceil((r.expires_in||43200)/3600));
            var managerUrl=String(r.url||'');
            var box=$('<div style="padding:1em;text-align:center"><div class="y7-remote-qr" style="width:248px;height:248px;margin:0 auto 1em;background:#fff;padding:8px;box-sizing:content-box"></div><div style="font-size:1.05em;font-weight:700">Y7 TV Manager · '+hours+' год</div><div style="margin-top:.55em">Скануй QR телефоном. Повне налаштування Y7 цього TV.</div><div class="y7-manual-link" style="opacity:.75;font-size:.82em;margin-top:1em;overflow-wrap:anywhere;user-select:text">'+managerUrl+'</div></div>');
            openQrModal('Y7 TV Manager',box,null,45);
            loadQrLib(function(ok){
                if(ok){try{new Y7QRCode(box.find('.y7-remote-qr')[0],{text:managerUrl,width:248,height:248,correctLevel:Y7QRCode.CorrectLevel.M});return;}catch(e){}}
                try{box.find('.y7-remote-qr').html('<div style="color:#111;padding:22px 8px;font-size:14px;line-height:1.35">QR недоступний.<br><br>Відкрий адресу нижче телефоном.</div>');}catch(e2){}
            });
        }
        function failed(err){
            var st=err&&err.status||0,reason=String(err&&err.error||'network');
            if(st===401){
                try{Lampa.Storage.set(CLIENT_TOKEN_KEY,'');}catch(e){}
                notify('Y7: прив’язка TV застаріла. Створюю новий QR підключення.');
                setTimeout(startPairing,250);return;
            }
            notify('Y7 TV Manager: '+reason+'. Перевір сервер 9120. У Y7 Media доступна кнопка «Переприв’язати TV».');
        }
        // GET without JSON Content-Type avoids CORS preflight bugs on older LG/webOS.
        ajaxSimpleGet(k2Api('/k2/remote/start?token='+encodeURIComponent(tok)+'&_='+Date.now()),showRemote,function(firstErr){
            // Compatibility fallback for older server packages.
            ajax('POST',k2Api('/k2/remote/start'),{token:tok},showRemote,function(secondErr){failed(secondErr||firstErr);});
        });
    }

    function stopGuestRemote() {
        var t=clientToken(); if(!t)return;
        ajax('POST',k2Api('/k2/remote/revoke'),{token:t},function(){REMOTE_GUEST_UNTIL=0;notify('Y7 TV Manager для цього TV закрито');},function(){notify('Не вдалося закрити Y7 TV Manager');});
    }


function y7RemoteSvg() {
    // Deliberately unique Y7 QR icon. We no longer reuse Lampa's stock
    // "network / connection setup" button because on some LG builds it
    // opens the native network pairing screen instead of Y7 TV Manager.
    return '<svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">'+
    '<rect x="7" y="7" width="17" height="17" rx="3" stroke="currentColor" stroke-width="4"/>'+
    '<rect x="40" y="7" width="17" height="17" rx="3" stroke="currentColor" stroke-width="4"/>'+
    '<rect x="7" y="40" width="17" height="17" rx="3" stroke="currentColor" stroke-width="4"/>'+
    '<path d="M39 39h7v7h-7zM49 39h8v8M39 50h8v7M51 51h6v6" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>'+
    '<path d="M26 30l5 8 5-8M31 38v8M38 30h11l-7 16" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>'+
    '</svg>';
}

function openY7Phone() {
    // One predictable entry point: unpaired TV -> pairing QR,
    // paired TV -> private Y7 TV Manager QR.
    if (clientToken()) startGuestRemote();
    else startPairing();
}

function removeStockPhoneButtons() {
    try {
        // These are Lampa connection/keyboard/broadcast buttons, not Y7.
        // Hide only explicit stock selectors; never hide Search/Settings/Profile.
        var selectors=[
            '.open--broadcast','.open--keyboard','.open--remote','.open--phone','.open--qr',
            '.head__action--broadcast','.head__action--keyboard','.head__action--phone',
            '.head__action--qr','.head__action--connect'
        ].join(',');
        $(selectors).each(function(){
            var e=$(this);
            if(e.hasClass('y7-head-remote'))return;
            e.attr('data-y7-stock-hidden','1').css('display','none');
        });

        // Some Lampa builds use generic selector shells with only a title.
        // Hide them only when the visible/title text clearly says connection setup.
        $('.head .selector,.head__right .selector,.head__buttons .selector,.head__actions .selector').each(function(){
            var e=$(this);
            if(e.hasClass('y7-head-remote')||e.hasClass('open--settings')||e.hasClass('open--search')||e.hasClass('open--profile'))return;
            var txt=(String(e.attr('title')||'')+' '+String(e.attr('aria-label')||'')+' '+String(e.text()||'')).toLowerCase();
            if(/настройка связи|налаштування зв.?язку|connection setup|network pairing|phone input|remote input|ввод з телефону|ввод с телефона/.test(txt)){
                e.attr('data-y7-stock-hidden','1').css('display','none');
            }
        });
    } catch(e){}
}

function bindY7HeadButton(btn) {
    if(!btn||!btn.length)return false;
    try {
        btn.off('hover:enter click');
        btn.removeClass('open--broadcast open--keyboard open--remote open--phone open--qr head__action--broadcast head__action--keyboard head__action--phone head__action--qr head__action--connect open--settings');
        btn.addClass('selector y7-head-remote');
        btn.removeAttr('id data-action');
        btn.css('display','');
        btn.attr('title','Y7 TV Manager').attr('aria-label','Y7 TV Manager');
        btn.html('<div class="y7-head-remote__ico">'+y7RemoteSvg()+'</div>');
        btn.on('hover:enter click',function(e){
            try{if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}}catch(_e){}
            openY7Phone();
            return false;
        });
        return true;
    } catch(e){return false;}
}

function installY7HeadRemote() {
    try {
        removeStockPhoneButtons();

        var current=$('.y7-head-remote').first();
        if(current.length){
            bindY7HeadButton(current);
            cleanupAdultDuplicates();
            return true;
        }

        // The most predictable route on LG/webOS is our own button cloned only
        // from Settings visual markup. clone(false,false) deliberately copies no
        // stock network/connection events, so clicking this QR can only call Y7.
        var settings=$('.open--settings').first();
        if(settings.length){
            var b=settings.clone(false,false);
            b.removeClass('open--settings').addClass('y7-head-remote');
            b.removeAttr('id data-action');
            bindY7HeadButton(b);
            settings.before(b);
            cleanupAdultDuplicates();
            return true;
        }

        // Last fallback for Lampa layouts without a discoverable Settings shell.
        // If Head.addIcon returns a node, bind it explicitly; its callback is also
        // already Y7-only.
        try{
            if(Lampa.Head&&Lampa.Head.addIcon){
                var created=Lampa.Head.addIcon(y7RemoteSvg(),openY7Phone);
                var q=created&&created.jquery?created:$(created||[]);
                if(q.length){bindY7HeadButton(q);cleanupAdultDuplicates();return true;}
            }
        }catch(_headErr){}
    } catch(e){}
    return false;
}

function keepY7HeadRemote() {
    installY7HeadRemote();
    if(!window.__Y7_HEAD_REMOTE_TIMER__){
        window.__Y7_HEAD_REMOTE_TIMER__=setInterval(function(){
            removeStockPhoneButtons();
            installY7HeadRemote();
            cleanupAdultDuplicates();
        },1800);
    }
}

function remotePlatformCaps() {
        var platform='browser', systemVolume=false, playerVolume=true, systemSettings=false;
        try {
            if(Lampa.Platform && Lampa.Platform.is){
                if(Lampa.Platform.is('webos')) platform='webOS';
                else if(Lampa.Platform.is('tizen')) platform='Tizen';
                else if(Lampa.Platform.is('android')) platform='Android';
                else if(Lampa.Platform.is('apple')) platform='Apple';
            }
        } catch(e){}
        try {
            if(window.webOS && webOS.service && typeof webOS.service.request==='function'){
                platform='webOS'; systemVolume=true;
            }
        } catch(e){}
        try {
            if(window.tizen && tizen.tvaudiocontrol){
                platform='Tizen'; systemVolume=true;
            }
        } catch(e){}
        try {
            if(typeof window.AndroidJS!=='undefined') platform='Android';
        } catch(e){}
        return {
            platform:platform,
            navigation:true,
            lampa_settings:true,
            playback:true,
            system_volume:systemVolume,
            player_volume:playerVolume,
            system_settings:systemSettings
        };
    }

    function remoteActiveController() {
        try {
            if(!Lampa.Controller || typeof Lampa.Controller.enabled!=='function') return null;
            var c=Lampa.Controller.enabled();
            // Compatibility: older/newer Lampa builds differ here.
            if(c && c.controller) c=c.controller;
            return c || null;
        } catch(e){ return null; }
    }

    function remoteCallController(name) {
        var c=remoteActiveController();
        if(!c) return false;
        var aliases={
            up:['up'],down:['down'],left:['left'],right:['right'],
            ok:['ok','enter'],back:['back']
        };
        var arr=aliases[name]||[name];
        for(var i=0;i<arr.length;i++){
            try {
                if(typeof c[arr[i]]==='function'){
                    c[arr[i]]();
                    return true;
                }
            } catch(e){}
        }
        return false;
    }

    function remoteFocused() {
        try {
            var f=$('.selector.focus,.focus.selector').first();
            if(f && f.length) return f;
        } catch(e){}
        return null;
    }

    function remoteSyntheticKey(name) {
        var map={
            up:{key:'ArrowUp',code:'ArrowUp',kc:38},
            down:{key:'ArrowDown',code:'ArrowDown',kc:40},
            left:{key:'ArrowLeft',code:'ArrowLeft',kc:37},
            right:{key:'ArrowRight',code:'ArrowRight',kc:39},
            ok:{key:'Enter',code:'Enter',kc:13},
            back:{key:'Escape',code:'Escape',kc:27}
        };
        var m=map[name]; if(!m) return false;
        try {
            var target=document.activeElement || document.body || document;
            var ev;
            try {
                ev=new KeyboardEvent('keydown',{key:m.key,code:m.code,bubbles:true,cancelable:true});
            } catch(e1) {
                ev=document.createEvent('Event');
                ev.initEvent('keydown',true,true);
            }
            try{Object.defineProperty(ev,'keyCode',{get:function(){return m.kc;}});}catch(e2){}
            try{Object.defineProperty(ev,'which',{get:function(){return m.kc;}});}catch(e3){}
            try{target.dispatchEvent(ev);}catch(e4){document.dispatchEvent(ev);}
            return true;
        } catch(e){return false;}
    }

    function remoteNavigate(name) {
        // 1) Active Lampa controller: correct path on normal TV builds.
        if(remoteCallController(name)) return true;

        // 2) Direct Navigator fallback for directional input.
        if(name==='up'||name==='down'||name==='left'||name==='right'){
            try {
                if(typeof Navigator!=='undefined' && Navigator.move){
                    if(!Navigator.canmove || Navigator.canmove(name)){
                        Navigator.move(name);
                        return true;
                    }
                }
            } catch(e){}
        }

        // 3) Direct action on the element that Lampa currently marks focused.
        var f=remoteFocused();
        if(name==='ok' && f){
            try{f.trigger('hover:enter');return true;}catch(e1){}
            try{f.trigger('click');return true;}catch(e2){}
        }

        // 4) Browser key fallback for builds whose keypad listener is document based.
        return remoteSyntheticKey(name);
    }

    function remoteVideoElement() {
        try {
            var videos=document.querySelectorAll('video');
            if(!videos || !videos.length) return null;
            for(var i=videos.length-1;i>=0;i--){
                var v=videos[i], st=window.getComputedStyle ? getComputedStyle(v) : null;
                if(!st || (st.display!=='none' && st.visibility!=='hidden')) return v;
            }
            return videos[videos.length-1];
        } catch(e){return null;}
    }

    function remotePlayerAction(name) {
        var v=remoteVideoElement();
        if(!v) return false;
        try {
            if(name==='play_pause'){
                if(v.paused){var p=v.play();if(p&&p.catch)p.catch(function(){});}
                else v.pause();
                return true;
            }
            if(name==='stop'){
                v.pause();
                try{v.currentTime=0;}catch(e0){}
                return true;
            }
            if(name==='rewind'){
                try{v.currentTime=Math.max(0,(v.currentTime||0)-10);}catch(e1){}
                return true;
            }
            if(name==='forward'){
                try{
                    var n=(v.currentTime||0)+10;
                    if(isFinite(v.duration)) n=Math.min(v.duration,n);
                    v.currentTime=n;
                }catch(e2){}
                return true;
            }
        } catch(e){}
        return false;
    }

    function remotePlayerVolume(name) {
        var v=remoteVideoElement();
        if(!v) return false;
        try {
            if(name==='vol_up'){v.muted=false;v.volume=Math.min(1,(v.volume||0)+0.08);return true;}
            if(name==='vol_down'){v.muted=false;v.volume=Math.max(0,(v.volume||0)-0.08);return true;}
            if(name==='mute'){v.muted=!v.muted;return true;}
        } catch(e){}
        return false;
    }

    function remoteSystemAudio(name) {
        // LG webOS native audio service.
        try {
            if(window.webOS && webOS.service && typeof webOS.service.request==='function'){
                if(name==='vol_up'){
                    webOS.service.request('luna://com.webos.audio',{method:'volumeUp',parameters:{}});
                    return true;
                }
                if(name==='vol_down'){
                    webOS.service.request('luna://com.webos.audio',{method:'volumeDown',parameters:{}});
                    return true;
                }
                if(name==='mute'){
                    REMOTE_MUTE_STATE=!REMOTE_MUTE_STATE;
                    webOS.service.request('luna://com.webos.audio',{method:'setMuted',parameters:{muted:REMOTE_MUTE_STATE}});
                    return true;
                }
            }
        } catch(e){}

        // Samsung Tizen native audio API.
        try {
            if(window.tizen && tizen.tvaudiocontrol){
                if(name==='vol_up'){tizen.tvaudiocontrol.setVolumeUp();return true;}
                if(name==='vol_down'){tizen.tvaudiocontrol.setVolumeDown();return true;}
                if(name==='mute'){
                    var m=false;
                    try{m=!!tizen.tvaudiocontrol.isMute();}catch(e1){}
                    tizen.tvaudiocontrol.setMute(!m);
                    return true;
                }
            }
        } catch(e){}

        // Android/Fire TV/browser/MSX/Windows: active player-volume fallback.
        return remotePlayerVolume(name);
    }

    function remoteOpenSettings() {
        // Universal Lampa settings button in the header.
        try {
            var b=$('.open--settings').first();
            if(b.length){b.trigger('hover:enter');return true;}
        } catch(e){}
        // If the head is not currently active/visible, open it and retry.
        try {
            if(Lampa.Controller && Lampa.Controller.toggle){
                Lampa.Controller.toggle('head');
                setTimeout(function(){
                    try{
                        var b=$('.open--settings').first();
                        if(b.length)b.trigger('hover:enter');
                    }catch(_e){}
                },80);
                return true;
            }
        } catch(e){}
        return false;
    }

    function remoteInfo() {
        var f=remoteFocused();
        if(f){
            try{f.trigger('hover:long');return true;}catch(e){}
        }
        return false;
    }

    function remoteControllerAction(name) {
        name=String(name||'').toLowerCase();
        try {
            REMOTE_LAST_ACTION={name:name,at:Date.now()};

            if(name==='up'||name==='down'||name==='left'||name==='right'||name==='ok'){
                return remoteNavigate(name);
            }

            if(name==='back'){
                if(remoteCallController('back')) return true;
                try{if(Lampa.Modal && Lampa.Modal.opened && Lampa.Modal.opened()){Lampa.Modal.close();return true;}}catch(em){}
                try{if(Lampa.Activity&&Lampa.Activity.backward){Lampa.Activity.backward();return true;}}catch(ea){}
                return remoteSyntheticKey('back');
            }

            if(name==='menu'){
                try{if(Lampa.Controller&&Lampa.Controller.toggle){Lampa.Controller.toggle('menu');return true;}}catch(e){}
            }
            if(name==='settings') return remoteOpenSettings();
            if(name==='info') return remoteInfo();
            if(name==='y7'){openK2FullManager();return true;}
            if(name==='home'){
                try{Lampa.Activity.push({url:'',title:'',component:'main',page:1});return true;}catch(eh){}
            }

            if(name==='play_pause'||name==='stop'||name==='rewind'||name==='forward'){
                return remotePlayerAction(name);
            }

            if(name==='vol_up'||name==='vol_down'||name==='mute'){
                return remoteSystemAudio(name);
            }
        } catch(e){}
        return false;
    }

    function remoteTextInput(text) {
        text=String(text||'').slice(0,300);
        try {
            var el=document.activeElement;
            if(el&&(/^(INPUT|TEXTAREA)$/i).test(el.tagName)){
                el.value=text;
                try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(e1){}
                try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e2){}
                return true;
            }
        } catch(e) {}
        notify('Відкрий поле вводу на TV і повтори');
        return false;
    }

    function executeGuestCommand(c){
        if(!c||!c.type)return;
        if(c.type==='remote_key')remoteControllerAction(String(c.key||''));
        else if(c.type==='remote_text')remoteTextInput(c.text||'');
        else executeCommand(c);
    }

    function ensureGuestRemotePoll(){
        if(REMOTE_GUEST_POLLING||Date.now()>REMOTE_GUEST_UNTIL)return;
        var t=clientToken();if(!t)return;
        REMOTE_GUEST_POLLING=true;
        try{
            var x=new XMLHttpRequest();
            x.open('POST',k2Api('/k2/remote/poll'),true);
            x.timeout=26000;
            x.setRequestHeader('Content-Type','application/json');
            x.onload=function(){
                REMOTE_GUEST_POLLING=false;
                var r={};try{r=JSON.parse(x.responseText||'{}');}catch(e){}
                if(x.status>=200&&x.status<300&&r.ok){
                    var cs=r.commands||[];for(var i=0;i<cs.length;i++)executeGuestCommand(cs[i]);
                    if(r.active){REMOTE_GUEST_UNTIL=Date.now()+Math.max(1000,(r.expires_in||30)*1000);setTimeout(ensureGuestRemotePoll,25);}
                    else REMOTE_GUEST_UNTIL=0;
                } else if(Date.now()<REMOTE_GUEST_UNTIL) setTimeout(ensureGuestRemotePoll,1200);
            };
            x.onerror=function(){REMOTE_GUEST_POLLING=false;if(Date.now()<REMOTE_GUEST_UNTIL)setTimeout(ensureGuestRemotePoll,1600);};
            x.ontimeout=function(){REMOTE_GUEST_POLLING=false;if(Date.now()<REMOTE_GUEST_UNTIL)setTimeout(ensureGuestRemotePoll,30);};
            x.send(JSON.stringify({token:t,wait:20}));
        }catch(e){REMOTE_GUEST_POLLING=false;if(Date.now()<REMOTE_GUEST_UNTIL)setTimeout(ensureGuestRemotePoll,1600);}
    }

    function backupSnapshot() {
        var toggles={}, a=PLUGINS;
        for(var i=0;i<a.length;i++)toggles[a[i].id]=enabled(a[i]);
        return {version:VERSION,toggles:toggles,extras:extraPlugins(),settings:{
            start_page:getStorage(START_PAGE_KEY,'favorite@history'),iptv:getStorage(IPTV_PRESET_KEY,'ua'),
            kids:bool(getStorage(KIDS_MODE_KEY,false)),sync:bool(getStorage(SYNC_ON_KEY,true)),
            quality_min:getStorage(QUALITY_MIN_KEY,720),quality_ua:bool(getStorage(QUALITY_UA_KEY,true)),
            quality_cam:bool(getStorage(QUALITY_CAM_KEY,true)),quality_working:bool(getStorage(QUALITY_WORKING_KEY,true)),
            glass:getStorage('glass_style',false),black:getStorage('black_style',false),animation:getStorage('animation',true),background:getStorage('background',true)
        }};
    }
    function saveBackup(quiet){var t=clientToken();if(!t)return;if(!quiet)notify('Створюю backup…');ajax('POST',k2Api('/k2/backup/save'),{token:t,snapshot:backupSnapshot()},function(){if(!quiet)notify('✓ Backup Y7 створено');},function(){if(!quiet)notify('✕ Backup не створено');});}
    function restoreBackup(){var t=clientToken();if(!t)return;ajax('GET',k2Api('/k2/backup/latest?token='+encodeURIComponent(t)),null,function(r){var b=r.snapshot||{},tog=b.toggles||{},st=b.settings||{};PLUGINS.forEach(function(p){if(typeof tog[p.id]!=='undefined')setEnabled(p,!!tog[p.id]);});if(b.extras)saveExtraPlugins(b.extras);if(st.start_page)setStartPage(st.start_page,true);if(st.iptv)applyIptvPreset(st.iptv,true);if(typeof st.kids!=='undefined')setStorage(KIDS_MODE_KEY,!!st.kids);enforceKidsRestrictions();if(typeof st.sync!=='undefined')setStorage(SYNC_ON_KEY,!!st.sync);if(st.quality_min!==undefined)setStorage(QUALITY_MIN_KEY,st.quality_min);if(st.quality_ua!==undefined)setStorage(QUALITY_UA_KEY,!!st.quality_ua);if(st.quality_cam!==undefined)setStorage(QUALITY_CAM_KEY,!!st.quality_cam);if(st.quality_working!==undefined)setStorage(QUALITY_WORKING_KEY,!!st.quality_working);reconcile(true);sendPolicy(true);notify('✓ Backup відновлено. Перезапусти Lampa.');},function(){notify('✕ Немає backup або сервер недоступний');});}

    function sha256Hex(text, done, fail){
        try{if(!window.crypto||!crypto.subtle)return fail&&fail();var data=new TextEncoder().encode(text);crypto.subtle.digest('SHA-256',data).then(function(buf){var a=new Uint8Array(buf),s='';for(var i=0;i<a.length;i++)s+=('0'+a[i].toString(16)).slice(-2);done(s);}).catch(function(){fail&&fail();});}catch(e){fail&&fail();}
    }
    function checkClientUpdate(manual, channel){
        var t=clientToken();if(!t)return;channel=channel||getStorage(UPDATE_CHANNEL_KEY,'stable');
        ajax('GET',k2Api('/k2/client-manifest?channel='+encodeURIComponent(channel)+'&token='+encodeURIComponent(t)),null,function(m){
            if(!m.ok)return;if(!versionNewer(m.version,VERSION)){if(manual)notify('✓ Y7 '+VERSION+' — актуальна версія');return;}
            var x=new XMLHttpRequest();x.open('GET',m.url+'?token='+encodeURIComponent(t),true);x.timeout=20000;x.onload=function(){if(x.status<200||x.status>=300)return notify('✕ Не вдалося завантажити оновлення');var code=x.responseText||'';sha256Hex(code,function(hex){if(hex.toLowerCase()!==String(m.sha256).toLowerCase())return notify('✕ SHA-256 оновлення не збігається');try{localStorage.setItem('k2_client_cache_version',m.version);localStorage.setItem('k2_client_cache_code',code);notify('✓ Y7 '+m.version+' перевірено. Перезапусти Lampa.');}catch(e){notify('✕ Не вдалося зберегти оновлення');}},function(){notify('✕ WebCrypto недоступний — автооновлення не застосовано');});};x.send();
        },function(){if(manual)notify('✕ Сервер оновлень недоступний');});
    }
    function versionNewer(a,b){function v(x){var z=String(x||'').match(/\d+/g)||[];return [+(z[0]||0),+(z[1]||0),+(z[2]||0),+(z[3]||0)];}a=v(a);b=v(b);for(var i=0;i<4;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return false;}

    function discoverPlugins(){var t=clientToken();if(!t)return;notify('Шукаю нові розширення…');ajax('POST',k2Api('/k2/discover'),{token:t},function(r){var a=r.candidates||[],h='<b>Карантин: '+a.length+' кандидатів</b><br><small>Нічого не встановлюється автоматично. Перевір/схвали через Y7 Admin з телефона.</small><br><br>';for(var i=0;i<Math.min(18,a.length);i++)h+='• '+String(a[i].name||a[i].url)+'<br>';showHtmlModal('Нові плагіни',h);},function(){notify('✕ Каталог недоступний');});}

    function enforceKidsRestrictions(){
        if(!bool(getStorage(KIDS_MODE_KEY,false)))return;
        setStorage(SISI_ON_KEY,false);
        PLUGINS.forEach(function(p){if(p.cat==='adult')setEnabled(p,false);});
    }

    function applyKidsMode(on, fromAdmin){
        var current=bool(getStorage(KIDS_MODE_KEY,false));
        if(!on && current && !fromAdmin){setStorage(KIDS_MODE_KEY,true);notify('🔒 Вимкнення дитячого режиму — тільки через Y7 Admin + PIN.');startRemoteAdmin();return;}
        setStorage(KIDS_MODE_KEY,!!on);
        if(on){enforceKidsRestrictions();applyIptvPreset('kids_ua',true);syncSecureLampac(false);reconcile(false);notify('Дитячий режим увімкнено');}
        else{notify('✓ Дитячий режим вимкнено через Admin PIN');}
        sendPolicy(true);
        if(currentSettingsBody)decorate(currentSettingsBody);
    }

    function executeCommand(c){
        if(!c||!c.type)return;
        if(c.type==='kids')applyKidsMode(!!c.on,true);
        else if(c.type==='iptv')applyIptvPreset(c.preset||'ua',false);
        else if(c.type==='policy'){
            var p=c.policy||{};
            if(p.min_quality!==undefined)setStorage(QUALITY_MIN_KEY,p.min_quality);
            if(p.ua_first!==undefined)setStorage(QUALITY_UA_KEY,!!p.ua_first);
            if(p.hide_cam!==undefined)setStorage(QUALITY_CAM_KEY,!!p.hide_cam);
            if(p.only_working!==undefined)setStorage(QUALITY_WORKING_KEY,!!p.only_working);
            sendPolicy(true);
        }
        else if(c.type==='plugin'){var p=pluginById(c.id);if(p)toggle(p,!!c.on);}
        else if(c.type==='lampac'){
            if(c.online!==undefined)setStorage(LAMPAC_ON_KEY,!!c.online);
            if(c.sisi!==undefined)setStorage(SISI_ON_KEY,!!c.sisi);
            if(bool(getStorage(KIDS_MODE_KEY,false)))setStorage(SISI_ON_KEY,false);
            syncSecureLampac(true);needRestart(true);
        }
        else if(c.type==='start_page')setStartPage(c.value||'favorite@history',false);
        else if(c.type==='sync'){setStorage(SYNC_ON_KEY,!!c.on);syncSecureLampac(true);needRestart(true);}
        else if(c.type==='health_auto')setStorage(HEALTH_AUTO_KEY,!!c.on);
        else if(c.type==='style'){
            if(c.preset==='glass')applyGlassPreset(false);
            else if(c.preset==='oled')applyOledPreset();
            else applyStandardLook();
        }
        else if(c.type==='torr_url')setTorrServer(c.url||'http://127.0.0.1:8090');
        else if(c.type==='check_plugins')checkAllPlugins(true);
        else if(c.type==='check_torr')checkTorrServer();
        else if(c.type==='provider_check')checkProviderHealth();
        else if(c.type==='backup')saveBackup(true);
        else if(c.type==='restore')restoreBackup();
        else if(c.type==='update'){setStorage(UPDATE_CHANNEL_KEY,c.channel||'stable');checkClientUpdate(true,c.channel||'stable');}
        else if(c.type==='update_channel')setStorage(UPDATE_CHANNEL_KEY,c.channel||'stable');
        else if(c.type==='extra_add'){if(addExtraPlugin(c.plugin||{}))notify('✓ Новий плагін додано з карантину');}
        else if(c.type==='kids_config'){kidsStoreConfig(c.rewards||{});}
        else if(c.type==='kids_prefs'){kidsStorePrefs(c.prefs||{});}
        else if(c.type==='kids_reset'){try{localStorage.setItem('y7_kids_reset_pending','1');window.dispatchEvent(new CustomEvent('y7:kids-reset'));notify('Прогрес Y7 Ігор скинуто');}catch(e){}}
        else if(c.type==='kids_open'){try{if(window.Y7KidsArcade){if(c.mode==='aquarium'&&Y7KidsArcade.openAquarium)Y7KidsArcade.openAquarium();else if(Y7KidsArcade.open)Y7KidsArcade.open();}}catch(e){notify('Y7 Ігри ще не готові');}}
        else if(c.type==='kids_content_refresh'){kidsRefreshContent();}
        else if(c.type==='remote_key')remoteControllerAction(String(c.key||''));
        else if(c.type==='remote_text')remoteTextInput(c.text||'');
        setTimeout(heartbeat,250);
    }
    function heartbeat(){
        var t=clientToken();if(!t)return;
        var ph=healthCache(),summary=ph&&ph.summary?ph.summary:{},hm=healthMap(),plist=[];
        PLUGINS.forEach(function(p){var h=hm[p.id]||{};plist.push({id:p.id,name:p.name,cat:p.cat,on:enabled(p),health:h.state||'',http:h.http||0});});
        var settings={
            start_page:getStorage(START_PAGE_KEY,'favorite@history'),sync:bool(getStorage(SYNC_ON_KEY,true)),
            health_auto:bool(getStorage(HEALTH_AUTO_KEY,true)),torr_url:getStorage('k2pm_ts_url','http://127.0.0.1:8090'),
            lampac_online:bool(getStorage(LAMPAC_ON_KEY,true)),sisi:bool(getStorage(SISI_ON_KEY,false)),
            glass:bool(getStorage('glass_style',false)),black:bool(getStorage('black_style',false)),
            animation:bool(getStorage('animation',true)),background:bool(getStorage('background',true))
        };
        ajax('POST',k2Api('/k2/heartbeat'),{
            token:t,version:VERSION,torrserver:bool(getStorage(TORR_LAST_KEY,false)),plugin_summary:summary,
            iptv_preset:getStorage(IPTV_PRESET_KEY,'ua'),kids_mode:bool(getStorage(KIDS_MODE_KEY,false)),
            update_channel:getStorage(UPDATE_CHANNEL_KEY,'stable'),plugins:plist,settings:settings,
            remote_caps:remotePlatformCaps()
        },function(r){
            if(r.policy&&r.policy.kids_rewards)kidsStoreConfig(r.policy.kids_rewards);
            var cs=r.commands||[];for(var i=0;i<cs.length;i++)executeCommand(cs[i]);
            if(r.remote_active){REMOTE_GUEST_UNTIL=Date.now()+Math.max(1000,(r.remote_expires_in||30)*1000);ensureGuestRemotePoll();}
        },function(){});
    }

    function pollAdminCommands(){
        if(Date.now()>REMOTE_ADMIN_UNTIL)return;
        var t=clientToken();if(!t)return;
        ajax('POST',k2Api('/k2/commands'),{token:t},function(r){
            var cs=r.commands||[];
            if(!cs.length)return;
            for(var i=0;i<cs.length;i++)executeCommand(cs[i]);
            // Send the changed state back immediately instead of waiting for the 30 s heartbeat.
            setTimeout(heartbeat,250);
        },function(){});
    }

    function healthCache() {
        try {
            var c = Lampa.Storage.get(HEALTH_CACHE_KEY, null);
            return c && typeof c === 'object' ? c : null;
        } catch (e) { return null; }
    }

    function setHealthCache(c) {
        try { Lampa.Storage.set(HEALTH_CACHE_KEY, c || null); } catch (e) {}
        applyHealthSuppression(c);
    }
    function applyHealthSuppression(c){
        if(!c||!c.results)return;
        var counts=getStorage(HEALTH_FAIL_KEY,{}),sup=getStorage(HEALTH_SUPPRESS_KEY,{}),changed=false;
        for(var i=0;i<c.results.length;i++){
            var r=c.results[i],p=pluginById(r.id),ep=null,isExtra=false;
            if(!p){ep=extraPluginById(r.id);p=ep;isExtra=!!ep;} if(!p)continue;
            if(r.state==='dead')counts[r.id]=(counts[r.id]||0)+1;else if(r.state==='ok')counts[r.id]=0;
            var hardDead=r.state==='dead'&&(r.message==='html_not_plugin'||r.message==='expired_token'||r.message==='not_found'||r.message==='server_error'||r.message==='content_error');
            var active=isExtra?(p.on!==false):enabled(p);
            if((hardDead||counts[r.id]>=2) && active){if(!sup[r.id]){sup[r.id]=true;if(remove(p.url))changed=true;needRestart(true);}}
            if(r.state==='ok' && sup[r.id]){delete sup[r.id];if(active&&add(p.url,p)){changed=true;load([p.url]);}}
        }
        setStorage(HEALTH_FAIL_KEY,counts);setStorage(HEALTH_SUPPRESS_KEY,sup);if(changed)save();
    }

    function healthItems() {
        var list = [];
        PLUGINS.forEach(function(p) {
            list.push({id:p.id,name:p.name,url:p.url});
        });
        extraPlugins().forEach(function(p){
            if(p&&p.url)list.push({id:p.id||('extra_'+norm(p.url)),name:p.name||'Extra plugin',url:p.url});
        });

        var t = clientToken();
        if (t) {
            list.push({id:'__lampac_online',name:'Lampac Online',url:secureOnlineUrl()});
            list.push({id:'__lampac_sisi',name:'SISI',url:secureSisiUrl()});
            list.push({id:'__lampac_sync',name:'Y7 Sync',url:secureSyncUrl()});
        }
        return list;
    }

    function healthMap() {
        var c = healthCache(), m = {};
        if (!c || !c.results) return m;
        for (var i=0;i<c.results.length;i++) {
            if (c.results[i] && c.results[i].id) m[c.results[i].id] = c.results[i];
        }
        return m;
    }

    function healthStatusText(r) {
        if (!r) return {cls:'unknown',text:'? не перевірено'};
        if (r.state === 'ok') return {cls:'ok',text:'✓ доступний'};
        if (r.state === 'warn') {
            return {cls:'warn',text:r.http ? ('⚠ HTTP '+r.http) : '⚠ відповідає'};
        }
        if (r.state === 'blocked') return {cls:'warn',text:'⚠ перевірку заблоковано'};
        return {cls:'dead',text:r.message==='html_not_plugin'?'✕ повертає HTML замість плагіна':(r.message==='expired_token'?'✕ токен/доступ протерміновано':(r.http ? ('✕ HTTP '+r.http) : '✕ недоступний'))};
    }

    function healthRow(body, dataName, result) {
        if (!body || !body.length) return;
        var row = body.find('[data-name="'+dataName+'"]').first();
        if (!row.length) return;

        row.find('.k2pm-health').remove();
        var s = healthStatusText(result);
        var sup=getStorage(HEALTH_SUPPRESS_KEY,{}); if(result&&sup[result.id])s={cls:'dead',text:'⏸ авто-пауза: джерело мертве'};
        var extra = '';
        if (result && result.ms) extra = ' · '+result.ms+' ms';

        row.append(
            $('<div class="k2pm-health k2pm-health-'+s.cls+'">'+s.text+extra+'</div>')
        );
    }

    function renderHealth(body) {
        if (!body || !body.length) return;
        var map = healthMap();

        PLUGINS.forEach(function(p) {
            healthRow(body, key(p), map[p.id]);
        });

        healthRow(body, LAMPAC_ON_KEY, map.__lampac_online);
        healthRow(body, SISI_ON_KEY, map.__lampac_sisi);
        healthRow(body, SYNC_ON_KEY, map.__lampac_sync);

        var c = healthCache();
        var line = body.find('.k2pm-health-summary').first();
        if (!line.length) {
            line = $('<div class="k2pm-health-summary"></div>');
            var trigger = body.find('[data-name="k2pm_check_plugins"]').first();
            if (trigger.length) trigger.before(line);
        }

        if (!c || !c.checked_at) {
            line.html('Статус джерел: ще не перевірено');
            return;
        }

        var sum = c.summary || {};
        var dt = new Date(c.checked_at * 1000);
        var tm = '';
        try {
            tm = ('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2);
        } catch(e) {}

        line.html(
            'Статус джерел: <b>✓ '+(sum.ok||0)+'</b> · '+
            '<b>⚠ '+((sum.warn||0)+(sum.blocked||0))+'</b> · '+
            '<b>✕ '+(sum.dead||0)+'</b>'+
            (tm ? ' · перевірено '+tm : '')
        );
    }

    function checkAllPlugins(manual) {
        if (healthBusy) {
            if (manual) notify('Перевірка вже виконується…');
            return;
        }

        var token = clientToken();
        if (!token) {
            if (manual) notify('Спочатку підключи Y7 Core через QR.');
            return;
        }

        healthBusy = true;
        if (manual) notify('Перевіряю всі джерела…');

        if (currentSettingsBody && currentSettingsBody.length) {
            currentSettingsBody.find('.k2pm-health-summary').html('⌛ Перевіряю джерела…');
        }

        try {
            var x = new XMLHttpRequest();
            x.open('POST', baseUrl() + '/k2/plugin-health', true);
            x.timeout = 45000;
            x.setRequestHeader('Content-Type','application/json');

            x.onload = function() {
                healthBusy = false;
                var r = null;
                try { r = JSON.parse(x.responseText || '{}'); } catch(e) {}

                if (x.status >= 200 && x.status < 300 && r && r.ok) {
                    setHealthCache(r);
                    if (currentSettingsBody && currentSettingsBody.length) {
                        renderHealth(currentSettingsBody);
                    }

                    if (manual) {
                        var s = r.summary || {};
                        notify(
                            'Y7: ✓ '+(s.ok||0)+
                            ' · ⚠ '+((s.warn||0)+(s.blocked||0))+
                            ' · ✕ '+(s.dead||0)
                        );
                    }
                } else if (manual) {
                    notify('Не вдалося отримати статус плагінів.');
                }
            };

            x.onerror = function() {
                healthBusy = false;
                if (manual) notify('Сервер перевірки недоступний.');
            };

            x.ontimeout = function() {
                healthBusy = false;
                if (manual) notify('Перевірка зайняла занадто багато часу.');
            };

            x.send(JSON.stringify({
                token: token,
                plugins: healthItems()
            }));
        } catch(e) {
            healthBusy = false;
            if (manual) notify('Помилка перевірки плагінів.');
        }
    }

    function maybeAutoHealth() {
        var auto = true;
        try { auto = bool(Lampa.Storage.get(HEALTH_AUTO_KEY, true)); } catch(e) {}

        if (!auto || !clientToken() || healthBusy) return;

        var c = healthCache();
        var stale = !c || !c.checked_at ||
            ((Date.now() - c.checked_at*1000) > HEALTH_TTL);

        if (stale) setTimeout(function(){ checkAllPlugins(false); }, 700);
    }

    function setTorrServer(v) {
        var u=String(v||'').trim();
        if (!u) u='http://127.0.0.1:8090';
        if (!/^https?:\/\//i.test(u)) u='http://'+u;
        u=u.replace(/\/+$/,'');
        try {
            Lampa.Storage.set('k2pm_ts_url',u);
            Lampa.Storage.set('torrserver_url',u);
        } catch(e){}
        notify('TorrServer: '+u);
    }

    function checkTorrServer() {
        var u='http://127.0.0.1:8090';
        try { u=Lampa.Storage.get('k2pm_ts_url',u)||u; } catch(e){}
        try {
            var x=new XMLHttpRequest();
            x.open('GET',u.replace(/\/+$/,'')+'/echo',true);
            x.timeout=6000;
            x.onload=function(){var ok=x.status>=200&&x.status<500;setStorage(TORR_LAST_KEY,ok);notify(ok?'✓ TorrServer доступний':'✕ TorrServer HTTP '+x.status);};
            x.onerror=function(){setStorage(TORR_LAST_KEY,false);notify('✕ TorrServer не відповідає');};
            x.ontimeout=x.onerror;
            x.send();
        } catch(e){notify('✕ Не вдалося перевірити TorrServer');}
    }

    function addParam(o) {
        try { Lampa.SettingsApi.addParam(o); } catch(e){ log('param error',e); }
    }


    function k2Svg(name) {
        var p='';
        if(name==='server')p='<path d="M5 5h14v5H5zM5 14h14v5H5z"/><circle cx="8" cy="7.5" r="1" fill="currentColor"/><circle cx="8" cy="16.5" r="1" fill="currentColor"/>';
        else if(name==='health')p='<path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='tv')p='<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='kids')p='<circle cx="12" cy="8" r="4"/><path d="M5 21c.8-5 3-7 7-7s6.2 2 7 7" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='quality')p='<path d="M4 17l4-4 3 3 6-7 3 3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='backup')p='<path d="M5 3h11l3 3v15H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3v6h8V3M8 21v-7h8v7" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='home')p='<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='film')p='<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 5v14M16 5v14M3 9h5M16 9h5M3 15h5M16 15h5" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        else if(name==='torrent')p='<path d="M12 3v12M7 10l5 5 5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='lock')p='<rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='collection')p='<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>';
        else if(name==='design')p='<path d="M12 3a9 9 0 100 18c2 0 2-3 4-3h2a3 3 0 000-6h-1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="9" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="7" cy="13" r="1"/>';
        else p='<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/>';
        return '<svg class="k2f-icon" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
    }

    function openK2FullManager() {
        if(FULL_OPENING)return;
        FULL_OPENING=true;
        try{
            Lampa.Activity.push({url:'',title:'Y7 Media',component:FULL_COMPONENT,page:1});
        }catch(e){
            FULL_OPENING=false;
            notify('Не вдалося відкрити Y7 Media');
        }
        setTimeout(function(){FULL_OPENING=false;},700);
    }

    function registerFullManager() {
        try{
            Lampa.Component.add(FULL_COMPONENT,function(object){
                var self=this;
                var scroll=new Lampa.Scroll({mask:false,over:true,nopadding:true});
                var root=$('<div class="k2f-root"></div>');
                var body=$('<div class="k2f-body"></div>');
                var last=false;

                function statusText(r){
                    if(!r)return 'не перевірено';
                    if(r.state==='ok')return 'доступний'+(r.ms?' · '+r.ms+' ms':'');
                    if(r.state==='warn')return 'відповідає'+(r.http?' · HTTP '+r.http:'');
                    if(r.state==='blocked')return 'перевірку обмежено';
                    return 'недоступний'+(r.http?' · HTTP '+r.http:'');
                }
                function section(title,icon){
                    body.append('<div class="k2f-section">'+k2Svg(icon)+'<span>'+title+'</span></div>');
                }
                function row(title,desc,value,action,cls){
                    var r=$('<div class="k2f-row selector '+(cls||'')+'"><div class="k2f-row-main"><div class="k2f-row-title"></div><div class="k2f-row-desc"></div></div><div class="k2f-value"></div></div>');
                    r.find('.k2f-row-title').text(title);
                    r.find('.k2f-row-desc').text(desc||'');
                    r.find('.k2f-value').text(value||'');
                    r.on('hover:focus',function(){
                        last=r[0];
                        try{scroll.update(r,true);}catch(e){
                            try{scroll.immediate(r,true);}catch(_e){}
                        }
                        setTimeout(function(){
                            try{scroll.immediate(r,true);}catch(_e){}
                        },35);
                    });
                    r.on('hover:enter',function(){if(action)action(r);});
                    body.append(r);return r;
                }
                function toggleRow(title,desc,getter,setter){
                    var r=row(title,desc,getter()?'ON':'OFF',function(x){var nv=!getter();setter(nv);x.find('.k2f-value').text(nv?'ON':'OFF');x.toggleClass('k2f-on',nv);});
                    r.toggleClass('k2f-on',getter());return r;
                }
                function selectRow(title,desc,values,current,setter){
                    return row(title,desc,values[current]||String(current),function(x){
                        var items=[];Object.keys(values).forEach(function(k){items.push({title:values[k],value:k,selected:String(k)===String(current)});});
                        Lampa.Select.show({title:title,items:items,onBack:function(){Lampa.Controller.toggle('k2full');},onSelect:function(a){current=a.value;setter(a.value);x.find('.k2f-value').text(values[a.value]||a.value);Lampa.Select.close();Lampa.Controller.toggle('k2full');}});
                    });
                }
                function pluginRow(p){
                    var hm=healthMap(), hr=hm[p.id];
                    var val=(enabled(p)?'ON':'OFF')+' · '+statusText(hr);
                    var r=row(p.name,p.desc,val,function(x){var nv=!enabled(p);toggle(p,nv);x.find('.k2f-value').text((nv?'ON':'OFF')+' · '+statusText(healthMap()[p.id]));x.toggleClass('k2f-on',nv);});
                    r.toggleClass('k2f-on',enabled(p));return r;
                }
                function dynToggle(title,desc,key,def,onChange,healthId){
                    function get(){return bool(getStorage(key,def));}
                    var hr=healthId?healthMap()[healthId]:null;
                    var r=row(title,desc,(get()?'ON':'OFF')+(healthId?' · '+statusText(hr):''),function(x){var nv=!get();setStorage(key,nv);onChange(nv);x.find('.k2f-value').text((nv?'ON':'OFF')+(healthId?' · '+statusText(healthMap()[healthId]):''));x.toggleClass('k2f-on',nv);});
                    r.toggleClass('k2f-on',get());return r;
                }

                function build(){
                    body.empty();
                    var paired=!!clientToken();
                    var kids=bool(getStorage(KIDS_MODE_KEY,false));
                    var health=healthCache()||{}, hs=health.summary||{};
                    var healthy=(hs.ok||0)+(hs.warn||0);
                    var total=healthy+(hs.dead||0)+(hs.blocked||0);

                    body.append(
                        '<div class="k2f-head">'+
                        '<div class="k2f-logo">Y7</div>'+
                        '<div class="k2f-headtext"><div class="k2f-title">Y7 Media</div>'+
                        '<div class="k2f-sub">v'+VERSION+' · Core '+(paired?'online':'offline')+
                        ' · '+countEnabled()+' активних'+(kids?' · Y7 Kids ON':'')+'</div></div>'+
                        '<div class="k2f-summary">Sources <b>'+healthy+'/'+total+'</b></div>'+
                        '</div>'
                    );

                    section('Швидкий доступ','home');
                    row(
                        paired?'Y7 Core підключено':'Підключити Y7 Core',
                        paired?'Захищене з’єднання з Media Server активне.':'QR + Y7 Admin PIN. Довгий token вручну не вводиться.',
                        paired?'ONLINE':'PAIR',
                        function(){if(paired)checkSecureLampac();else startPairing();},
                        paired?'k2f-on':''
                    );
                    row('Y7 Admin','Керування TV з телефона: плагіни, IPTV, Kids, backup та update.','OPEN',startRemoteAdmin);
                    row('Y7 TV Manager','Приватний QR + коротка адреса для телефону, без Git і без довгого token.','QR / LINK',startGuestRemote);
                    row('Переприв’язати TV','Натисни двічі протягом 15 секунд. Відкличе стару прив’язку і створить новий код.','REPAIR',function(){confirmForgetSecureLampac(true);});
                    row('Забути підключення','Натисни двічі протягом 15 секунд. Видалить тільки прив’язку Y7 цього TV.','FORGET',function(){confirmForgetSecureLampac(false);});
                    row('Закрити Y7 TV Manager','Одразу закрити доступ Y7 TV Manager до цього TV.','REVOKE',stopGuestRemote);
                    row('Y7 Health','Core, Chromium, джерела, TorrServer, IPTV та autorecovery.','CHECK',checkSystemHealth);
                    row('TorrServer','Локальний TorrServer цього LG: '+String(getStorage('k2pm_ts_url','http://127.0.0.1:8090')),'CHECK',checkTorrServer);

                    section('Перегляд і якість','quality');
                    dynToggle('Lampac Online','Основні онлайн-джерела через Y7 Core.',LAMPAC_ON_KEY,true,function(){syncSecureLampac(true);needRestart(true);},'__lampac_online');
                    row('Перевірити балансери','Робочі джерела та визначена якість 4K / 1080p / 720p.','CHECK',checkProviderHealth);
                    selectRow('Мінімальна відома якість','Невідому якість Y7 не відкидає.',{0:'Будь-яка',720:'720p+',1080:'1080p+',2160:'4K, якщо визначено'},String(getStorage(QUALITY_MIN_KEY,720)),function(v){setStorage(QUALITY_MIN_KEY,parseInt(v,10)||0);sendPolicy(false);});
                    toggleRow('Українська — вище','UA-позначені варіанти отримують додатковий пріоритет.',function(){return bool(getStorage(QUALITY_UA_KEY,true));},function(v){setStorage(QUALITY_UA_KEY,v);sendPolicy(false);});
                    toggleRow('Ховати CAM / TS','Прибирає очевидно низькоякісні джерела.',function(){return bool(getStorage(QUALITY_CAM_KEY,true));},function(v){setStorage(QUALITY_CAM_KEY,v);sendPolicy(false);});
                    toggleRow('Тільки робочі','Після health-check мертві балансери не показуються.',function(){return bool(getStorage(QUALITY_WORKING_KEY,true));},function(v){setStorage(QUALITY_WORKING_KEY,v);sendPolicy(false);});

                    section('IPTV, футбол і діти','tv');
                    var iv={};Object.keys(IPTV_PRESETS).forEach(function(k){iv[k]=IPTV_PRESETS[k].title;});
                    selectRow('IPTV пресет','Україна, футбол, спорт, Kids, Animation та інші списки.',iv,String(getStorage(IPTV_PRESET_KEY,'ua')),function(v){applyIptvPreset(v,false);});
                    row('Футбол','Швидко ввімкнути football-пресет.','APPLY',function(){applyIptvPreset('football',false);});
                    toggleRow('Y7 Kids','Kids UA + блокування 18+. Вимкнення захищене Y7 Admin PIN.',function(){return bool(getStorage(KIDS_MODE_KEY,false));},function(v){applyKidsMode(v,false);});
                    row('Y7 Ігри','30 навчальних ігор, тематичні кімнати, гумор, рівні та власні герої.','OPEN',function(){try{if(window.Y7KidsArcade&&Y7KidsArcade.open)Y7KidsArcade.open();else notify('Y7 Ігри ще завантажуються…');}catch(e){notify('Y7 Ігри недоступні');}});
                    row('Живий акваріум','Повноекранна жива заставка з рибками та дитячими малюнками.','OPEN',function(){try{if(window.Y7KidsArcade&&Y7KidsArcade.openAquarium)Y7KidsArcade.openAquarium();else notify('Y7 Ігри ще завантажуються…');}catch(e){notify('Акваріум недоступний');}});
                    row('Малюнки та нагороди','Додати малюнки, налаштувати MEGOGO / YouTube / PlayStation з телефона.','PHONE',startRemoteAdmin);
                    PLUGINS.forEach(function(p){if(p.cat==='kids')pluginRow(p);});

                    section('Онлайн-джерела','film');
                    PLUGINS.forEach(function(p){if(p.cat==='online')pluginRow(p);});

                    section('Торренти','torrent');
                    PLUGINS.forEach(function(p){if(p.cat==='torrent')pluginRow(p);});

                    section('Колекції та каталоги','collection');
                    PLUGINS.forEach(function(p){if(p.cat==='collections')pluginRow(p);});

                    section('TV і спорт','tv');
                    PLUGINS.forEach(function(p){if(p.cat==='tv')pluginRow(p);});

                    section('Вигляд','design');
                    row('Y7 Glass','Штатний glass-стиль Lampa без перебудови картки фільму.','APPLY',function(){applyGlassPreset(false);});
                    row('Y7 OLED Black','Темний варіант для OLED / темної кімнати.','APPLY',applyOledPreset);
                    row('Стандартна Lampa','Повернути штатний вигляд без Y7 preset.','APPLY',applyStandardLook);
                    PLUGINS.forEach(function(p){if(p.cat==='design')pluginRow(p);});

                    section('Система і обслуговування','backup');
                    selectRow('Стартова сторінка','Звичайна штатна стартова сторінка Lampa.',{'favorite@history':'Історія переглядів','main':'Головна','favorite@bookmarks':'Закладки','mytorrents':'Мої торренти','last':'Останній екран'},String(getStorage(START_PAGE_KEY,'favorite@history')),function(v){setStartPage(v,false);});
                    toggleRow('Y7 Sync','Спільні закладки та позиція перегляду між прив’язаними TV.',function(){return bool(getStorage(SYNC_ON_KEY,true));},function(v){setStorage(SYNC_ON_KEY,v);syncSecureLampac(true);needRestart(true);});
                    row('Перевірити всі плагіни','Оновити статус кожного джерела.','CHECK',function(){checkAllPlugins(true);});
                    row('Видалити дублікати розширень','Залишити один запис для кожної однакової адреси у стандартних Розширеннях Lampa.','CLEAN',function(){cleanupPluginDuplicates(false);});
                    toggleRow('Автоперевірка плагінів','Health-кеш приблизно раз на 6 годин.',function(){return bool(getStorage(HEALTH_AUTO_KEY,true));},function(v){setStorage(HEALTH_AUTO_KEY,v);});
                    row('Створити backup','Налаштування, плагіни, IPTV, Kids і вигляд — без секретів.','RUN',function(){saveBackup(false);});
                    row('Відновити backup','Відновити останній backup Y7.','RUN',restoreBackup);
                    selectRow('Канал оновлень','Stable або Beta.',{stable:'Stable',beta:'Beta'},String(getStorage(UPDATE_CHANNEL_KEY,'stable')),function(v){setStorage(UPDATE_CHANNEL_KEY,v);});
                    row('Перевірити оновлення','Застосування тільки після SHA-256 перевірки.','CHECK',function(){checkClientUpdate(true);});
                    row('Пошук нових плагінів','Нові URL потрапляють тільки в карантин.','SCAN',discoverPlugins);

                    section('Корисне','health');
                    PLUGINS.forEach(function(p){if(p.cat==='utils')pluginRow(p);});

                    if(!kids){
                        section('18+','lock');
                        dynToggle('SISI','18+ джерела через Y7 Core.',SISI_ON_KEY,false,function(){syncSecureLampac(true);needRestart(true);},'__lampac_sisi');
                        PLUGINS.forEach(function(p){if(p.cat==='adult')pluginRow(p);});
                    }
                }

                this.create=function(){
                    style();
                    build();
                    scroll.append(body);root.append(scroll.render());
                    try{this.activity.loader(false);}catch(e){}
                    return this.render();
                };
                this.render=function(){return root;};
                this.start=function(){
                    if(Lampa.Activity.active().activity!==this.activity)return;
                    Lampa.Controller.add('k2full',{
                        toggle:function(){Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last||root.find('.selector')[0],root);},
                        up:function(){Navigator.move('up');setTimeout(function(){var f=root.find('.selector.focus').first();if(f.length)try{scroll.immediate(f,true);}catch(e){}},0);},
                        down:function(){Navigator.move('down');setTimeout(function(){var f=root.find('.selector.focus').first();if(f.length)try{scroll.immediate(f,true);}catch(e){}},0);},
                        left:function(){if(Navigator.canmove('left')){Navigator.move('left');setTimeout(function(){var f=root.find('.selector.focus').first();if(f.length)try{scroll.immediate(f,true);}catch(e){}},0);}else Lampa.Controller.toggle('menu');},
                        right:function(){Navigator.move('right');setTimeout(function(){var f=root.find('.selector.focus').first();if(f.length)try{scroll.immediate(f,true);}catch(e){}},0);},
                        back:self.back.bind(self)
                    });
                    Lampa.Controller.toggle('k2full');
                };
                this.back=function(){Lampa.Activity.backward();};
                this.pause=function(){};this.stop=function(){};
                this.destroy=function(){try{scroll.destroy();}catch(e){}root.remove();body.remove();};
            });
        }catch(e){log('full manager register error',e);}
    }

    function setupSettings() {
        try {
            Lampa.SettingsApi.addComponent({component:COMPONENT,name:'Y7 Media',icon:ICON});
        } catch(e){}

        addParam({component:COMPONENT,param:{name:'y7_native_open_manager',type:'trigger',default:false},field:{name:'Відкрити Y7 Media — розширене меню',description:'Повний менеджер Y7. Стандартні налаштування Lampa не перекриваються.'},onChange:function(){setStorage('y7_native_open_manager',false);openK2FullManager();}});
        addParam({component:COMPONENT,param:{name:'y7_native_phone_manager',type:'trigger',default:false},field:{name:'Y7 TV Manager — телефон / QR / адреса',description:'Показати приватний QR і коротке посилання на керування саме цим телевізором.'},onChange:function(){setStorage('y7_native_phone_manager',false);startGuestRemote();}});
        addParam({component:COMPONENT,param:{name:'y7_native_repair',type:'trigger',default:false},field:{name:'Переприв’язати цей TV до Y7 Core',description:'Два натискання для підтвердження. Видалення прив’язки й нова сесія з кодом / QR.'},onChange:function(){setStorage('y7_native_repair',false);confirmForgetSecureLampac(true);}});
        addParam({component:COMPONENT,param:{name:'y7_native_revoke_remote',type:'trigger',default:false},field:{name:'Відкликати доступ телефона',description:'Завершити активну приватну сесію TV Manager, без видалення прив’язки TV.'},onChange:function(){setStorage('y7_native_revoke_remote',false);stopGuestRemote();}});

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_pair_secure',type:'trigger',default:false},
            field:{name:'Підключити Y7 Core через QR',description:'TV покаже QR і короткий код. На телефоні вводиш тільки Y7 Admin PIN.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_pair_secure',false);}catch(e){}
                startPairing();
            }
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_secure',type:'trigger',default:false},
            field:{name:'Перевірити Y7 Core',description:'Перевіряє сервер і авторизацію цього телевізора.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_check_secure',false);}catch(e){}
                checkSecureLampac();
            }
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_forget_secure',type:'trigger',default:false},
            field:{name:'Забути підключення Lampac',description:'Видаляє token тільки з цього TV. Для нового підключення використовуй QR.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_forget_secure',false);}catch(e){}
                confirmForgetSecureLampac(false);
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_ts_url',type:'input',values:'',default:'http://127.0.0.1:8090'},
            field:{name:'TorrServer на цьому LG TV',description:'Для твого LG: http://127.0.0.1:8090'},
            onChange:setTorrServer
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_ts',type:'trigger',default:false},
            field:{name:'Перевірити TorrServer',description:'Перевірка локального TorrServer на LG.'},
            onChange:function(){try{Lampa.Storage.set('k2pm_check_ts',false);}catch(e){}checkTorrServer();}
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_plugins',type:'trigger',default:false},
            field:{name:'Перевірити всі плагіни',description:'Перевірка кожного джерела через K2 сервер. Статус з’явиться прямо під кожним плагіном.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_check_plugins',false);}catch(e){}
                checkAllPlugins(true);
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_remove_duplicate_plugins',type:'trigger',default:false},
            field:{name:'Видалити дублікати плагінів',description:'Чистить реальний список Розширень Lampa: залишає один запис на однаковий URL і не дає BWA/Prestige дублюватися після перезапуску.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_remove_duplicate_plugins',false);}catch(e){}
                cleanupPluginDuplicates(false);
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:HEALTH_AUTO_KEY,type:'trigger',default:true},
            field:{name:'Автоперевірка плагінів',description:'Оновлювати статуси автоматично приблизно раз на 6 годин.'}
        });

        addParam({component:COMPONENT,param:{name:'k2pm_system_health',type:'trigger',default:false},field:{name:'Y7 Health',description:'Lampac, Chromium, балансери, TorrServer TV, uptime та autorecovery.'},onChange:function(){setStorage('k2pm_system_health',false);checkSystemHealth();}});
        addParam({component:COMPONENT,param:{name:'k2pm_provider_health',type:'trigger',default:false},field:{name:'Перевірити балансери Lampac',description:'Реальний пошук тестового фільму: робота джерела + визначена якість 4K/1080/720.'},onChange:function(){setStorage('k2pm_provider_health',false);checkProviderHealth();}});
        addParam({component:COMPONENT,param:{name:'k2pm_remote_admin',type:'trigger',default:false},field:{name:'Y7 Admin на телефоні',description:'QR → Admin PIN → здоров’я, Kids, IPTV, якість, плагіни, backup та updates.'},onChange:function(){setStorage('k2pm_remote_admin',false);startRemoteAdmin();}});

        addParam({component:COMPONENT,param:{name:KIDS_MODE_KEY,type:'trigger',default:false},field:{name:'Дитячий режим',description:'Приховує/вимикає 18+ та ставить український дитячий IPTV. Вимкнення — тільки через телефон + Admin PIN.'},onChange:function(v){applyKidsMode(bool(v),false);}});

        addParam({component:COMPONENT,param:{name:SYNC_ON_KEY,type:'trigger',default:true},field:{name:'Y7 Sync',description:'Спільні закладки/історія/позиція перегляду між усіма прив’язаними TV без профілів.'},onChange:function(){syncSecureLampac(true);needRestart(true);}});

        addParam({component:COMPONENT,param:{name:QUALITY_MIN_KEY,type:'select',values:{0:'Будь-яка',720:'720p+',1080:'1080p+',2160:'4K, якщо визначено'},default:720},field:{name:'Мінімальна відома якість Lampac',description:'Невідому якість не відкидає; відомі низькі якості опускає/ховає.'},onChange:function(){sendPolicy(false);}});
        addParam({component:COMPONENT,param:{name:QUALITY_UA_KEY,type:'trigger',default:true},field:{name:'Українська — вище',description:'Українські/UA позначені джерела отримують додатковий пріоритет.'},onChange:function(){sendPolicy(false);}});
        addParam({component:COMPONENT,param:{name:QUALITY_CAM_KEY,type:'trigger',default:true},field:{name:'Ховати CAM / TS',description:'Не показувати очевидно низькоякісні CAM/TS/TC варіанти.'},onChange:function(){sendPolicy(false);}});
        addParam({component:COMPONENT,param:{name:QUALITY_WORKING_KEY,type:'trigger',default:true},field:{name:'Після перевірки — тільки робочі',description:'Коли Lampac завершив life-check, мертві балансери прибираються зі списку.'},onChange:function(){sendPolicy(false);}});

        addParam({component:COMPONENT,param:{name:'k2pm_backup_now',type:'trigger',default:false},field:{name:'Створити backup K2',description:'Зберігає без секретів налаштування, плагіни, IPTV, Kids та дизайн на сервері.'},onChange:function(){setStorage('k2pm_backup_now',false);saveBackup(false);}});
        addParam({component:COMPONENT,param:{name:'k2pm_restore_backup',type:'trigger',default:false},field:{name:'Відновити останній backup',description:'Відновити K2 налаштування. Pairing/token не переноситься.'},onChange:function(){setStorage('k2pm_restore_backup',false);restoreBackup();}});
        addParam({component:COMPONENT,param:{name:UPDATE_CHANNEL_KEY,type:'select',values:{stable:'Stable',beta:'Beta'},default:'stable'},field:{name:'Канал оновлень K2',description:'Оновлення завантажується з твого K2 сервера й застосовується тільки після SHA-256 перевірки.'}});
        addParam({component:COMPONENT,param:{name:'k2pm_update_check',type:'trigger',default:false},field:{name:'Перевірити оновлення K2',description:'Без зміни GitHub URL: перевірене оновлення активується після рестарту Lampa.'},onChange:function(){setStorage('k2pm_update_check',false);checkClientUpdate(true);}});
        addParam({component:COMPONENT,param:{name:'k2pm_discover',type:'trigger',default:false},field:{name:'Знайти нові плагіни',description:'Нові URL лише потрапляють у карантин; автоматично нічого не встановлюється.'},onChange:function(){setStorage('k2pm_discover',false);discoverPlugins();}});

        // Startup / behavior.
        addParam({
            component:COMPONENT,
            param:{
                name:START_PAGE_KEY,
                type:'select',
                values:{
                    'favorite@history':'Історія переглядів',
                    'main':'Головна',
                    'favorite@bookmarks':'Закладки',
                    'mytorrents':'Мої торренти',
                    'last':'Останній відкритий екран'
                },
                default:'favorite@history'
            },
            field:{name:'Стартова сторінка',description:'За замовчуванням K2 відкриває Історію переглядів.'},
            onChange:function(v){setStartPage(v,false);}
        });

        // IPTV presets. Custom URL is still available in the IPTV plugin settings.
        addParam({
            component:COMPONENT,
            param:{
                name:IPTV_PRESET_KEY,
                type:'select',
                values:{
                    ua:'Україна — публічні канали',
                    ukr:'Україномовні — весь світ',
                    football:'Футбол — публічні спортивні канали',
                    sports:'Спорт — світ',
                    kids_ua:'Дітям — українське',
                    kids_world:'🧒 Дітям — світ',
                    animation:'Мультфільми / анімація',
                    education:'📚 Освітні канали',
                    news:'Новини — світ',
                    movies:'Кіно — світ',
                    music:'Музика — світ',
                    world:'Усі категорії — світ'
                },
                default:'ua'
            },
            field:{name:'Готовий IPTV-плейлист',description:'Безкоштовні публічні списки. Окремі канали можуть змінюватися або бути геообмежені.'},
            onChange:function(v){applyIptvPreset(v,false);}
        });
        addParam({component:COMPONENT,param:{name:'k2pm_football_now',type:'trigger',default:false},field:{name:'⚽ Футбол — увімкнути пресет',description:'Публічні спортивні канали з football-фільтром; якість і дублікати чистить K2 сервер.'},onChange:function(){setStorage('k2pm_football_now',false);applyIptvPreset('football',false);}});
        addParam({component:COMPONENT,param:{name:'k2pm_kids_ua_now',type:'trigger',default:false},field:{name:'🧒 Українське дітям — пресет',description:'Українські дитячі/анімаційні/освітні канали з публічних джерел. Це не вмикає Kids Mode автоматично.'},onChange:function(){setStorage('k2pm_kids_ua_now',false);applyIptvPreset('kids_ua',false);}});

        // Built-in Lampa design presets. Safer than full card redesign plugins.
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_glass_preset',type:'trigger',default:false},
            field:{name:'✨ Y7 Glass',description:'Скло + фон + плавна анімація. Не перебудовує картку фільму.'},
            onChange:function(){setStorage('k2pm_glass_preset',false);applyGlassPreset(false);}
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_oled_preset',type:'trigger',default:false},
            field:{name:'◼ Y7 OLED Black',description:'Темний режим для LG/OLED: чорний фон + затемнене скло.'},
            onChange:function(){setStorage('k2pm_oled_preset',false);applyOledPreset();}
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_standard_look',type:'trigger',default:false},
            field:{name:'↩ Стандартний вигляд Lampa',description:'Вимикає Y7 Glass/Black; зовнішні дизайн-плагіни лишаються під своїми перемикачами.'},
            onChange:function(){setStorage('k2pm_standard_look',false);applyStandardLook();}
        });

        function addPluginToggle(p) {
            addParam({
                component:COMPONENT,
                param:{name:key(p),type:'trigger',default:!!p.on},
                field:{name:p.name,description:p.desc},
                onChange:function(v){toggle(p,bool(v));}
            });
        }

        // ONLINE: Lampac Online is a normal source, just like the others.
        addParam({
            component:COMPONENT,
            param:{name:LAMPAC_ON_KEY,type:'trigger',default:true},
            field:{name:'Lampac Online',description:'Онлайн-джерела з твого Y7 Core.'},
            onChange:function(){syncSecureLampac(true);needRestart(true);}
        });
        PLUGINS.forEach(function(p){ if(p.cat==='online') addPluginToggle(p); });

        // TORRENTS
        PLUGINS.forEach(function(p){ if(p.cat==='torrent') addPluginToggle(p); });

        // 18+: SISI is intentionally a normal item in the same list.
        addParam({
            component:COMPONENT,
            param:{name:SISI_ON_KEY,type:'trigger',default:false},
            field:{name:'SISI',description:'18+ джерела SISI з Y7 Core.'},
            onChange:function(){syncSecureLampac(true);needRestart(true);}
        });
        PLUGINS.forEach(function(p){ if(p.cat==='adult') addPluginToggle(p); });

        // COLLECTIONS / TV / DESIGN / UTILS
        PLUGINS.forEach(function(p){ if(p.cat==='collections') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='kids') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='tv') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='design') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='utils') addPluginToggle(p); });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_sync',type:'trigger',default:false},
            field:{name:'Застосувати / синхронізувати',description:'Привести реєстр Lampa до стану перемикачів.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_sync',false);}catch(e){}
                var r=reconcile(true);
                notify('Y7: синхронізовано, нових '+r.added);
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_defaults',type:'trigger',default:false},
            field:{name:'Рекомендований набір Y7',description:'Якість-first: Lampac Smart Source + Sync + IPTV UA + футбол/діти + торренти + Y7 Glass + перевірені утиліти.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_defaults',false);}catch(e){}
                PLUGINS.forEach(function(p){setEnabled(p,!!p.on);});
                setStartPage('favorite@history',true);
                applyIptvPreset('ua',true);
                applyGlassPreset(true);
                reconcile(true);needRestart(true);
                notify('Y7: рекомендований набір відновлено. Перезапусти Lampa.');
            }
        });
    }

    function style() {
        if(document.getElementById('k2pm-css'))return;
        var s=document.createElement('style');s.id='k2pm-css';
        s.innerHTML='.k2pm-head{padding:1em 1.1em;margin:.5em 0 1em;border-radius:.55em;background:rgba(255,255,255,.08);line-height:1.45}.k2pm-head b{font-size:1.15em}.k2pm-cat{padding:1.3em .55em .45em;opacity:.72;font-weight:700;font-size:1.02em}.k2pm-health{margin:.18em .8em .55em;opacity:.92;font-size:.82em;line-height:1.25}.k2pm-health-ok{color:#77d98c}.k2pm-health-warn{color:#f0c36b}.k2pm-health-dead{color:#ff7f7f}.k2pm-health-unknown{color:#9da3aa}.k2pm-health-summary{margin:.6em .8em 1em;padding:.65em .8em;border-radius:.45em;background:rgba(255,255,255,.055);font-size:.88em;line-height:1.35}.y7-head-remote__ico{width:1.5em;height:1.5em;display:grid;place-items:center;filter:drop-shadow(0 0 .22em rgba(101,175,255,.7))}.y7-head-remote__ico svg{width:100%;height:100%;display:block}.k2f-root{width:100%;height:100%;min-height:0;overflow:hidden;box-sizing:border-box}.k2f-root>.scroll{height:100%;max-height:100%;min-height:0;overflow:hidden}.k2f-root>.scroll>.scroll__content{height:100%;min-height:0;box-sizing:border-box}.k2f-body{padding:.7em 1.25em 2em;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.62em .72em;box-sizing:border-box}.k2f-head{grid-column:1/-1;display:flex;align-items:center;gap:.7em;padding:.25em 0 .5em;border-bottom:1px solid rgba(255,255,255,.07)}.k2f-logo{display:grid;place-items:center;width:2.55em;height:2.55em;border-radius:.72em;background:linear-gradient(145deg,rgba(74,112,255,.98),rgba(91,62,230,.98));font-weight:900;font-size:.96em}.k2f-headtext{min-width:0;flex:1}.k2f-summary{margin-left:auto;opacity:.72;font-size:.72em;white-space:nowrap}.k2f-title{font-size:1.48em;font-weight:850}.k2f-sub{opacity:.72;margin-top:.14em;font-size:.86em;line-height:1.25}.k2f-section{grid-column:1/-1;display:flex;align-items:center;gap:.55em;margin-top:.7em;padding:.48em .1em .34em;font-weight:850;font-size:1.02em;opacity:.96;border-bottom:1px solid rgba(255,255,255,.09)}.k2f-icon{width:1.15em;height:1.15em;fill:currentColor;flex:0 0 auto}.k2f-row{display:flex;align-items:center;gap:.8em;min-height:5.15em;padding:.78em .9em;border-radius:.9em;background:rgba(18,31,58,.90);border:1px solid rgba(255,255,255,.075);box-sizing:border-box;box-shadow:0 .45em 1.4em rgba(0,0,0,.12)}.k2f-row.focus{background:rgba(65,105,245,.92);border-color:rgba(255,255,255,.18)}.k2f-row-main{min-width:0;flex:1}.k2f-row-title{font-size:1.04em;font-weight:780;line-height:1.15}.k2f-row-desc{font-size:.78em;opacity:.68;margin-top:.24em;line-height:1.25;white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.k2f-value{font-size:.82em;opacity:.9;white-space:nowrap;font-weight:700}.k2f-on .k2f-value{font-weight:800}@media(max-width:1100px){.k2f-body{grid-template-columns:1fr;padding:.7em 1em 2em}}@media(max-width:720px){.k2f-body{grid-template-columns:1fr;padding:.65em}.k2f-section,.k2f-head{grid-column:1}.k2f-row{min-height:4.35em}.k2f-row-title{font-size:1.08em}.k2f-row-desc{font-size:.82em}}';
        (document.head||document.documentElement).appendChild(s);
    }

    function countEnabled() {
        var n=0;PLUGINS.forEach(function(p){if(enabled(p))n++;});
        return n;
    }

    function decorate(body) {
        if(!body||!body.length)return;
        currentSettingsBody = body;
        style();body.find('.k2pm-head,.k2pm-cat').remove();
        var paired=!!clientToken(),restart=false;
        try{restart=bool(Lampa.Storage.get(RESTART_KEY,false));}catch(e){}
        body.prepend('<div class="k2pm-head"><b>Y7 Media v'+VERSION+'</b><br>'+
            'Y7 Core: '+(paired?'✓ підключено':'○ не підключено')+
            ' · Плагінів: '+countEnabled()+
            (restart?'<br>⚠ Після вимкнення потрібен повний перезапуск Lampa.':'<br>✓ Менеджер активний.')+
            '</div>');

        var sec=body.find('[data-name="k2pm_pair_secure"]').first();
        if(sec.length)sec.before('<div class="k2pm-cat">Y7 CORE</div>');
        var ts=body.find('[data-name="k2pm_ts_url"]').first();
        if(ts.length)ts.before('<div class="k2pm-cat">LG / TORRSERVER</div>');

        var hs=body.find('[data-name="k2pm_check_plugins"]').first();
        if(hs.length)hs.before('<div class="k2pm-cat">СТАН ПЛАГІНІВ</div>');

        var sysh=body.find('[data-name="k2pm_system_health"]').first();
        if(sysh.length)sysh.before('<div class="k2pm-cat">Y7 SYSTEM / REMOTE ADMIN</div>');
        var kid=body.find('[data-name="'+KIDS_MODE_KEY+'"]').first();
        if(kid.length)kid.before('<div class="k2pm-cat">ДІТИ / СИНХРОНІЗАЦІЯ</div>');
        var qual=body.find('[data-name="'+QUALITY_MIN_KEY+'"]').first();
        if(qual.length)qual.before('<div class="k2pm-cat">ЯКІСТЬ / SMART SOURCE</div>');
        var bkp=body.find('[data-name="k2pm_backup_now"]').first();
        if(bkp.length)bkp.before('<div class="k2pm-cat">BACKUP / UPDATE / QUARANTINE</div>');

        var sp=body.find('[data-name="'+START_PAGE_KEY+'"]').first();
        if(sp.length)sp.before('<div class="k2pm-cat">ЗАПУСК / ПОВЕДІНКА</div>');

        var ip=body.find('[data-name="'+IPTV_PRESET_KEY+'"]').first();
        if(ip.length)ip.before('<div class="k2pm-cat">IPTV — ГОТОВІ ПЛЕЙЛИСТИ</div>');

        var look=body.find('[data-name="k2pm_glass_preset"]').first();
        if(look.length)look.before('<div class="k2pm-cat">Y7 ВИГЛЯД</div>');

        Object.keys(CAT_TITLES).forEach(function(cat){
            var row = null;

            if (cat === 'online') {
                row = body.find('[data-name="'+LAMPAC_ON_KEY+'"]').first();
            } else if (cat === 'adult') {
                row = body.find('[data-name="'+SISI_ON_KEY+'"]').first();
            }

            if (!row || !row.length) {
                var first=null;
                for(var i=0;i<PLUGINS.length;i++){if(PLUGINS[i].cat===cat){first=PLUGINS[i];break;}}
                if(first) row=body.find('[data-name="'+key(first)+'"]').first();
            }

            if(row && row.length)row.before('<div class="k2pm-cat">'+CAT_TITLES[cat]+'</div>');
        });

        renderHealth(body);
        if(bool(getStorage(KIDS_MODE_KEY,false))){
            body.find('[data-name="'+SISI_ON_KEY+'"]').hide();
            PLUGINS.forEach(function(p){if(p.cat==='adult')body.find('[data-name="'+key(p)+'"]').hide();});
        }
    }

    // Native settings are never intercepted. The full-screen Y7 manager is
    // opened only via an explicit user action in this native Y7 component.
    function listenSettings() { /* intentionally no hook */ }

    function start() {
        if(window.__K2_PLUGIN_MANAGER_STARTED__)return;
        window.__K2_PLUGIN_MANAGER_STARTED__=true;

        try{
            if(!Lampa.Storage.get('k2pm_ts_url',''))Lampa.Storage.set('k2pm_ts_url','http://127.0.0.1:8090');
            if(!Lampa.Storage.get('torrserver_url',''))Lampa.Storage.set('torrserver_url','http://127.0.0.1:8090');
        }catch(e){}

        applyV400Migration();
        installKidsBridge();
        registerFullManager();
        setupSettings();
        listenSettings();
        applyHealthSuppression(healthCache());
        var r=reconcile(true);
        if(!r.changed)needRestart(false);
        sendPolicy(true);
        heartbeat();
        maybeAutoHealth();
        if(HEARTBEAT_TIMER)clearInterval(HEARTBEAT_TIMER);
        HEARTBEAT_TIMER=setInterval(heartbeat,30000);
        if(COMMAND_TIMER)clearInterval(COMMAND_TIMER);
        COMMAND_TIMER=setInterval(pollAdminCommands,2500);
        setTimeout(function(){checkClientUpdate(false);},5000);

        cleanupAdultDuplicates();
        keepY7HeadRemote();

        window.K2PluginManager={
            version:VERSION,
            pair:startPairing,
            sync:function(){return reconcile(true);},
            checkLampac:checkSecureLampac,
            checkTorrServer:checkTorrServer,
            checkPlugins:function(){checkAllPlugins(true);},
            pluginHealth:healthCache,
            systemHealth:checkSystemHealth,
            providerHealth:checkProviderHealth,
            admin:startRemoteAdmin,
            backup:saveBackup,
            open:openK2FullManager,
            remote:startGuestRemote,
            fixHeader:installY7HeadRemote,
            cleanupAdult:cleanupAdultDuplicates,
            cleanupDuplicates:function(){return cleanupPluginDuplicates(false);}
        };
        window.Y7Media=window.K2PluginManager;
        log('ready',r);
    }

    function boot() {
        if(!window.Lampa||!Lampa.Storage||!Lampa.Plugins||!Lampa.SettingsApi){
            setTimeout(boot,150);return;
        }
        if(window.appready)start();
        else if(Lampa.Listener&&Lampa.Listener.follow){
            Lampa.Listener.follow('app',function(e){if(e&&e.type==='ready')start();});
            setTimeout(function(){if(window.appready)start();},1500);
        } else start();
    }

    boot();
})();

})('4.13.11');
