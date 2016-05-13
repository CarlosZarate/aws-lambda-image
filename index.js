/**
 * Automatic Image resize, reduce with AWS Lambda
 * Lambda main handler
 *
 * @author Yoshiaki Sugimoto
 * @created 2015/10/29
 */
var ImageProcessor = require("./libs/ImageProcessor");
var Config         = require("./libs/Config");

var https = require('https');
var fs   = require("fs");
var path = require("path");


var configFileName = 'config.json'
var configPath = path.resolve('/tmp', configFileName);
var version = null;
var s3Object = null;

// Lambda Handler
exports.handler = function(event, context) {
    s3Object = event.Records[0].s3;
    version = getVersion();
    fs.exists(configPath, function(exists) { 
      if (exists) {
        var configData = readConfig();
        if(version != configData.version) {
            loadConfig(processImage);
        } else {
            processImage(configData);
        }
      } else {
        console.log("El archivo de configuracion no existe");
        loadConfig(processImage);
      }
    }); 
};

var getVersion = function() {
    var date = new Date();

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return "v_"+year + "_" + month + "_" + day
}

var loadConfig = function(loadCallback) {
    https.get('https://s3-us-west-2.amazonaws.com/carloss3/config/config.json', function (res) {
        res.setEncoding("utf8")
        res.on('data', function(data){
            var configData = JSON.parse(data);
            configData.version = version;
            writeConfig(configData);
            loadCallback(configData);
        });
    });
}

var processImage =  function(configData) {

    var processor = new ImageProcessor(s3Object);
    var config = new Config(configData);
    console.log(s3Object);
    processor.run(config)
    .then(function(proceedImages) {
        console.log("OK, numbers of " + proceedImages.length + " images has proceeded.");
        context.succeed("OK, numbers of " + proceedImages.length + " images has proceeded.");
    })
    .catch(function(messages) {
        if(messages == "Object was already processed."){
            console.log("Image already processed");
            context.succeed("Image already processed");
        }
        else {
            context.fail("Woops, image process failed: " + messages);
        }
    });
}

var readConfig = function() {
    var configData = JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }))
    return configData;
}

var writeConfig = function(configData) {
    var data = JSON.stringify(configData, null, 2);
    fs.writeFile(configPath, data, function(err) {
        if (err) throw err;
        console.log('Se actualizo la version de la configuracion');
    });
}

