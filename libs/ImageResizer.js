var ImageData   = require("./ImageData");
var gm          = require('gm').subClass({imageMagick: true});
var Promise     = require("es6-promise").Promise;
var ImageMagick = require("imagemagick");

/**
 * Image Resizer
 * resize image with ImageMagick
 *
 * @constructor
 * @param Number width
 */
function ImageResizer(options) {
    this.options = options;
}

/**
 * Execute resize
 *
 * @public
 * @param ImageData image
 * @return Promise
 */
ImageResizer.prototype.exec = function ImageResizer_exec(image) {
    var that = this;
    var imagetype = image.getType();
    var params = {
        buffer      : image.getData(),
        format      : imagetype,
        quality     : this.options.quality,
    };
    var imageBuffer = image.getData();
    var strategy = this.options.strategy;

    var acl = this.options.acl;

    if ( "size" in this.options ) {
        params.width = this.options.size;
    } else {
        if ( "width" in this.options ) {
            params.width = this.options.width;
        }
        if ( "height" in this.options ) {
            params.height = this.options.height;
        }
    }

    return new Promise(function(resolve, reject) {
        var imageSize = null;
        that
        .getSize(params.buffer)
        .then(function(size) {
            imageSize = size;
            if (strategy == "scale") {
                return that.execScale(imageSize, params);
            } else {
                return params.buffer;
            }
        })
        .then(function(buffer){
            if(that.options.bg) {
                params.buffer = buffer;
                return that.resizeCanvas(params);
            } else {
                return {
                    buffer: buffer,
                    size: imageSize
                }
            }
        })
        .then(function(dataCrop){
            if(strategy == "crop") {
                params.buffer = dataCrop.buffer;
                return that.execCrop(dataCrop.size, params);
            }
            else {
                return dataCrop.buffer;
            }
        })
        .then(function(buffer) {
            resolve(new ImageData(
                image.fileName,
                image.bucketName,
                buffer,
                image.getHeaders(),
                acl
            ));
        })
        .catch(function(messages) {
            console.log(messages)
            reject(messages);
        });
    });
};

ImageResizer.prototype.execScale = function(size, params) {
    return new Promise(function(resolve, reject) {
        if (this.options.stretch || (size.width > params.width || size.height > params.height)) {
            gm(params.buffer)
            .resize(params.width, params.height)
            .toBuffer(params.format,function (err, buffer) {
                if ( err ) {
                    reject("ImageMagick err");
                } else {
                    resolve(buffer);
                }
            });
        } else {
            resolve(params.buffer);
        }
    }.bind(this));
}

ImageResizer.prototype.execCrop = function(size, params) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var newSize = that.getMaxScale(size.width, size.height,params.width, params.height);
        var offset = that.getOffset(newSize.x, newSize.y,params.width, params.height, 'south');
        gm(params.buffer)
        .resize(newSize.x, newSize.y)
        .crop(params.width, params.height, offset.x, offset.y)
        .toBuffer(params.format, function (err, buffer) {
            if ( err) {
                reject("ImageMagick err");
            } else {
                resolve(buffer);
            }
        });
    });
}

ImageResizer.prototype.getSize = function(buffer) {
    return new Promise(function(resolve, reject) {
        gm(buffer)
        .size(function (err, size) {
            if(!err) {
                resolve(size);
            } else {
                console.log(err);
                reject('Error al leer la imagen');
            }
        });
    });
}

ImageResizer.prototype.getOffset = function(width, height, cropWidth, cropHeight, gravity) 
{
    var midWidth        = width/2,
        midHeight       = height/2,
        midCropWidth    = cropWidth/2,
        midCropHeight   = cropHeight/2;
    var offset = {
        x : 0,
        y : 0
    };
    switch (gravity) {
        case 'north':   
            offset.x = midWidth - midCropWidth;
            offset.y = 0;
            break;
        case 'south':   
            offset.x = midWidth - midCropWidth;
            offset.y = height - cropHeight;
            break;
        case 'east':    
            offset.x = width - cropWidth;
            offset.y = midHeight - midCropHeight;
            break;
        case 'west':    
            offset.x = 0;
            offset.y = midHeight - midCropHeight;
            break;
        case 'north-east':
            offset.x = width - cropWidth;
            offset.y = 0;
            break;
        case 'north-west':  
            offset.x = 0;
            offset.y = 0;
            break;
        case 'south-east':  
            offset.x = width - cropWidth;
            offset.y = height - cropHeight;
            break;
        case 'south-west':  
            offset.x = 0;
            offset.y = height - cropHeight;
            break;
        default:
            offset.x = midWidth - midCropWidth;
            offset.y = midHeight - midCropHeight;
            break
    }
    offset.x = parseInt(offset.x);
    offset.y = parseInt(offset.y);
    return offset;
}

ImageResizer.prototype.getMaxScale = function(width, height, scaleWidth, scaleHeight) 
{
    var wFactor = width/scaleWidth;
    var hFactor = height/scaleHeight;
    var newSize = {
         x : scaleWidth,
         y : scaleHeight
    };
    if(wFactor > hFactor) {
        newSize.x = scaleWidth*wFactor/hFactor;
    } else {
        newSize.y = scaleHeight*hFactor/wFactor;
    }
    return newSize;
}

ImageResizer.prototype.resizeCanvas = function(params)
{
    var that = this;
    return new Promise(function(resolve, reject) {
        that
        .getSize(params.buffer)
        .then(function(size) {
            var canvasSize = size;
            if(size.width < params.width) {
                canvasSize.width = params.width;
            }
            if(size.height < params.height) {
                canvasSize.height = params.height;
            }
            gm(params.buffer)
            .background('#0ff')
            .gravity('Center')
            .extent(canvasSize.width, canvasSize.height)
            .toBuffer(params.format, function (err, newbuffer) {
                if(!err) {
                    resolve({
                        buffer: newbuffer,
                        size: canvasSize
                    });
                } else {
                    console.log(err);
                    reject('Error al leer la imagen');
                }
            });
        })
        .catch(function(messages) {
            console.log(messages)
            reject(messages);
        });
    });
}

module.exports = ImageResizer;
